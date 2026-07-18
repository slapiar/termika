(() => {
  'use strict';
  if (window.__termikaGlobalMapToolsLoaded) return;
  window.__termikaGlobalMapToolsLoaded = true;

  const STORAGE_KEY = 'termikaXC.quickDock.visible.v3';
  const pad = (n) => String(Math.trunc(Number(n) || 0)).padStart(2, '0');
  let dock = null;
  let skyBadge = null;
  let igcBadge = null;
  let navButton = null;
  let displayButton = null;
  let lastFlightKey = '';

  function css() {
    if (document.getElementById('termikaGlobalMapToolsStyle')) return;
    const style = document.createElement('style');
    style.id = 'termikaGlobalMapToolsStyle';
    style.textContent = `
      .termika-global-dock{position:fixed;right:12px;top:82px;z-index:80;display:flex;flex-direction:column;gap:6px;padding:7px;border:1px solid rgba(112,232,255,.45);border-radius:8px;background:rgba(7,16,24,.82);box-shadow:0 5px 18px rgba(0,0,0,.34);backdrop-filter:blur(5px)}
      .termika-global-dock[hidden]{display:none}.termika-global-dock button{min-width:34px;height:32px;border:1px solid #54778a;border-radius:5px;background:#102937;color:#dff8ff;cursor:pointer}.termika-global-dock button.is-active{border-color:#70e8ff;background:#1c5368;color:#fff}
      .termika-global-time{position:fixed;left:12px;top:82px;z-index:79;padding:5px 9px;border:1px solid rgba(112,232,255,.58);border-radius:6px;background:rgba(7,16,24,.76);color:#70e8ff;font:700 12px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:nowrap;pointer-events:none}
      .termika-global-igc{position:fixed;left:12px;top:116px;z-index:79;padding:5px 9px;border:1px solid rgba(112,232,255,.42);border-radius:6px;background:rgba(7,16,24,.72);color:#70e8ff;font:700 11px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:nowrap;pointer-events:none}.termika-global-igc[hidden]{display:none}
      @media(max-width:760px){.termika-global-dock{right:8px;top:72px}.termika-global-time,.termika-global-igc{left:8px;max-width:calc(100vw - 72px);overflow:hidden;text-overflow:ellipsis}}
    `;
    document.head.appendChild(style);
  }

  function readVisible() {
    try { const v = localStorage.getItem(STORAGE_KEY); return v === null ? true : v !== 'false'; } catch (_) { return true; }
  }
  function saveVisible(v) { try { localStorage.setItem(STORAGE_KEY, v ? 'true' : 'false'); } catch (_) {} }

  function setVisible(visible) {
    ensureDock();
    dock.hidden = !visible;
    [navButton, displayButton].filter(Boolean).forEach((b) => {
      b.classList.toggle('is-active', visible);
      b.setAttribute('aria-pressed', visible ? 'true' : 'false');
      b.title = visible ? 'Nástroje sú zapnuté · kliknutím skryť' : 'Nástroje sú vypnuté · kliknutím zobraziť';
    });
    saveVisible(visible);
  }
  function toggleVisible() { setVisible(dock ? dock.hidden : !readVisible()); }

  function ensureDock() {
    if (dock?.isConnected) return dock;
    dock = document.getElementById('quickToolDock');
    if (!dock) {
      dock = document.createElement('nav');
      dock.id = 'quickToolDock';
      dock.className = 'termika-global-dock';
      dock.setAttribute('aria-label', 'Rýchle mapové nástroje');
      dock.innerHTML = `
        <button type="button" data-global-action="igc" title="Načítať IGC">⇧</button>
        <button type="button" data-global-action="hud" title="Kamerový HUD">HUD</button>
        <button type="button" data-global-action="sky" class="is-active" title="Slnko a obloha">☀</button>
        <button type="button" data-global-action="clouds" class="is-active" title="3D oblačnosť">☁</button>
        <button type="button" data-global-action="instruments" class="is-active" title="Ružica a mierka">N</button>`;
      document.body.appendChild(dock);
    } else {
      dock.classList.add('termika-global-dock');
    }
    dock.hidden = !readVisible();
    if (!dock.dataset.globalBound) {
      dock.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const action = button.dataset.globalAction;
        if (action === 'igc') (document.getElementById('igcFileInput') || document.getElementById('quickLoadIgcButton'))?.click();
        if (action === 'hud') document.getElementById('workspaceHudToggle')?.click();
        if (action === 'sky') window.TermikaSkyTools?.setSkyEnabled?.(!button.classList.contains('is-active'));
        if (action === 'clouds') window.TermikaSkyTools?.setCloudsEnabled?.(!button.classList.contains('is-active'));
        if (action === 'instruments') window.TermikaSkyTools?.setInstrumentsEnabled?.(!button.classList.contains('is-active'));
        if (['sky','clouds','instruments'].includes(action)) button.classList.toggle('is-active');
      });
      dock.dataset.globalBound = 'true';
    }
    return dock;
  }

  function ensureBadges() {
    if (!skyBadge) {
      skyBadge = document.getElementById('termikaSkyTimeBadge') || document.createElement('div');
      skyBadge.id = 'termikaSkyTimeBadge';
      skyBadge.classList.add('termika-global-time');
      if (!skyBadge.isConnected) document.body.appendChild(skyBadge);
    }
    if (!igcBadge) {
      igcBadge = document.getElementById('termikaIgcFlightSummary') || document.createElement('div');
      igcBadge.id = 'termikaIgcFlightSummary';
      igcBadge.classList.add('termika-global-igc');
      if (!igcBadge.isConnected) document.body.appendChild(igcBadge);
      igcBadge.hidden = true;
    }
  }

  function formatUtc(date) {
    return `${pad(date.getUTCDate())}. ${pad(date.getUTCMonth()+1)}. ${date.getUTCFullYear()}: ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  }
  function formatSeconds(seconds) {
    const s = ((Math.trunc(Number(seconds)||0)%86400)+86400)%86400;
    return `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`;
  }
  function formatFlightDate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
    return m ? `${m[3]}.${m[2]}. ${m[1]}` : null;
  }

  function updateCurrentTime() {
    ensureBadges();
    let date = new Date();
    const cesiumTime = window.TermikaSkyTools?.getState?.().time;
    if (cesiumTime) { const parsed = new Date(cesiumTime); if (Number.isFinite(parsed.getTime())) date = parsed; }
    skyBadge.textContent = formatUtc(date);
  }

  function updateFlightSummary() {
    const network = window.PilotNetwork;
    const points = network?.letoveBody;
    const metadata = network?.metadata;
    if (!Array.isArray(points) || !points.length) return;
    const date = formatFlightDate(metadata?.flightDate);
    const first = points.find((p) => Number.isFinite(Number(p?.time_s)));
    const last = [...points].reverse().find((p) => Number.isFinite(Number(p?.time_s)));
    if (!date || !first || !last) return;
    const key = `${date}|${first.time_s}|${last.time_s}|${points.length}`;
    if (key === lastFlightKey && !igcBadge?.hidden) return;
    ensureBadges();
    igcBadge.textContent = `IGC ${date}, Štart - ${formatSeconds(first.time_s)} - Pristátie: ${formatSeconds(last.time_s)}`;
    igcBadge.hidden = false;
    lastFlightKey = key;
    window.dispatchEvent(new CustomEvent('termika:igc-loaded', { detail: { metadata, points } }));
  }

  function addNavToggle() {
    if (navButton?.isConnected) return;
    const navMeta = document.querySelector('#explorerNavShell .explorer-nav-meta, #navShell .nav-meta, .nav-meta');
    if (!navMeta) return;
    navButton = document.getElementById('workspaceQuickDockToggle') || document.createElement('button');
    navButton.id = 'workspaceQuickDockToggle';
    navButton.type = 'button';
    navButton.textContent = 'NÁSTROJE';
    navButton.className = navButton.className || 'nav-theme-toggle';
    navButton.addEventListener('click', toggleVisible);
    const hud = document.getElementById('workspaceHudToggle');
    const flight = document.getElementById('workspaceFlightToggle');
    const anchor = flight || hud;
    if (anchor?.parentElement === navMeta) anchor.insertAdjacentElement('afterend', navButton); else navMeta.appendChild(navButton);
  }

  function addDisplayToggle() {
    if (displayButton?.isConnected) return;
    const display = document.querySelector('[data-nav-section="display"] .action-row, #displayPanel .action-row');
    if (!display) return;
    displayButton = document.createElement('button');
    displayButton.type = 'button';
    displayButton.id = 'displayQuickDockToggle';
    displayButton.textContent = 'Zobraziť/skryť nástrojový panel';
    displayButton.addEventListener('click', toggleVisible);
    display.appendChild(displayButton);
  }

  function tick() {
    css(); ensureDock(); ensureBadges(); addNavToggle(); addDisplayToggle();
    updateCurrentTime(); updateFlightSummary();
    const visible = !dock.hidden;
    [navButton, displayButton].filter(Boolean).forEach((b) => b.classList.toggle('is-active', visible));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick, { once:true }); else tick();
  window.setInterval(tick, 500);
})();

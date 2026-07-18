(() => {
  'use strict';
  if (window.__termikaGlobalMapToolsLoaded) return;
  window.__termikaGlobalMapToolsLoaded = true;

  const STORAGE_KEY = 'termikaXC.quickDock.visible.v3';
  const pad = (n) => String(Math.trunc(Number(n) || 0)).padStart(2, '0');
  let dock = null;
  let nowBadge = null;
  let igcBadge = null;
  let navButton = null;
  let displayButton = null;
  let lastFlightKey = '';

  function css() {
    if (document.getElementById('termikaGlobalMapToolsStyle')) return;
    const style = document.createElement('style');
    style.id = 'termikaGlobalMapToolsStyle';
    style.textContent = `
      #termikaSkyTimeBadge,#termikaIgcFlightSummary{display:none!important}
      .termika-global-dock{position:fixed!important;right:12px!important;top:82px!important;left:auto!important;bottom:auto!important;z-index:80!important;display:grid!important;grid-template-columns:repeat(4,34px)!important;grid-auto-rows:32px!important;gap:6px!important;width:auto!important;max-width:none!important;height:auto!important;padding:7px!important;border:1px solid rgba(112,232,255,.45)!important;border-radius:8px!important;background:rgba(7,16,24,.82)!important;box-shadow:0 5px 18px rgba(0,0,0,.34)!important;backdrop-filter:blur(5px);transform:none!important;cursor:default!important;user-select:none}
      .termika-global-dock[hidden]{display:none!important}
      .termika-global-dock button{box-sizing:border-box!important;width:34px!important;min-width:34px!important;max-width:34px!important;height:32px!important;min-height:32px!important;margin:0!important;padding:0!important;border:1px solid #54778a!important;border-radius:5px!important;background:#102937!important;color:#dff8ff!important;cursor:pointer!important;line-height:30px!important;text-align:center!important}
      .termika-global-dock button.is-active{border-color:#70e8ff!important;background:#1c5368!important;color:#fff!important}
      .termika-global-now,.termika-global-igc{position:fixed;left:12px;z-index:79;padding:5px 9px;border-radius:6px;background:rgba(7,16,24,.76);color:#70e8ff;font:700 12px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:nowrap;pointer-events:none}
      .termika-global-now{top:82px;border:1px solid rgba(112,232,255,.58)}
      .termika-global-igc{top:116px;min-width:1px;min-height:14px;border:1px solid rgba(112,232,255,.42);font-size:11px;background:rgba(7,16,24,.72)}
      @media(max-width:760px){.termika-global-dock{right:8px!important;top:72px!important}.termika-global-now,.termika-global-igc{left:8px;max-width:calc(100vw - 170px);overflow:hidden;text-overflow:ellipsis}}
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
      dock.setAttribute('aria-label', 'Rýchle mapové nástroje');
      dock.innerHTML = `
        <button type="button" data-global-action="igc" title="Načítať IGC">⇧</button>
        <button type="button" data-global-action="hud" title="Kamerový HUD">H</button>
        <button type="button" data-global-action="sky" class="is-active" title="Slnko a obloha">☀</button>
        <button type="button" data-global-action="clouds" class="is-active" title="3D oblačnosť">☁</button>
        <button type="button" data-global-action="instruments" class="is-active" title="Ružica a mierka">N</button>`;
      document.body.appendChild(dock);
    }
    dock.classList.add('termika-global-dock');
    dock.removeAttribute('draggable');
    dock.style.removeProperty('transform');
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
    if (!nowBadge?.isConnected) {
      nowBadge = document.getElementById('termikaNowTimeBadge') || document.createElement('div');
      nowBadge.id = 'termikaNowTimeBadge';
      nowBadge.className = 'termika-global-now';
      nowBadge.setAttribute('aria-label', 'Aktuálny dátum a čas zariadenia');
      if (!nowBadge.isConnected) document.body.appendChild(nowBadge);
    }
    if (!igcBadge?.isConnected) {
      igcBadge = document.getElementById('termikaGlobalIgcTimeBadge') || document.createElement('div');
      igcBadge.id = 'termikaGlobalIgcTimeBadge';
      igcBadge.className = 'termika-global-igc';
      igcBadge.setAttribute('aria-label', 'Dátum letu, čas štartu a pristátia z IGC');
      if (!igcBadge.isConnected) document.body.appendChild(igcBadge);
    }
  }

  function formatLocal(date) {
    return `${pad(date.getDate())}. ${pad(date.getMonth()+1)}. ${date.getFullYear()}: ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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
    nowBadge.textContent = `NOW - ${formatLocal(new Date())}`;
  }

  function clearFlightSummary() {
    ensureBadges();
    if (igcBadge.textContent !== '') igcBadge.textContent = '';
    lastFlightKey = '';
  }

  function updateFlightSummary() {
    const network = window.PilotNetwork;
    const points = network?.letoveBody;
    const metadata = network?.metadata;
    if (!Array.isArray(points) || !points.length) {
      clearFlightSummary();
      return;
    }
    const date = formatFlightDate(metadata?.flightDate);
    const first = points.find((p) => Number.isFinite(Number(p?.time_s)));
    const last = [...points].reverse().find((p) => Number.isFinite(Number(p?.time_s)));
    if (!date || !first || !last) {
      clearFlightSummary();
      return;
    }
    const key = `${date}|${first.time_s}|${last.time_s}|${points.length}`;
    if (key === lastFlightKey && igcBadge?.textContent) return;
    ensureBadges();
    igcBadge.textContent = `IGC ${date}, Štart - ${formatSeconds(first.time_s)} - Pristátie: ${formatSeconds(last.time_s)}`;
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
    if (!navButton.dataset.globalBound) {
      navButton.addEventListener('click', toggleVisible);
      navButton.dataset.globalBound = 'true';
    }
    const hud = document.getElementById('workspaceHudToggle');
    const flight = document.getElementById('workspaceFlightToggle');
    const anchor = flight || hud;
    if (!navButton.isConnected) {
      if (anchor?.parentElement === navMeta) anchor.insertAdjacentElement('afterend', navButton); else navMeta.appendChild(navButton);
    }
  }

  function addDisplayToggle() {
    if (displayButton?.isConnected) return;
    const display = document.querySelector('[data-nav-section="display"] .action-row, #displayPanel .action-row');
    if (!display) return;
    displayButton = document.getElementById('displayQuickDockToggle') || document.createElement('button');
    displayButton.type = 'button';
    displayButton.id = 'displayQuickDockToggle';
    displayButton.textContent = 'Zobraziť/skryť nástrojový panel';
    if (!displayButton.dataset.globalBound) {
      displayButton.addEventListener('click', toggleVisible);
      displayButton.dataset.globalBound = 'true';
    }
    if (!displayButton.isConnected) display.appendChild(displayButton);
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
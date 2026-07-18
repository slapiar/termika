(() => {
  'use strict';
  if (window.__termikaGlobalMapToolsLoaded) return;
  window.__termikaGlobalMapToolsLoaded = true;

  const STORAGE_KEY = 'termikaXC.quickDock.visible.v3';
  let dock = null;
  let navButton = null;
  let displayButton = null;

  function currentScriptUrl() {
    const script = Array.from(document.scripts).reverse().find((item) => (item.src || '').includes('global-map-tools.js'));
    return script?.src || document.baseURI;
  }

  function loadTimeBadgesModule() {
    if (window.TermikaTimeBadges || document.querySelector('script[data-termika-time-badges]')) return;
    const current = new URL(currentScriptUrl(), document.baseURI);
    const inCcApp = current.pathname.includes('/CC/app/js/');
    const cssUrl = new URL(inCcApp ? '../../ux/workbench-shell/time-badges/time-badges.css?v=20260718-01' : '../../CC/ux/workbench-shell/time-badges/time-badges.css?v=20260718-01', current);
    const jsUrl = new URL(inCcApp ? '../../ux/workbench-shell/time-badges/source/time-badges.js?v=20260718-01' : '../../CC/ux/workbench-shell/time-badges/source/time-badges.js?v=20260718-01', current);

    if (!document.querySelector('link[data-termika-time-badges]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssUrl.href;
      link.dataset.termikaTimeBadges = 'true';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = jsUrl.href;
    script.async = false;
    script.dataset.termikaTimeBadges = 'true';
    document.head.appendChild(script);
  }

  function css() {
    if (document.getElementById('termikaGlobalMapToolsStyle')) return;
    const style = document.createElement('style');
    style.id = 'termikaGlobalMapToolsStyle';
    style.textContent = `
      .termika-global-dock{position:fixed!important;right:12px!important;top:82px!important;left:auto!important;bottom:auto!important;z-index:80!important;display:grid!important;grid-template-columns:repeat(4,34px)!important;grid-auto-rows:32px!important;gap:6px!important;width:auto!important;height:auto!important;padding:7px!important;border:1px solid rgba(112,232,255,.45)!important;border-radius:8px!important;background:rgba(7,16,24,.82)!important;box-shadow:0 5px 18px rgba(0,0,0,.34)!important;transform:none!important;cursor:default!important;user-select:none}
      .termika-global-dock[hidden]{display:none!important}
      .termika-global-dock button{box-sizing:border-box!important;width:34px!important;min-width:34px!important;max-width:34px!important;height:32px!important;min-height:32px!important;margin:0!important;padding:0!important;border:1px solid #54778a!important;border-radius:5px!important;background:#102937!important;color:#dff8ff!important;cursor:pointer!important;line-height:30px!important;text-align:center!important}
      .termika-global-dock button.is-active{border-color:#70e8ff!important;background:#1c5368!important;color:#fff!important}
      @media(max-width:760px){.termika-global-dock{right:8px!important;top:72px!important}}
    `;
    document.head.appendChild(style);
  }

  function readVisible() { try { const v = localStorage.getItem(STORAGE_KEY); return v === null ? true : v !== 'false'; } catch (_) { return true; } }
  function saveVisible(v) { try { localStorage.setItem(STORAGE_KEY, v ? 'true' : 'false'); } catch (_) {} }

  function setVisible(visible) {
    ensureDock();
    dock.hidden = !visible;
    [navButton, displayButton].filter(Boolean).forEach((button) => {
      button.classList.toggle('is-active', visible);
      button.setAttribute('aria-pressed', visible ? 'true' : 'false');
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
      dock.innerHTML = '<button type="button" data-global-action="igc">⇧</button><button type="button" data-global-action="hud">H</button><button type="button" data-global-action="sky" class="is-active">☀</button><button type="button" data-global-action="clouds" class="is-active">☁</button><button type="button" data-global-action="instruments" class="is-active">N</button>';
      document.body.appendChild(dock);
    }
    dock.classList.add('termika-global-dock');
    dock.removeAttribute('draggable');
    dock.style.removeProperty('transform');
    dock.hidden = !readVisible();
    return dock;
  }

  function addNavToggle() {
    const navMeta = document.querySelector('#explorerNavShell .explorer-nav-meta, #navShell .nav-meta, .nav-meta');
    if (!navMeta || navButton?.isConnected) return;
    navButton = document.getElementById('workspaceQuickDockToggle') || document.createElement('button');
    navButton.id = 'workspaceQuickDockToggle';
    navButton.type = 'button';
    navButton.textContent = 'NÁSTROJE';
    navButton.className = navButton.className || 'nav-theme-toggle';
    if (!navButton.dataset.globalBound) { navButton.addEventListener('click', toggleVisible); navButton.dataset.globalBound = 'true'; }
    const anchor = document.getElementById('workspaceFlightToggle') || document.getElementById('workspaceHudToggle');
    if (!navButton.isConnected) anchor?.parentElement === navMeta ? anchor.insertAdjacentElement('afterend', navButton) : navMeta.appendChild(navButton);
  }

  function addDisplayToggle() {
    const display = document.querySelector('[data-nav-section="display"] .action-row, #displayPanel .action-row');
    if (!display || displayButton?.isConnected) return;
    displayButton = document.getElementById('displayQuickDockToggle') || document.createElement('button');
    displayButton.id = 'displayQuickDockToggle';
    displayButton.type = 'button';
    displayButton.textContent = 'Zobraziť/skryť nástrojový panel';
    if (!displayButton.dataset.globalBound) { displayButton.addEventListener('click', toggleVisible); displayButton.dataset.globalBound = 'true'; }
    if (!displayButton.isConnected) display.appendChild(displayButton);
  }

  function tick() {
    css(); loadTimeBadgesModule(); ensureDock(); addNavToggle(); addDisplayToggle();
    const visible = !dock.hidden;
    [navButton, displayButton].filter(Boolean).forEach((button) => button.classList.toggle('is-active', visible));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick, { once: true }); else tick();
  window.setInterval(tick, 500);
})();
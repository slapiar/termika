/* CC host proxy. Implementácia patrí modulu workspace-navigation. */
(() => {
  const moduleUrl = new URL("../../ux/workbench-shell/workspace-navigation/source/XC__js__explorer-nav.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');

  function injectHudRouteButton() {
    const navPrimary = document.querySelector('.explorer-nav-primary');
    if (!navPrimary) return false;
    if (navPrimary.querySelector('[data-workspace-action="toggle-hud"]')) return true;

    const routeTerrain = navPrimary.querySelector('[data-explorer-route="terrain"]');
    const hudButton = document.createElement('button');
    hudButton.type = 'button';
    hudButton.className = 'explorer-nav-route';
    hudButton.setAttribute('data-workspace-action', 'toggle-hud');
    hudButton.textContent = 'HUD';

    if (routeTerrain && routeTerrain.parentNode === navPrimary) {
      navPrimary.insertBefore(hudButton, routeTerrain);
    } else {
      navPrimary.appendChild(hudButton);
    }
    return true;
  }

  if (!injectHudRouteButton()) {
    const observer = new MutationObserver(() => {
      if (injectHudRouteButton()) {
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

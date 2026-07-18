/* CC host proxy. Implementácia patrí modulu camera-hud-toggle. */
(() => {
  const currentScript = document.currentScript;
  const globalUrl = new URL("global-map-tools.js?v=20260718-04", currentScript.src).href;
  const globalScript = document.createElement('script');
  globalScript.src = globalUrl;
  globalScript.async = false;

  const moduleUrl = new URL("../../ux/camera-hud/camera-hud-toggle/source/XC__js__workspace-hud-toggle.js", currentScript.src).href;
  const moduleScript = document.createElement('script');
  moduleScript.src = moduleUrl;
  moduleScript.async = false;

  const parent = currentScript?.parentNode || document.head;
  parent.insertBefore(globalScript, currentScript?.nextSibling || null);
  parent.insertBefore(moduleScript, globalScript.nextSibling);
})();

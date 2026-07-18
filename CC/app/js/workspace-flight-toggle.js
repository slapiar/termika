/* CC host proxy. Implementácia patrí modulu flight-simulator-toggle. */
(() => {
  const currentScript = document.currentScript;
  const globalUrl = new URL("global-map-tools.js?v=20260718-04", currentScript.src).href;
  if (!document.querySelector('script[data-termika-global-map-tools]')) {
    const globalScript = document.createElement('script');
    globalScript.src = globalUrl;
    globalScript.async = false;
    globalScript.dataset.termikaGlobalMapTools = 'true';
    (currentScript?.parentNode || document.head).insertBefore(globalScript, currentScript?.nextSibling || null);
  }

  const moduleUrl = new URL("../../ux/flight-simulator/flight-simulator-toggle/source/XC__js__workspace-flight-toggle.js", currentScript.src).href;
  const moduleScript = document.createElement('script');
  moduleScript.src = moduleUrl;
  moduleScript.async = false;
  (currentScript?.parentNode || document.head).insertBefore(moduleScript, currentScript?.nextSibling || null);
})();

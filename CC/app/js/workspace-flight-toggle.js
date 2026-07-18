/* CC host proxy. Implementácia patrí modulu flight-simulator-toggle. */
(() => {
  const currentScript = document.currentScript;
  const moduleUrl = new URL("../../ux/flight-simulator/flight-simulator-toggle/source/XC__js__workspace-flight-toggle.js", currentScript.src).href;
  const moduleScript = document.createElement('script');
  moduleScript.src = moduleUrl;
  moduleScript.async = false;
  if (currentScript && currentScript.parentNode) {
    currentScript.parentNode.insertBefore(moduleScript, currentScript.nextSibling);
  } else {
    document.head.appendChild(moduleScript);
  }
})();

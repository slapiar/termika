/* CC host proxy. Implementácia patrí modulu camera-hud-toggle. */
(() => {
  const currentScript = document.currentScript;
  const moduleUrl = new URL("../../ux/camera-hud/camera-hud-toggle/source/XC__js__workspace-hud-toggle.js", currentScript.src).href;

  const moduleScript = document.createElement('script');
  moduleScript.src = moduleUrl;
  moduleScript.async = false;
  if (currentScript && currentScript.parentNode) {
    currentScript.parentNode.insertBefore(moduleScript, currentScript.nextSibling);
  } else {
    document.head.appendChild(moduleScript);
  }
})();

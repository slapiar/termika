/* CC host proxy. Implementácia patrí modulu camera-hud-toggle. */
(() => {
  const currentScript = document.currentScript;
  const moduleUrl = new URL("../../ux/camera-hud/camera-hud-toggle/source/XC__js__workspace-hud-toggle.js", currentScript.src).href;

  // Niektoré stránky (napr. terrain-analysis-test.php cez wind-effect-surface.js)
  // tento proxy vkladajú aj druhýkrát dynamicky. document.write() mimo
  // synchrónneho parsovania stránky vyhadzuje InvalidStateError, preto v takom
  // prípade vložíme skript cez createElement namiesto document.write.
  if (document.readyState === 'loading' && currentScript && currentScript.parentNode) {
    document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
    return;
  }

  const moduleScript = document.createElement('script');
  moduleScript.src = moduleUrl;
  moduleScript.async = false;
  if (currentScript && currentScript.parentNode) {
    currentScript.parentNode.insertBefore(moduleScript, currentScript.nextSibling);
  } else {
    document.head.appendChild(moduleScript);
  }
})();

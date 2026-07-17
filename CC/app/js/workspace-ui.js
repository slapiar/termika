/* CC host proxy. Implementácia patrí modulu window-manager. */
(() => {
  const moduleUrl = new URL("../../infrastructure/window-core/window-manager/source/XC__js__workspace-ui.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

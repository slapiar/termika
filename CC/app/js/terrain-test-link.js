/* CC host proxy. Implementácia patrí modulu test-page-link. */
(() => {
  const moduleUrl = new URL("../../ux/workbench-shell/test-page-link/source/XC__js__terrain-test-link.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

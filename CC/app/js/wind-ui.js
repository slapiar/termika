/* CC host proxy. Implementácia patrí modulu wind-control-panel. */
(() => {
  const moduleUrl = new URL("../../ux/wind-workbench/wind-control-panel/source/XC__js__wind-ui.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

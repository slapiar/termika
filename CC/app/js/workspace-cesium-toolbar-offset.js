/* CC host proxy. Implementácia patrí modulu cesium-toolbar-offset. */
(() => {
  const moduleUrl = new URL("../../ux/workbench-shell/cesium-toolbar-offset/source/XC__js__workspace-cesium-toolbar-offset.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

/* CC host proxy. Implementácia patrí modulu workspace-crosshair. */
(() => {
  const moduleUrl = new URL("../../ux/map-pointer-tools/workspace-crosshair/source/XC__js__workspace-crosshair.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

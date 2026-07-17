/* CC host proxy. Implementácia patrí modulu terrain-contours-layer. */
(() => {
  const moduleUrl = new URL("../../ux/terrain-visualization-layers/terrain-contours-layer/source/XC__js__terrain-contours.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

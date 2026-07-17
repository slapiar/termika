/* CC host proxy. Implementácia patrí modulu terrain-design-layer. */
(() => {
  const moduleUrl = new URL("../../ux/terrain-visualization-layers/terrain-design-layer/source/XC__js__terrain-design.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

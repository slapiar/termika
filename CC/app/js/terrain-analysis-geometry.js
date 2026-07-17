/* CC host proxy. Implementácia patrí modulu terrain-analysis-geometry. */
(() => {
  const moduleUrl = new URL("../../kernels/analytic-and-physics/terrain-analysis-geometry/source/XC__js__terrain-analysis-geometry.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

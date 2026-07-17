/* CC host proxy. Implementácia patrí modulu terrain-analysis. */
(() => {
  const moduleUrl = new URL("../../kernels/analytic-and-physics/terrain-analysis/source/XC__js__terrain-analysis.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

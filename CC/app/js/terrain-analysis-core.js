/* CC host proxy. Implementácia patrí modulu terrain-analysis-core. */
(() => {
  const moduleUrl = new URL("../../kernels/analytic-and-physics/terrain-analysis-core/source/XC__js__terrain-analysis-core.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

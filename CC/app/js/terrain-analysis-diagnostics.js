/* CC host proxy. Implementácia patrí modulu terrain-analysis-diagnostics. */
(() => {
  const moduleUrl = new URL("../../kernels/analytic-and-physics/terrain-analysis-diagnostics/source/XC__js__terrain-analysis-diagnostics.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

/* CC host proxy. Implementácia patrí modulu glider-core. */
(() => {
  const moduleUrl = new URL("../../kernels/analytic-and-physics/glider-core/source/XC__js__glider-core.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

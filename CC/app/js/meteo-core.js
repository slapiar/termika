/* CC host proxy. Implementácia patrí modulu meteo-core. */
(() => {
  const moduleUrl = new URL("../../kernels/analytic-and-physics/meteo-core/source/XC__js__meteo-core.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

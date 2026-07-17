/* CC host proxy. Implementácia patrí modulu wind-effects-core. */
(() => {
  const moduleUrl = new URL("../../kernels/analytic-and-physics/wind-effects-core/source/XC__js__wind-effects-core.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

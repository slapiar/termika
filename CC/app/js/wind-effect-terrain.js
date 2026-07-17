/* CC host proxy. Implementácia patrí modulu wind-effect-terrain. */
(() => {
  const moduleUrl = new URL("../../kernels/analytic-and-physics/wind-effect-terrain/source/XC__js__wind-effect-terrain.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

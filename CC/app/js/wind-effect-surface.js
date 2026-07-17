/* CC host proxy. Implementácia patrí modulu wind-effect-surface. */
(() => {
  const moduleUrl = new URL("../../kernels/analytic-and-physics/wind-effect-surface/source/XC__js__wind-effect-surface.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

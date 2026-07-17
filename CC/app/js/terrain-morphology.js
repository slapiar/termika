/* CC host proxy. Implementácia patrí modulu terrain-morphology. */
(() => {
  const moduleUrl = new URL("../../kernels/analytic-and-physics/terrain-morphology/source/XC__js__terrain-morphology.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

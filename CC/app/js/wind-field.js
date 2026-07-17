/* CC host proxy. Implementácia patrí modulu wind-field. */
(() => {
  const moduleUrl = new URL("../../kernels/analytic-and-physics/wind-field/source/XC__js__wind-field.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

/* CC host proxy. Implementácia patrí modulu terrain-mesh. */
(() => {
  const moduleUrl = new URL("../../kernels/analytic-and-physics/terrain-mesh/source/XC__js__terrain-mesh.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

/* CC host proxy. Implementácia patrí modulu terrain-mesh-controls. */
(() => {
  const moduleUrl = new URL("../../ux/analysis-layer-control/terrain-mesh-controls/source/XC__js__terrain-mesh-surface.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

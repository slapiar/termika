/* CC host proxy. Implementácia patrí modulu cesium-basemap-toggle. */
(() => {
  const moduleUrl = new URL("../../ux/cesium-basemap-control/cesium-basemap-toggle/source/XC__js__terrain-basemap-visibility.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

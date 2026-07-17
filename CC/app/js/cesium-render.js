/* CC host proxy. Implementácia patrí modulu flight-track-renderer. */
(() => {
  const moduleUrl = new URL("../../ux/flight-playback/flight-track-renderer/source/XC__js__cesium-render.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

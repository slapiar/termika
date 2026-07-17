/* CC host proxy. Implementácia patrí modulu windy-map-bridge. */
(() => {
  const moduleUrl = new URL("../../infrastructure/windy-bridge-adapter/windy-map-bridge/source/XC__js__windy-map-bridge.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

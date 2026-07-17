/* CC host proxy. Implementácia patrí modulu windy-map-adapter. */
(() => {
  const moduleUrl = new URL("../../infrastructure/windy-bridge-adapter/windy-map-adapter/source/XC__js__windy-map-adapter.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

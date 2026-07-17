/* CC host proxy. Implementácia patrí modulu wind-temp-loader. */
(() => {
  const moduleUrl = new URL("../../services/temp-provider-service/wind-temp-loader/source/XC__js__wind-temp-loader.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

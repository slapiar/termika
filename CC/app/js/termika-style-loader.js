/* CC host proxy. Implementácia patrí modulu style-loader. */
(() => {
  const moduleUrl = new URL("../../infrastructure/module-loader/style-loader/source/XC__js__termika-style-loader.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

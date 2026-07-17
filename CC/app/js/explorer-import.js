/* CC host proxy. Implementácia patrí modulu explorer-route-import. */
(() => {
  const moduleUrl = new URL("../../ux/route-import/explorer-route-import/source/XC__js__explorer-import.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

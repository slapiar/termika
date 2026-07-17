/* CC host proxy. Implementácia patrí modulu explorer-analysis-bridge. */
(() => {
  const moduleUrl = new URL("../../ux/explorer-analysis-transfer/explorer-analysis-bridge/source/XC__js__explorer-analysis-bridge.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

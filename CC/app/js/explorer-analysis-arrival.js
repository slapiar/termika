/* CC host proxy. Implementácia patrí modulu explorer-analysis-arrival. */
(() => {
  const moduleUrl = new URL("../../ux/explorer-analysis-transfer/explorer-analysis-arrival/source/XC__js__explorer-analysis-arrival.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

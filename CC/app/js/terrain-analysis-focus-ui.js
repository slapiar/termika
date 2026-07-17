/* CC host proxy. Implementácia patrí modulu analysis-focus-controls. */
(() => {
  const moduleUrl = new URL("../../ux/analysis-focus-control/analysis-focus-controls/source/XC__js__terrain-analysis-focus-ui.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

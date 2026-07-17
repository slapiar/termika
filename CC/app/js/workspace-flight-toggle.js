/* CC host proxy. Implementácia patrí modulu flight-simulator-toggle. */
(() => {
  const moduleUrl = new URL("../../ux/flight-simulator/flight-simulator-toggle/source/XC__js__workspace-flight-toggle.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

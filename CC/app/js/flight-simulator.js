/* CC host proxy. Implementácia patrí modulu flight-simulator. */
(() => {
  const moduleUrl = new URL("../../ux/flight-simulator/flight-simulator/source/XC__js__flight-simulator.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

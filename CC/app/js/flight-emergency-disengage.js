/* CC host proxy. Implementácia patrí modulu flight-emergency-disengage. */
(() => {
  const moduleUrl = new URL("../../ux/flight-simulator/flight-emergency-disengage/source/XC__js__flight-emergency-disengage.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

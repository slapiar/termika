/* CC host proxy. Implementácia patrí modulu tool-communication. */
(() => {
  const moduleUrl = new URL("../../infrastructure/communication-bus/tool-communication/source/XC__js__tool-communication.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

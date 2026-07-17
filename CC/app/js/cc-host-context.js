/* CC host proxy. Implementácia patrí modulu host-context. */
(() => {
  const moduleUrl = new URL("../../infrastructure/host-context/host-context/host-context.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

/* CC host proxy. Implementácia patrí modulu wind-streamline-renderer. */
(() => {
  const moduleUrl = new URL("../../services/wind-render-service/wind-streamline-renderer/source/XC__js__wind-render.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

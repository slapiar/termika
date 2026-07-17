/* CC host proxy. Implementácia patrí modulu camera-mode-controller. */
(() => {
  const moduleUrl = new URL("../../ux/camera-mode-controller/camera-mode-controller/source/XC__js__pilot-network.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

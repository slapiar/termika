/* CC host proxy. Implementácia patrí modulu camera-hud-toggle. */
(() => {
  const moduleUrl = new URL("../../ux/camera-hud/camera-hud-toggle/source/XC__js__workspace-hud-toggle.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

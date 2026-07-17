/* CC host proxy. Implementácia patrí modulu terrain-camera-hud. */
(() => {
  const moduleUrl = new URL("../../ux/camera-hud/terrain-camera-hud/source/XC__js__terrain-camera-hud.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

/* CC host proxy. Implementácia patrí modulu camera-hud-coordinates. */
(() => {
  const moduleUrl = new URL("../../ux/camera-hud/camera-hud-coordinates/source/XC__js__terrain-camera-hud-coordinates.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

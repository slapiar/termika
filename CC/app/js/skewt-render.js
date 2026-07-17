/* CC host proxy. Implementácia patrí modulu skewt-panel. */
(() => {
  const moduleUrl = new URL("../../ux/skewt-instrument/skewt-panel/source/XC__js__skewt-render.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

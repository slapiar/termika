/* CC host proxy. Implementácia patrí modulu release-badge. */
(() => {
  const moduleUrl = new URL("../../ux/system-status-bar/release-badge/source/XC__js__terrain-release-badge.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

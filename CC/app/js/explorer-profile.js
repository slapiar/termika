/* CC host proxy. Implementácia patrí modulu terrain-profile. */
(() => {
  const moduleUrl = new URL("../../ux/terrain-profile/terrain-profile/source/XC__js__explorer-profile.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

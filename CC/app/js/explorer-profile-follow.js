/* CC host proxy. Implementácia patrí modulu terrain-profile-follow. */
(() => {
  const moduleUrl = new URL("../../ux/terrain-profile/terrain-profile-follow/source/XC__js__explorer-profile-follow.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

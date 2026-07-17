/* CC host proxy. Implementácia patrí modulu terrain-profile-dock. */
(() => {
  const moduleUrl = new URL("../../ux/terrain-profile/terrain-profile-dock/source/XC__js__explorer-profile-dock.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

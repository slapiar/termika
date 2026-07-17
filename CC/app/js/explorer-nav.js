/* CC host proxy. Implementácia patrí modulu workspace-navigation. */
(() => {
  const moduleUrl = new URL("../../ux/workbench-shell/workspace-navigation/source/XC__js__explorer-nav.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

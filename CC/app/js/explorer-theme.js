/* CC host proxy. Implementácia patrí modulu workspace-theme. */
(() => {
  const moduleUrl = new URL("../../ux/workbench-shell/workspace-theme/source/XC__js__explorer-theme.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

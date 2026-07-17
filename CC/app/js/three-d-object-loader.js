/* CC host proxy. Implementácia patrí modulu three-d-object-loader. */
(() => {
  const moduleUrl = new URL("../../ux/object-library/three-d-object-loader/three-d-object-loader.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
})();

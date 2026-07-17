/* CC host proxy. Implementácia patrí modulu terrain-camera-hud. */
(() => {
  const currentScript = document.currentScript;
  const moduleUrl = new URL("../../ux/camera-hud/terrain-camera-hud/source/XC__js__terrain-camera-hud.js", currentScript.src).href;

  // Tento proxy sa niekedy vkladá dynamicky (napr. lazy-load pri kliknutí na
  // tlačidlo HUD). document.write() mimo synchrónneho parsovania stránky
  // vyhadzuje InvalidStateError a modul by sa nikdy nenačítal, preto v takom
  // prípade vložíme skript cez createElement namiesto document.write.
  if (document.readyState === 'loading' && currentScript && currentScript.parentNode) {
    document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');
    return;
  }

  const moduleScript = document.createElement('script');
  moduleScript.src = moduleUrl;
  moduleScript.async = false;
  if (currentScript && currentScript.parentNode) {
    currentScript.parentNode.insertBefore(moduleScript, currentScript.nextSibling);
  } else {
    document.head.appendChild(moduleScript);
  }
})();

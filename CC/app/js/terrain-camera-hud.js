/* CC host proxy. Implementácia patrí modulu terrain-camera-hud. */
(() => {
  const currentScript = document.currentScript;
  const moduleUrl = new URL("../../ux/camera-hud/terrain-camera-hud/source/XC__js__terrain-camera-hud.js", currentScript.src).href;

  // Tento proxy sa vkladá aj dynamicky (lazy-load pri kliknutí na tlačidlo
  // HUD, alebo eager-preload z terrain-analysis-geometry.js). document.write()
  // mimo parsovania stránky vyhadzuje InvalidStateError a modul by sa nikdy
  // nenačítal, prečo document.readyState nie je spoľahlivý indikátor (dynamicky
  // vložený skript môže vykonať ešte počas 'loading'). Preto používame vždy
  // createElement namiesto document.write.
  const moduleScript = document.createElement('script');
  moduleScript.src = moduleUrl;
  moduleScript.async = false;
  if (currentScript && currentScript.parentNode) {
    currentScript.parentNode.insertBefore(moduleScript, currentScript.nextSibling);
  } else {
    document.head.appendChild(moduleScript);
  }
})();

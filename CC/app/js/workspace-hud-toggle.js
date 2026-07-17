/* CC host proxy. Implementácia patrí modulu camera-hud-toggle. */
(() => {
  const moduleUrl = new URL("../../ux/camera-hud/camera-hud-toggle/source/XC__js__workspace-hud-toggle.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');

  function triggerHudToggle() {
    const hudButton = document.getElementById('workspaceHudToggle');
    if (!hudButton || hudButton.disabled) return false;
    hudButton.click();
    return true;
  }

  // Host-level bridge: buttons with this action route to the existing HUD toggle.
  document.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-workspace-action="toggle-hud"]');
    if (!actionButton) return;
    event.preventDefault();
    triggerHudToggle();
  });
})();

/* CC host proxy. Implementácia patrí modulu cesium-toolbar-offset. */
(() => {
  const moduleUrl = new URL("../../ux/workbench-shell/cesium-toolbar-offset/source/XC__js__workspace-cesium-toolbar-offset.js", document.currentScript.src).href;
  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\/script>');

  const navShell = document.getElementById('navShell');
  const navBar = navShell?.querySelector('.nav-bar');
  if (!navShell || !navBar) return;

  function toPx(value) {
    return Math.max(0, Math.ceil(Number(value) || 0)) + 'px';
  }

  function updateNavInsets() {
    const dock = ['top', 'bottom', 'left', 'right'].includes(navShell.dataset.dock)
      ? navShell.dataset.dock
      : 'top';
    const rect = navBar.getBoundingClientRect();

    let insetTop = 0;
    let insetRight = 0;
    let insetBottom = 0;
    let insetLeft = 0;

    if (dock === 'top') {
      insetTop = rect.bottom;
    } else if (dock === 'bottom') {
      insetBottom = window.innerHeight - rect.top;
    } else if (dock === 'left') {
      insetLeft = rect.right;
    } else if (dock === 'right') {
      insetRight = window.innerWidth - rect.left;
    }

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--workspace-nav-inset-top', toPx(insetTop));
    rootStyle.setProperty('--workspace-nav-inset-right', toPx(insetRight));
    rootStyle.setProperty('--workspace-nav-inset-bottom', toPx(insetBottom));
    rootStyle.setProperty('--workspace-nav-inset-left', toPx(insetLeft));
  }

  updateNavInsets();
  window.requestAnimationFrame(updateNavInsets);
  window.setTimeout(updateNavInsets, 120);

  const dockObserver = new MutationObserver(updateNavInsets);
  dockObserver.observe(navShell, { attributes: true, attributeFilter: ['data-dock'] });

  if ('ResizeObserver' in window) {
    const navResizeObserver = new ResizeObserver(updateNavInsets);
    navResizeObserver.observe(navBar);
  }

  window.addEventListener('resize', updateNavInsets, { passive: true });
  window.addEventListener('orientationchange', updateNavInsets, { passive: true });
})();

(() => {
    'use strict';

    if (window.__termikaWorkspaceCesiumToolbarOffsetLoaded) return;
    window.__termikaWorkspaceCesiumToolbarOffsetLoaded = true;

    const navShell = document.getElementById('navShell');
    const navBar = navShell?.querySelector('.nav-bar');
    const cesiumContainer = document.getElementById('cesiumContainer');

    if (!navShell || !navBar) return;

    let toolbarObserver = null;
    let observedToolbar = null;

    function measureCesiumToolbar() {
        const toolbar = document.querySelector('.cesium-viewer-toolbar');
        const height = toolbar
            ? Math.max(0, Math.ceil(toolbar.getBoundingClientRect().height))
            : 40;

        document.documentElement.style.setProperty(
            '--workspace-cesium-toolbar-height',
            `${height}px`
        );

        if (toolbar && toolbar !== observedToolbar && 'ResizeObserver' in window) {
            toolbarObserver?.disconnect();
            observedToolbar = toolbar;
            toolbarObserver = new ResizeObserver(updateToolbarOffset);
            toolbarObserver.observe(toolbar);
        }
    }

    function updateToolbarOffset() {
        const dock = ['top', 'bottom', 'left', 'right'].includes(navShell.dataset.dock)
            ? navShell.dataset.dock
            : 'top';
        const rect = navBar.getBoundingClientRect();

        document.body.dataset.workspaceNavDock = dock;
        document.documentElement.style.setProperty(
            '--workspace-nav-bar-height',
            `${Math.max(0, Math.ceil(rect.height))}px`
        );
        measureCesiumToolbar();
    }

    updateToolbarOffset();
    window.requestAnimationFrame(updateToolbarOffset);
    window.setTimeout(updateToolbarOffset, 120);

    const dockObserver = new MutationObserver(updateToolbarOffset);
    dockObserver.observe(navShell, {
        attributes: true,
        attributeFilter: ['data-dock']
    });

    if ('ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(updateToolbarOffset);
        resizeObserver.observe(navBar);
    } else {
        window.addEventListener('resize', updateToolbarOffset, { passive: true });
    }

    if (cesiumContainer) {
        const cesiumObserver = new MutationObserver(updateToolbarOffset);
        cesiumObserver.observe(cesiumContainer, { childList: true, subtree: true });
    }

    window.addEventListener('resize', updateToolbarOffset, { passive: true });
    window.addEventListener('orientationchange', updateToolbarOffset, { passive: true });
})();

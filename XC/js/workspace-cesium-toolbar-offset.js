(() => {
    'use strict';

    if (window.__termikaWorkspaceCesiumToolbarOffsetLoaded) return;
    window.__termikaWorkspaceCesiumToolbarOffsetLoaded = true;

    const navShell = document.getElementById('navShell');
    const navBar = navShell?.querySelector('.nav-bar');

    if (!navShell || !navBar) return;

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
    }

    updateToolbarOffset();
    window.requestAnimationFrame(updateToolbarOffset);

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

    window.addEventListener('orientationchange', updateToolbarOffset, { passive: true });
})();

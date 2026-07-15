(() => {
    'use strict';

    function initializeWorkspacePolish() {
        const map = document.getElementById('cesiumContainer');
        if (!map) return;

        /* Zjednotenie pomenovania návratu na hlavnú stránku. */
        const explorerHome = document.querySelector('[data-explorer-route="home"]');
        if (explorerHome) {
            explorerHome.textContent = 'DOMOV';
            explorerHome.setAttribute('title', 'Otvoriť hlavnú stránku TermikaXC');
        }

        const testHome = document.querySelector('[data-nav-home="index"]');
        if (testHome) {
            testHome.textContent = 'DOMOV';
            testHome.setAttribute('title', 'Otvoriť hlavnú stránku TermikaXC');
        }

        if (!window.matchMedia?.('(pointer: fine)').matches) return;
        if (document.getElementById('workspaceReticle')) return;

        const reticle = document.createElement('div');
        reticle.id = 'workspaceReticle';
        reticle.className = 'workspace-reticle';
        reticle.setAttribute('aria-hidden', 'true');
        reticle.innerHTML = '<span class="workspace-reticle-center"></span>';
        document.body.appendChild(reticle);
        document.body.classList.add('workspace-crosshair-enabled');

        const interactiveSelector = [
            'button',
            'input',
            'select',
            'textarea',
            'a',
            '[role="button"]',
            '.cesium-viewer-toolbar',
            '.cesium-navigation-help',
            '.cesium-baseLayerPicker-dropDown',
            '.cesium-geocoder-input',
            '.cesium-geocoder-searchButton'
        ].join(',');

        function hideReticle() {
            reticle.classList.remove('is-visible', 'is-pressed');
        }

        function isMapTarget(target) {
            if (!(target instanceof Element)) return false;
            if (!target.closest('#cesiumContainer')) return false;
            if (target.closest(interactiveSelector)) return false;
            return true;
        }

        document.addEventListener('pointermove', (event) => {
            if (!isMapTarget(event.target)) {
                hideReticle();
                return;
            }

            reticle.style.left = `${event.clientX}px`;
            reticle.style.top = `${event.clientY}px`;
            reticle.classList.add('is-visible');
        }, { passive: true });

        document.addEventListener('pointerdown', (event) => {
            if (isMapTarget(event.target)) reticle.classList.add('is-pressed');
        }, { passive: true });

        document.addEventListener('pointerup', () => {
            reticle.classList.remove('is-pressed');
        }, { passive: true });

        document.addEventListener('pointercancel', hideReticle, { passive: true });
        window.addEventListener('blur', hideReticle, { passive: true });
        document.addEventListener('mouseleave', hideReticle, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeWorkspacePolish, { once: true });
    } else {
        initializeWorkspacePolish();
    }
})();

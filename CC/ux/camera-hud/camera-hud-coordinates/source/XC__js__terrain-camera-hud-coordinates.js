(() => {
    'use strict';

    if (window.TerrainCameraHUDCoordinates) return;

    const VERSION = '1.0.0';
    const UPDATE_EPSILON_DEG = 0.00001;
    const MAX_INSTALL_ATTEMPTS = 140;

    let installed = false;
    let coordinateValue = null;
    let topRow = null;
    let activeViewer = null;
    let removePreRenderListener = null;
    let lastLat = null;
    let lastLon = null;

    function formatCoordinate(value, positiveHemisphere, negativeHemisphere) {
        const number = Number(value);
        if (!Number.isFinite(number)) return `--.-----° ${positiveHemisphere}`;
        const hemisphere = number < 0 ? negativeHemisphere : positiveHemisphere;
        return `${Math.abs(number).toLocaleString('sk-SK', {
            minimumFractionDigits: 5,
            maximumFractionDigits: 5
        })}° ${hemisphere}`;
    }

    function resolveViewer() {
        if (window.TerrainCameraHUD?.viewer?.camera) return window.TerrainCameraHUD.viewer;
        const candidates = [window.termikaViewer, window.terrainAnalysisViewer, window.explorerViewer];
        for (const candidate of candidates) {
            if (candidate?.camera && candidate?.scene) return candidate;
        }
        try {
            if (typeof viewer !== 'undefined' && viewer?.camera && viewer?.scene) return viewer;
        } catch (_) {
            // Viewer ešte nemusí byť pripravený.
        }
        return null;
    }

    function installStyles() {
        if (document.getElementById('terrain-camera-hud-coordinates-style')) return;
        const style = document.createElement('style');
        style.id = 'terrain-camera-hud-coordinates-style';
        style.textContent = `
            .terrain-hud-top-row{
                position:absolute;
                top:0;
                left:50%;
                display:flex;
                align-items:center;
                justify-content:center;
                gap:8px;
                max-width:96vw;
                transform:translateX(-50%);
                white-space:nowrap
            }
            .terrain-hud-top-row .terrain-hud-heading-readout{
                position:static!important;
                top:auto!important;
                left:auto!important;
                transform:none!important
            }
            .terrain-hud-coordinate-readout{
                padding:3px 10px 4px;
                border:1px solid var(--terrain-hud-green-dim);
                border-radius:3px;
                background:rgba(4,18,10,.48);
                color:var(--terrain-hud-green-strong);
                font-size:12px;
                font-variant-numeric:tabular-nums;
                letter-spacing:.045em;
                white-space:nowrap
            }
            @media (max-width:760px){
                .terrain-hud-top-row{gap:5px}
                .terrain-hud-coordinate-readout{padding:3px 6px 4px;font-size:9px;letter-spacing:.02em}
                .terrain-hud-top-row .terrain-hud-heading-readout{padding-right:6px;padding-left:6px;font-size:11px}
            }
        `;
        document.head.appendChild(style);
    }

    function installDom() {
        const headingSection = document.querySelector('#terrainCameraHud .terrain-hud-heading');
        const headingValue = headingSection?.querySelector('.terrain-hud-heading-readout');
        if (!headingSection || !headingValue) return false;

        topRow = headingSection.querySelector('.terrain-hud-top-row');
        if (!topRow) {
            topRow = document.createElement('div');
            topRow.className = 'terrain-hud-top-row';
            headingSection.insertBefore(topRow, headingSection.firstChild);
            topRow.appendChild(headingValue);
        }

        coordinateValue = topRow.querySelector('.terrain-hud-coordinate-readout');
        if (!coordinateValue) {
            coordinateValue = document.createElement('div');
            coordinateValue.className = 'terrain-hud-coordinate-readout';
            coordinateValue.textContent = '--.-----° N · --.-----° E';
            coordinateValue.title = 'Aktuálne súradnice polohy Cesium kamery';
            topRow.insertBefore(coordinateValue, headingValue);
        }
        return true;
    }

    function update() {
        if (!coordinateValue || !activeViewer?.camera || typeof Cesium === 'undefined') return;
        const cartographic = activeViewer.camera.positionCartographic;
        if (!cartographic) return;

        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        const lon = Cesium.Math.toDegrees(cartographic.longitude);
        if (
            lastLat !== null
            && lastLon !== null
            && Math.abs(lat - lastLat) < UPDATE_EPSILON_DEG
            && Math.abs(lon - lastLon) < UPDATE_EPSILON_DEG
        ) return;

        lastLat = lat;
        lastLon = lon;
        coordinateValue.textContent = `${formatCoordinate(lat, 'N', 'S')} · ${formatCoordinate(lon, 'E', 'W')}`;
    }

    function bindViewer(viewerInstance) {
        if (!viewerInstance?.scene || !viewerInstance?.camera) return false;
        if (removePreRenderListener) {
            removePreRenderListener();
            removePreRenderListener = null;
        }
        activeViewer = viewerInstance;
        const remove = activeViewer.scene.preRender.addEventListener(update);
        removePreRenderListener = typeof remove === 'function' ? remove : null;
        update();
        return true;
    }

    async function install() {
        if (installed) return true;
        for (let attempt = 0; attempt < MAX_INSTALL_ATTEMPTS; attempt += 1) {
            installStyles();
            const resolvedViewer = resolveViewer();
            if (resolvedViewer && installDom()) {
                bindViewer(resolvedViewer);
                installed = true;
                return true;
            }
            await new Promise((resolve) => window.setTimeout(resolve, 100));
        }
        return false;
    }

    function destroy() {
        if (removePreRenderListener) removePreRenderListener();
        removePreRenderListener = null;
        coordinateValue?.remove();
        coordinateValue = null;
        activeViewer = null;
        installed = false;
    }

    window.TerrainCameraHUDCoordinates = {
        VERSION,
        install,
        bindViewer,
        update,
        destroy,
        get installed() { return installed; },
        get viewer() { return activeViewer; }
    };

    install();
})();

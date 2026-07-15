(() => {
    'use strict';

    if (window.TermikaFlightSimulator) return;

    const VERSION = '1.0.0';
    const DEFAULTS = Object.freeze({
        minSpeedMs: 0,
        maxSpeedMs: 100,
        speedStepMs: 1,
        fastSpeedStepMs: 5,
        accelerationMs2: 4,
        decelerationMs2: 7,
        minimumAglM: 3,
        stateEventIntervalMs: 100
    });

    let activeViewer = null;
    let installed = false;
    let active = false;
    let animationFrame = 0;
    let lastFrameTime = 0;
    let lastStateEventTime = 0;
    let speedMs = 0;
    let targetSpeedMs = 0;
    let options = { ...DEFAULTS };
    let statusNode = null;
    let keydownHandler = null;
    let visibilityHandler = null;

    const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Number(value) || 0));

    function resolveViewer() {
        const candidates = [
            window.termikaViewer,
            window.terrainAnalysisViewer,
            window.explorerViewer
        ];
        for (const candidate of candidates) {
            if (candidate?.camera && candidate?.scene) return candidate;
        }

        try {
            if (typeof viewer !== 'undefined' && viewer?.camera && viewer?.scene) return viewer;
        } catch (_) {
            // Globálny lexikálny binding ešte nemusí byť pripravený.
        }
        return null;
    }

    function isTypingTarget(target) {
        if (!(target instanceof Element)) return false;
        return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'));
    }

    function approach(current, target, delta) {
        if (current < target) return Math.min(target, current + delta);
        if (current > target) return Math.max(target, current - delta);
        return target;
    }

    function formatSpeed(valueMs) {
        return `${Math.round(Math.max(0, valueMs) * 3.6).toLocaleString('sk-SK')} km/h`;
    }

    function cameraCoordinates() {
        const cartographic = activeViewer?.camera?.positionCartographic;
        if (!cartographic || typeof Cesium === 'undefined') return null;
        return {
            lat: Cesium.Math.toDegrees(cartographic.latitude),
            lon: Cesium.Math.toDegrees(cartographic.longitude),
            heightM: Number(cartographic.height)
        };
    }

    function snapshot() {
        const coordinates = cameraCoordinates();
        return {
            version: VERSION,
            active,
            speedMs,
            targetSpeedMs,
            speedKmh: speedMs * 3.6,
            targetSpeedKmh: targetSpeedMs * 3.6,
            coordinates,
            timestamp: Date.now()
        };
    }

    function dispatchState(force = false) {
        const now = performance.now();
        if (!force && now - lastStateEventTime < options.stateEventIntervalMs) return;
        lastStateEventTime = now;
        const detail = snapshot();
        document.dispatchEvent(new CustomEvent('termikaxc:flight-state', { detail }));
        window.TermikaCommunicationTool?.emit?.('flight:state', detail);
    }

    function ensureStatusNode() {
        if (statusNode?.isConnected) return statusNode;
        statusNode = document.getElementById('termikaFlightStatus');
        if (!statusNode) {
            statusNode = document.createElement('div');
            statusNode.id = 'termikaFlightStatus';
            statusNode.hidden = true;
            statusNode.setAttribute('role', 'status');
            statusNode.setAttribute('aria-live', 'polite');
            document.body.appendChild(statusNode);
        }
        return statusNode;
    }

    function renderStatus() {
        const node = ensureStatusNode();
        node.hidden = !active;
        node.classList.toggle('is-moving', speedMs > 0.05 || targetSpeedMs > 0.05);
        node.innerHTML = [
            '<strong>LETOVÝ REŽIM</strong>',
            `<span class="termika-flight-speed">${formatSpeed(speedMs)}</span>`,
            `<span class="termika-flight-target">cieľ ${formatSpeed(targetSpeedMs)}</span>`,
            '<span class="termika-flight-help">↑ zrýchliť · ↓ brzdiť · Shift = väčší krok · medzerník = stop</span>'
        ].join('');
    }

    function ensureMinimumTerrainClearance() {
        if (!activeViewer?.camera || !activeViewer?.scene?.globe || typeof Cesium === 'undefined') return;
        const cartographic = activeViewer.camera.positionCartographic;
        if (!cartographic) return;
        const terrainHeight = activeViewer.scene.globe.getHeight?.(cartographic);
        if (!Number.isFinite(terrainHeight)) return;
        const minimumHeight = terrainHeight + options.minimumAglM;
        if (!(cartographic.height < minimumHeight)) return;

        const heading = activeViewer.camera.heading;
        const pitch = activeViewer.camera.pitch;
        const roll = activeViewer.camera.roll;
        activeViewer.camera.setView({
            destination: Cesium.Cartesian3.fromRadians(
                cartographic.longitude,
                cartographic.latitude,
                minimumHeight
            ),
            orientation: { heading, pitch, roll }
        });
        speedMs = Math.min(speedMs, targetSpeedMs);
    }

    function frame(timestamp) {
        if (!active || !activeViewer?.camera) {
            animationFrame = 0;
            return;
        }

        if (!lastFrameTime) lastFrameTime = timestamp;
        const deltaSeconds = clamp((timestamp - lastFrameTime) / 1000, 0, 0.12);
        lastFrameTime = timestamp;

        const rate = speedMs < targetSpeedMs ? options.accelerationMs2 : options.decelerationMs2;
        speedMs = approach(speedMs, targetSpeedMs, rate * deltaSeconds);

        if (speedMs > 0.001 && deltaSeconds > 0) {
            activeViewer.camera.moveForward(speedMs * deltaSeconds);
            ensureMinimumTerrainClearance();
            activeViewer.scene?.requestRender?.();
        }

        renderStatus();
        dispatchState();
        animationFrame = window.requestAnimationFrame(frame);
    }

    function startLoop() {
        if (animationFrame) return;
        lastFrameTime = 0;
        animationFrame = window.requestAnimationFrame(frame);
    }

    function stopLoop() {
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        lastFrameTime = 0;
    }

    function setTargetSpeedMs(value) {
        targetSpeedMs = clamp(value, options.minSpeedMs, options.maxSpeedMs);
        renderStatus();
        dispatchState(true);
        return targetSpeedMs;
    }

    function adjustSpeedMs(delta) {
        return setTargetSpeedMs(targetSpeedMs + Number(delta || 0));
    }

    function stop() {
        return setTargetSpeedMs(0);
    }

    function handleKeydown(event) {
        if (!active || event.defaultPrevented || isTypingTarget(event.target)) return;
        const step = event.shiftKey ? options.fastSpeedStepMs : options.speedStepMs;

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            adjustSpeedMs(step);
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            adjustSpeedMs(-step);
            return;
        }
        if (event.code === 'Space') {
            event.preventDefault();
            stop();
        }
    }

    function bindViewer(viewerInstance) {
        if (!viewerInstance?.camera || !viewerInstance?.scene) return false;
        activeViewer = viewerInstance;
        return true;
    }

    function install(viewerInstance = null, installOptions = {}) {
        options = { ...DEFAULTS, ...installOptions };
        if (viewerInstance) bindViewer(viewerInstance);
        if (!activeViewer) bindViewer(resolveViewer());
        if (!activeViewer) return false;
        if (installed) return true;

        installed = true;
        ensureStatusNode();
        keydownHandler = handleKeydown;
        document.addEventListener('keydown', keydownHandler, { capture: true });

        visibilityHandler = () => {
            if (document.hidden) {
                lastFrameTime = 0;
            }
        };
        document.addEventListener('visibilitychange', visibilityHandler);
        renderStatus();
        dispatchState(true);
        return true;
    }

    function activate() {
        if (!installed && !install()) return false;
        if (!activeViewer?.scene || !activeViewer?.camera) return false;

        if (typeof Cesium !== 'undefined' && activeViewer.scene.mode !== Cesium.SceneMode.SCENE3D) {
            activeViewer.scene.morphTo3D?.(0.6);
        }

        active = true;
        startLoop();
        renderStatus();
        dispatchState(true);
        document.dispatchEvent(new CustomEvent('termikaxc:flight-activated', { detail: snapshot() }));
        return true;
    }

    function deactivate({ keepSpeed = false } = {}) {
        active = false;
        stopLoop();
        if (!keepSpeed) {
            speedMs = 0;
            targetSpeedMs = 0;
        }
        renderStatus();
        dispatchState(true);
        document.dispatchEvent(new CustomEvent('termikaxc:flight-deactivated', { detail: snapshot() }));
        return true;
    }

    function toggle() {
        return active ? (deactivate(), false) : activate();
    }

    function destroy() {
        deactivate();
        if (keydownHandler) document.removeEventListener('keydown', keydownHandler, { capture: true });
        if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
        keydownHandler = null;
        visibilityHandler = null;
        statusNode?.remove();
        statusNode = null;
        activeViewer = null;
        installed = false;
        dispatchState(true);
    }

    window.TermikaFlightSimulator = {
        VERSION,
        DEFAULTS,
        install,
        bindViewer,
        activate,
        deactivate,
        toggle,
        destroy,
        stop,
        setTargetSpeedMs,
        adjustSpeedMs,
        getState: snapshot,
        get active() { return active; },
        get installed() { return installed; },
        get viewer() { return activeViewer; },
        get speedMs() { return speedMs; },
        get targetSpeedMs() { return targetSpeedMs; }
    };
})();

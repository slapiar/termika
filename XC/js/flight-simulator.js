(() => {
    'use strict';

    if (window.TermikaFlightSimulator) return;

    const VERSION = '1.1.0';
    const GRAVITY_MS2 = 9.80665;
    const DEFAULTS = Object.freeze({
        minSpeedMs: 0,
        maxSpeedMs: 100,
        speedStepMs: 1,
        fastSpeedStepMs: 5,
        accelerationMs2: 4,
        decelerationMs2: 7,
        minimumAglM: 3,
        rollRateDegS: 34,
        maximumBankDeg: 72,
        mousePitchSensitivityDegPx: 0.075,
        maximumFlightPitchDeg: 55,
        lookRateDegS: 58,
        maximumLookYawDeg: 110,
        maximumLookPitchDeg: 82,
        maximumTurnRateDegS: 38,
        coordinatedTurnMinimumSpeedMs: 9,
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
    let keyupHandler = null;
    let visibilityHandler = null;
    let blurHandler = null;
    let pointerDownHandler = null;
    let pointerUpHandler = null;
    let pointerMoveHandler = null;
    let contextMenuHandler = null;
    let pointerLockHandler = null;
    let flightCanvas = null;
    let controllerState = null;

    const input = {
        rollLeft: false,
        rollRight: false,
        lookLeft: false,
        lookRight: false,
        lookDown: false,
        lookUp: false
    };

    const attitude = {
        heading: 0,
        pitch: 0,
        roll: 0,
        lookYaw: 0,
        lookPitch: 0,
        lookRoll: 0
    };

    const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, Number(value) || 0));
    const toRadians = (degrees) => Number(degrees || 0) * Math.PI / 180;
    const toDegrees = (radians) => Number(radians || 0) * 180 / Math.PI;
    const normalizeRadians = (value) => {
        let normalized = Number(value) || 0;
        while (normalized > Math.PI) normalized -= Math.PI * 2;
        while (normalized < -Math.PI) normalized += Math.PI * 2;
        return normalized;
    };
    const normalizeHeading = (value) => {
        let normalized = Number(value) || 0;
        while (normalized >= Math.PI * 2) normalized -= Math.PI * 2;
        while (normalized < 0) normalized += Math.PI * 2;
        return normalized;
    };

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
            flight: {
                headingDeg: (toDegrees(attitude.heading) + 360) % 360,
                pitchDeg: toDegrees(attitude.pitch),
                rollDeg: toDegrees(attitude.roll)
            },
            view: {
                yawOffsetDeg: toDegrees(attitude.lookYaw),
                pitchOffsetDeg: toDegrees(attitude.lookPitch),
                rollOffsetDeg: toDegrees(attitude.lookRoll)
            },
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
            `<span class="termika-flight-attitude">náklon ${Math.round(toDegrees(attitude.roll))}° · pitch ${Math.round(toDegrees(attitude.pitch))}°</span>`,
            '<span class="termika-flight-help">↑/↓ rýchlosť · myš dopredu/dozadu pitch · L/P tlačidlo náklon · Q/W pohľad bokom · A/D dole/hore · S horizont</span>'
        ].join('');
    }

    function resetInputs() {
        Object.keys(input).forEach((key) => { input[key] = false; });
    }

    function initializeAttitudeFromCamera() {
        const camera = activeViewer?.camera;
        if (!camera) return;
        attitude.heading = normalizeHeading(camera.heading);
        attitude.pitch = clamp(camera.pitch, toRadians(-options.maximumFlightPitchDeg), toRadians(options.maximumFlightPitchDeg));
        attitude.roll = clamp(normalizeRadians(camera.roll), toRadians(-options.maximumBankDeg), toRadians(options.maximumBankDeg));
        attitude.lookYaw = 0;
        attitude.lookPitch = 0;
        attitude.lookRoll = 0;
    }

    function cameraOrientation() {
        return {
            heading: normalizeHeading(attitude.heading + attitude.lookYaw),
            pitch: clamp(
                attitude.pitch + attitude.lookPitch,
                toRadians(-89),
                toRadians(89)
            ),
            roll: normalizeRadians(attitude.roll + attitude.lookRoll)
        };
    }

    function setCameraPose(destination = null) {
        if (!activeViewer?.camera || typeof Cesium === 'undefined') return;
        const orientation = cameraOrientation();
        activeViewer.camera.setView({
            destination: destination || Cesium.Cartesian3.clone(activeViewer.camera.position),
            orientation
        });
    }

    function terrainSafeDestination(destination) {
        if (!destination || !activeViewer?.scene?.globe || typeof Cesium === 'undefined') return destination;
        const cartographic = Cesium.Cartographic.fromCartesian(destination);
        if (!cartographic) return destination;
        const terrainHeight = activeViewer.scene.globe.getHeight?.(cartographic);
        if (!Number.isFinite(terrainHeight)) return destination;
        const minimumHeight = terrainHeight + options.minimumAglM;
        if (cartographic.height >= minimumHeight) return destination;
        return Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, minimumHeight);
    }

    function directionInWorld() {
        if (!activeViewer?.camera || typeof Cesium === 'undefined') return null;
        const position = activeViewer.camera.position;
        const frame = Cesium.Transforms.eastNorthUpToFixedFrame(position);
        const cosPitch = Math.cos(attitude.pitch);
        const localDirection = new Cesium.Cartesian3(
            Math.sin(attitude.heading) * cosPitch,
            Math.cos(attitude.heading) * cosPitch,
            Math.sin(attitude.pitch)
        );
        const direction = Cesium.Matrix4.multiplyByPointAsVector(frame, localDirection, new Cesium.Cartesian3());
        return Cesium.Cartesian3.normalize(direction, direction);
    }

    function moveAircraft(distanceMeters) {
        if (!(distanceMeters > 0) || !activeViewer?.camera || typeof Cesium === 'undefined') {
            setCameraPose();
            return;
        }
        const direction = directionInWorld();
        if (!direction) return;
        const step = Cesium.Cartesian3.multiplyByScalar(direction, distanceMeters, new Cesium.Cartesian3());
        const destination = Cesium.Cartesian3.add(activeViewer.camera.position, step, new Cesium.Cartesian3());
        setCameraPose(terrainSafeDestination(destination));
    }

    function updateFlightControls(deltaSeconds) {
        const rollDirection = (input.rollRight ? 1 : 0) - (input.rollLeft ? 1 : 0);
        if (rollDirection !== 0) {
            attitude.roll = clamp(
                attitude.roll + rollDirection * toRadians(options.rollRateDegS) * deltaSeconds,
                toRadians(-options.maximumBankDeg),
                toRadians(options.maximumBankDeg)
            );
        }

        if (speedMs > 0.5 && Math.abs(attitude.roll) > toRadians(0.1)) {
            const effectiveSpeed = Math.max(options.coordinatedTurnMinimumSpeedMs, speedMs);
            const turnRate = clamp(
                GRAVITY_MS2 * Math.tan(attitude.roll) / effectiveSpeed,
                toRadians(-options.maximumTurnRateDegS),
                toRadians(options.maximumTurnRateDegS)
            );
            attitude.heading = normalizeHeading(attitude.heading + turnRate * deltaSeconds);
        }

        const lookYawDirection = (input.lookRight ? 1 : 0) - (input.lookLeft ? 1 : 0);
        const lookPitchDirection = (input.lookUp ? 1 : 0) - (input.lookDown ? 1 : 0);
        const lookRate = toRadians(options.lookRateDegS) * deltaSeconds;
        attitude.lookYaw = clamp(
            attitude.lookYaw + lookYawDirection * lookRate,
            toRadians(-options.maximumLookYawDeg),
            toRadians(options.maximumLookYawDeg)
        );
        attitude.lookPitch = clamp(
            attitude.lookPitch + lookPitchDirection * lookRate,
            toRadians(-options.maximumLookPitchDeg),
            toRadians(options.maximumLookPitchDeg)
        );
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
        updateFlightControls(deltaSeconds);
        moveAircraft(speedMs * deltaSeconds);

        activeViewer.scene?.requestRender?.();
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

    function resetViewToHorizon() {
        attitude.lookYaw = 0;
        attitude.lookPitch = clamp(
            -attitude.pitch,
            toRadians(-options.maximumLookPitchDeg),
            toRadians(options.maximumLookPitchDeg)
        );
        attitude.lookRoll = normalizeRadians(-attitude.roll);
        setCameraPose();
        renderStatus();
        dispatchState(true);
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
            return;
        }
        if (event.code === 'KeyQ') {
            event.preventDefault();
            input.lookLeft = true;
            return;
        }
        if (event.code === 'KeyW') {
            event.preventDefault();
            input.lookRight = true;
            return;
        }
        if (event.code === 'KeyA') {
            event.preventDefault();
            input.lookDown = true;
            return;
        }
        if (event.code === 'KeyD') {
            event.preventDefault();
            input.lookUp = true;
            return;
        }
        if (event.code === 'KeyS' && !event.repeat) {
            event.preventDefault();
            resetViewToHorizon();
        }
    }

    function handleKeyup(event) {
        if (event.code === 'KeyQ') input.lookLeft = false;
        if (event.code === 'KeyW') input.lookRight = false;
        if (event.code === 'KeyA') input.lookDown = false;
        if (event.code === 'KeyD') input.lookUp = false;
    }

    function isFlightPointerEvent(event) {
        if (!flightCanvas) return false;
        return document.pointerLockElement === flightCanvas || event.target === flightCanvas;
    }

    function handlePointerDown(event) {
        if (!active || !isFlightPointerEvent(event)) return;
        if (event.button !== 0 && event.button !== 2) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.button === 0) input.rollLeft = true;
        if (event.button === 2) input.rollRight = true;
        if (document.pointerLockElement !== flightCanvas) {
            flightCanvas.requestPointerLock?.();
        }
    }

    function handlePointerUp(event) {
        if (event.button === 0) input.rollLeft = false;
        if (event.button === 2) input.rollRight = false;
    }

    function handlePointerMove(event) {
        if (!active || !isFlightPointerEvent(event)) return;
        const movementY = Number(event.movementY) || 0;
        if (!movementY) return;
        attitude.pitch = clamp(
            attitude.pitch + toRadians(movementY * options.mousePitchSensitivityDegPx),
            toRadians(-options.maximumFlightPitchDeg),
            toRadians(options.maximumFlightPitchDeg)
        );
        renderStatus();
    }

    function handleContextMenu(event) {
        if (!active || !isFlightPointerEvent(event)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function handlePointerLockChange() {
        if (document.pointerLockElement !== flightCanvas) {
            input.rollLeft = false;
            input.rollRight = false;
        }
    }

    function saveControllerState() {
        const controller = activeViewer?.scene?.screenSpaceCameraController;
        if (!controller || controllerState) return;
        controllerState = {
            enableInputs: controller.enableInputs,
            enableRotate: controller.enableRotate,
            enableTranslate: controller.enableTranslate,
            enableZoom: controller.enableZoom,
            enableTilt: controller.enableTilt,
            enableLook: controller.enableLook
        };
        controller.enableInputs = false;
    }

    function restoreControllerState() {
        const controller = activeViewer?.scene?.screenSpaceCameraController;
        if (!controller || !controllerState) return;
        Object.entries(controllerState).forEach(([key, value]) => {
            if (key in controller) controller[key] = value;
        });
        controllerState = null;
    }

    function bindViewer(viewerInstance) {
        if (!viewerInstance?.camera || !viewerInstance?.scene) return false;
        activeViewer = viewerInstance;
        flightCanvas = viewerInstance.scene.canvas;
        return true;
    }

    function install(viewerInstance = null, installOptions = {}) {
        options = { ...DEFAULTS, ...installOptions };
        if (viewerInstance) bindViewer(viewerInstance);
        if (!activeViewer) bindViewer(resolveViewer());
        if (!activeViewer || !flightCanvas) return false;
        if (installed) return true;

        installed = true;
        ensureStatusNode();

        keydownHandler = handleKeydown;
        keyupHandler = handleKeyup;
        pointerDownHandler = handlePointerDown;
        pointerUpHandler = handlePointerUp;
        pointerMoveHandler = handlePointerMove;
        contextMenuHandler = handleContextMenu;
        pointerLockHandler = handlePointerLockChange;
        visibilityHandler = () => {
            if (document.hidden) {
                lastFrameTime = 0;
                resetInputs();
            }
        };
        blurHandler = resetInputs;

        document.addEventListener('keydown', keydownHandler, { capture: true });
        document.addEventListener('keyup', keyupHandler, { capture: true });
        flightCanvas.addEventListener('pointerdown', pointerDownHandler, { capture: true });
        document.addEventListener('pointerup', pointerUpHandler, { capture: true });
        document.addEventListener('pointermove', pointerMoveHandler, { capture: true });
        flightCanvas.addEventListener('contextmenu', contextMenuHandler, { capture: true });
        document.addEventListener('pointerlockchange', pointerLockHandler);
        document.addEventListener('visibilitychange', visibilityHandler);
        window.addEventListener('blur', blurHandler);

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

        initializeAttitudeFromCamera();
        resetInputs();
        saveControllerState();
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
        resetInputs();
        restoreControllerState();
        if (document.pointerLockElement === flightCanvas) document.exitPointerLock?.();
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
        if (keyupHandler) document.removeEventListener('keyup', keyupHandler, { capture: true });
        if (pointerDownHandler) flightCanvas?.removeEventListener('pointerdown', pointerDownHandler, { capture: true });
        if (pointerUpHandler) document.removeEventListener('pointerup', pointerUpHandler, { capture: true });
        if (pointerMoveHandler) document.removeEventListener('pointermove', pointerMoveHandler, { capture: true });
        if (contextMenuHandler) flightCanvas?.removeEventListener('contextmenu', contextMenuHandler, { capture: true });
        if (pointerLockHandler) document.removeEventListener('pointerlockchange', pointerLockHandler);
        if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
        if (blurHandler) window.removeEventListener('blur', blurHandler);

        keydownHandler = null;
        keyupHandler = null;
        pointerDownHandler = null;
        pointerUpHandler = null;
        pointerMoveHandler = null;
        contextMenuHandler = null;
        pointerLockHandler = null;
        visibilityHandler = null;
        blurHandler = null;
        statusNode?.remove();
        statusNode = null;
        flightCanvas = null;
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
        resetViewToHorizon,
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

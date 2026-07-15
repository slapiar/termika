(() => {
    'use strict';

    if (window.TermikaFlightEmergencyDisengage) return;

    const VERSION = '1.0.0';
    const AUX_CLICK_SUPPRESSION_MS = 900;

    let installed = false;
    let lastDisengageAt = -Infinity;
    let pointerDownHandler = null;
    let auxClickHandler = null;
    let stateHandler = null;

    function simulator() {
        return window.TermikaFlightSimulator || null;
    }

    function flightCanvas() {
        return simulator()?.viewer?.scene?.canvas
            || document.querySelector('#cesiumContainer canvas')
            || null;
    }

    function isMapEvent(event) {
        const canvas = flightCanvas();
        if (!canvas) return false;
        return document.pointerLockElement === canvas
            || event.target === canvas
            || canvas.contains?.(event.target);
    }

    function publishDisengage(reason) {
        const detail = {
            version: VERSION,
            reason,
            timestamp: Date.now()
        };
        document.dispatchEvent(new CustomEvent(
            'termikaxc:flight-emergency-disengage',
            { detail }
        ));
        window.TermikaCommunicationTool?.emit?.(
            'flight:emergency-disengage',
            detail
        );
    }

    function disengage(reason = 'middle-mouse-button') {
        const api = simulator();
        if (!api?.active) return false;

        api.deactivate();
        lastDisengageAt = performance.now();
        publishDisengage(reason);

        if (typeof window.setStatus === 'function') {
            window.setStatus(
                'Letový režim bol bezpečne vypnutý. Ovládanie myšou Cesium je obnovené.',
                'success'
            );
        }
        return true;
    }

    function handlePointerDown(event) {
        if (event.button !== 1 || !isMapEvent(event)) return;
        const api = simulator();
        if (!api?.active) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        disengage('middle-mouse-button');
    }

    function handleAuxClick(event) {
        if (event.button !== 1) return;

        const recentlyDisengaged = performance.now() - lastDisengageAt
            <= AUX_CLICK_SUPPRESSION_MS;
        if (!recentlyDisengaged && !isMapEvent(event)) return;
        if (!recentlyDisengaged && !simulator()?.active) return;

        event.preventDefault();
        event.stopImmediatePropagation();
    }

    function updateHint() {
        const hint = document.querySelector(
            '#termikaFlightStatus .termika-flight-help'
        );
        if (!hint || hint.textContent.includes('koliesko')) return;
        hint.textContent += ' · koliesko = vypnúť LET';
    }

    function install() {
        if (installed) return true;

        pointerDownHandler = handlePointerDown;
        auxClickHandler = handleAuxClick;
        stateHandler = updateHint;

        document.addEventListener(
            'pointerdown',
            pointerDownHandler,
            { capture: true }
        );
        document.addEventListener(
            'auxclick',
            auxClickHandler,
            { capture: true }
        );
        document.addEventListener(
            'termikaxc:flight-state',
            stateHandler
        );

        installed = true;
        updateHint();
        return true;
    }

    function destroy() {
        if (!installed) return;

        document.removeEventListener(
            'pointerdown',
            pointerDownHandler,
            { capture: true }
        );
        document.removeEventListener(
            'auxclick',
            auxClickHandler,
            { capture: true }
        );
        document.removeEventListener(
            'termikaxc:flight-state',
            stateHandler
        );

        pointerDownHandler = null;
        auxClickHandler = null;
        stateHandler = null;
        installed = false;
    }

    window.TermikaFlightEmergencyDisengage = {
        VERSION,
        install,
        destroy,
        disengage,
        get installed() { return installed; }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install, { once: true });
    } else {
        install();
    }
})();

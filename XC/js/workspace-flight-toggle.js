(() => {
    'use strict';

    if (window.__termikaWorkspaceFlightToggleLoaded) return;
    window.__termikaWorkspaceFlightToggleLoaded = true;

    const MAX_INSTALL_ATTEMPTS = 100;
    let button = null;
    let simulator = null;
    let installing = false;

    const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

    function findNavigationMeta() {
        return document.querySelector('#explorerNavShell .explorer-nav-meta')
            || document.querySelector('#navShell .nav-meta');
    }

    function findHudButton() {
        return document.getElementById('workspaceHudToggle');
    }

    function findThemeButton() {
        return document.getElementById('explorerThemeToggle')
            || document.getElementById('navThemeToggleButton');
    }

    function formatSpeed(speedMs) {
        return `${Math.round(Math.max(0, Number(speedMs) || 0) * 3.6).toLocaleString('sk-SK')} km/h`;
    }

    function updateButton(state = null, pending = false) {
        if (!button) return;
        const current = state || simulator?.getState?.() || { active: false, speedMs: 0, targetSpeedMs: 0 };
        const active = Boolean(current.active);

        button.classList.toggle('is-active', active && !pending);
        button.classList.toggle('is-pending', pending);
        button.setAttribute('aria-pressed', active && !pending ? 'true' : 'false');
        button.disabled = pending;
        button.textContent = 'LET';

        if (pending) {
            button.title = 'Pripájam letový režim…';
            button.setAttribute('aria-label', 'Pripájam letový režim');
        } else if (active) {
            const speed = formatSpeed(current.speedMs);
            const target = formatSpeed(current.targetSpeedMs);
            button.title = `Letový režim je zapnutý · ${speed} · cieľ ${target} · kliknutím vypnúť`;
            button.setAttribute('aria-label', `Letový režim je zapnutý. Aktuálna rýchlosť ${speed}. Kliknutím vypnúť.`);
        } else {
            button.title = 'Zapnúť letový režim · myš ovláda let a klávesy ovládajú rýchlosť a pohľad pilota';
            button.setAttribute('aria-label', 'Zapnúť letový režim. Myš ovláda let a klávesy ovládajú rýchlosť a pohľad pilota.');
        }
    }

    function createButton() {
        if (button) return button;
        const navMeta = findNavigationMeta();
        if (!navMeta) return null;

        button = document.createElement('button');
        button.id = 'workspaceFlightToggle';
        button.type = 'button';
        button.className = 'workspace-flight-toggle';

        if (document.getElementById('explorerNavShell')) {
            button.classList.add('explorer-theme-toggle');
        } else {
            button.classList.add('nav-theme-toggle');
        }

        const hudButton = findHudButton();
        const themeButton = findThemeButton();
        if (hudButton?.parentElement === navMeta) {
            hudButton.insertAdjacentElement('afterend', button);
        } else if (themeButton?.parentElement === navMeta) {
            navMeta.insertBefore(button, themeButton);
        } else {
            navMeta.appendChild(button);
        }

        updateButton(null, true);
        return button;
    }

    async function ensureSimulator() {
        if (simulator?.viewer) return simulator;
        installing = true;
        updateButton(null, true);

        try {
            simulator = window.TermikaFlightSimulator || null;
            if (!simulator) throw new Error('Modul TermikaFlightSimulator nie je načítaný.');

            for (let attempt = 0; attempt < MAX_INSTALL_ATTEMPTS; attempt += 1) {
                if (simulator.install?.() === true || simulator.viewer) {
                    updateButton(simulator.getState?.());
                    return simulator;
                }
                await delay(100);
            }
            throw new Error('Letový režim nenašiel pripravený Cesium viewer.');
        } finally {
            installing = false;
            if (button?.disabled) updateButton(simulator?.getState?.() || { active: false, speedMs: 0, targetSpeedMs: 0 });
        }
    }

    async function toggleFlight() {
        if (installing) return;
        try {
            const api = await ensureSimulator();
            if (api.active) api.deactivate();
            else if (!api.activate()) throw new Error('Letový režim sa nepodarilo aktivovať.');
            updateButton(api.getState?.());
        } catch (error) {
            console.error('Letový režim zlyhal:', error);
            updateButton({ active: false, speedMs: 0, targetSpeedMs: 0 });
            if (typeof window.setStatus === 'function') {
                window.setStatus(error.message || 'Letový režim sa nepodarilo zapnúť.', 'error');
            }
        }
    }

    async function initialize() {
        for (let attempt = 0; attempt < 80; attempt += 1) {
            if (createButton()) break;
            await delay(100);
        }
        if (!button) return;

        button.addEventListener('click', toggleFlight);
        document.addEventListener('termikaxc:flight-state', (event) => updateButton(event.detail));

        try {
            await ensureSimulator();
        } catch (error) {
            console.error('Inicializácia letového režimu zlyhala:', error);
            updateButton({ active: false, speedMs: 0, targetSpeedMs: 0 });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();

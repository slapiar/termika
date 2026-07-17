(() => {
    'use strict';

    if (window.__termikaWorkspaceHudToggleLoaded) return;
    window.__termikaWorkspaceHudToggleLoaded = true;

    const STORAGE_KEY = 'termikaXC.cameraHud.visible.v1';
    const MODULE_URL = 'js/terrain-camera-hud.js?v=20260717-01';
    const MAX_INSTALL_ATTEMPTS = 100;

    let hudButton = null;
    let hudApi = null;
    let installPromise = null;
    let compatibilityMarker = null;

    const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

    function readSavedVisibility() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === null) return false;
            return saved !== 'false';
        } catch (error) {
            console.warn('Stav HUD-u sa nepodarilo načítať:', error);
            return false;
        }
    }

    function saveVisibility(visible) {
        try {
            localStorage.setItem(STORAGE_KEY, visible ? 'true' : 'false');
        } catch (error) {
            console.warn('Stav HUD-u sa nepodarilo uložiť:', error);
        }
    }

    function findNavigationMeta() {
        return document.querySelector('#explorerNavShell .explorer-nav-meta')
            || document.querySelector('#navShell .nav-meta');
    }

    function findThemeButton() {
        return document.getElementById('explorerThemeToggle')
            || document.getElementById('navThemeToggleButton');
    }

    function updateButton(visible, pending = false) {
        if (!hudButton) return;

        hudButton.classList.toggle('is-active', Boolean(visible) && !pending);
        hudButton.classList.toggle('is-pending', pending);
        hudButton.setAttribute('aria-pressed', visible && !pending ? 'true' : 'false');
        hudButton.disabled = false;
        hudButton.textContent = 'HUD';

        if (pending) {
            hudButton.title = 'Pripájam kamerový HUD…';
            hudButton.setAttribute('aria-label', 'Pripájam kamerový HUD');
        } else if (visible) {
            hudButton.title = 'HUD je zapnutý · kliknutím vypnúť';
            hudButton.setAttribute('aria-label', 'HUD je zapnutý. Kliknutím vypnúť.');
        } else {
            hudButton.title = 'HUD je vypnutý · kliknutím zapnúť';
            hudButton.setAttribute('aria-label', 'HUD je vypnutý. Kliknutím zapnúť.');
        }
    }

    function createButton() {
        if (hudButton) return hudButton;

        const navMeta = findNavigationMeta();
        if (!navMeta) return null;

        hudButton = document.createElement('button');
        hudButton.id = 'workspaceHudToggle';
        hudButton.type = 'button';
        hudButton.className = 'workspace-hud-toggle';

        if (document.getElementById('explorerNavShell')) {
            hudButton.classList.add('explorer-theme-toggle');
        } else {
            hudButton.classList.add('nav-theme-toggle');
        }

        const themeButton = findThemeButton();
        if (themeButton?.parentElement === navMeta) {
            navMeta.insertBefore(hudButton, themeButton);
        } else {
            const closeButton = document.getElementById('explorerNavClose')
                || document.getElementById('navCloseDrawerButton');
            if (closeButton?.parentElement === navMeta) navMeta.insertBefore(hudButton, closeButton);
            else navMeta.appendChild(hudButton);
        }

        updateButton(false, false);
        return hudButton;
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = Array.from(document.scripts).find((script) => {
                const url = script.getAttribute('src') || '';
                return url.includes('terrain-camera-hud.js');
            });

            if (existing) {
                if (window.TerrainCameraHUD) {
                    resolve();
                    return;
                }
                existing.addEventListener('load', resolve, { once: true });
                existing.addEventListener('error', () => reject(new Error('Kamerový HUD sa nepodarilo načítať.')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            script.dataset.workspaceHudModule = 'true';
            script.addEventListener('load', resolve, { once: true });
            script.addEventListener('error', () => reject(new Error('Kamerový HUD sa nepodarilo načítať.')), { once: true });
            document.body.appendChild(script);
        });
    }

    function createCompatibilityMarker() {
        if (document.getElementById('radiusInput')) return null;
        if (!document.getElementById('explorerNavShell')) return null;

        compatibilityMarker = document.createElement('input');
        compatibilityMarker.id = 'radiusInput';
        compatibilityMarker.type = 'hidden';
        compatibilityMarker.value = '0';
        compatibilityMarker.dataset.workspaceHudCompatibility = 'true';
        document.body.appendChild(compatibilityMarker);
        return compatibilityMarker;
    }

    function removeCompatibilityMarker() {
        compatibilityMarker?.remove();
        compatibilityMarker = null;
    }

    function bindLegacyCheckbox() {
        const checkbox = document.getElementById('cameraHudVisible');
        if (!checkbox || checkbox.__workspaceHudToggleBound) return;

        checkbox.addEventListener('change', () => {
            const visible = Boolean(checkbox.checked);
            saveVisibility(visible);
            updateButton(visible);
        });
        checkbox.__workspaceHudToggleBound = true;
    }

    async function ensureHud() {
        if (hudApi?.viewer) return hudApi;
        if (installPromise) return installPromise;

        installPromise = (async () => {
            createCompatibilityMarker();

            if (!window.TerrainCameraHUD) await loadScript(MODULE_URL);

            // Proxy skript modulu sa niekedy vkladá dynamicky, takže jeho
            // vlastná 'load' udalosť môže nastať skôr, než je globál
            // TerrainCameraHUD reálne priradený. Počkáme naň krátko.
            for (let attempt = 0; attempt < MAX_INSTALL_ATTEMPTS && !window.TerrainCameraHUD; attempt += 1) {
                await delay(100);
            }

            hudApi = window.TerrainCameraHUD || null;
            if (!hudApi) throw new Error('Modul TerrainCameraHUD nie je dostupný.');

            let installed = false;
            for (let attempt = 0; attempt < MAX_INSTALL_ATTEMPTS; attempt += 1) {
                installed = hudApi.install?.() === true || Boolean(hudApi.viewer);
                if (installed) break;
                await delay(100);
            }

            if (!installed) throw new Error('HUD nenašiel pripravený Cesium viewer.');

            removeCompatibilityMarker();
            bindLegacyCheckbox();
            return hudApi;
        })().catch((error) => {
            removeCompatibilityMarker();
            installPromise = null;
            throw error;
        });

        return installPromise;
    }

    async function applyVisibility(visible, { save = true } = {}) {
        updateButton(visible, true);
        try {
            const hud = await ensureHud();
            hud.setVisible(Boolean(visible));
            if (save) saveVisibility(Boolean(visible));
            updateButton(Boolean(visible));
            bindLegacyCheckbox();
        } catch (error) {
            console.error('Zapnutie kamerového HUD-u zlyhalo:', error);
            updateButton(false);
            if (typeof window.setStatus === 'function') {
                window.setStatus(error.message || 'HUD sa nepodarilo zapnúť.', 'error');
            }
        }
    }

    async function initialize() {
        for (let attempt = 0; attempt < 80; attempt += 1) {
            if (createButton()) break;
            await delay(100);
        }
        if (!hudButton) return;

        hudButton.addEventListener('click', async () => {
            const current = hudApi ? Boolean(hudApi.visible) : readSavedVisibility();
            await applyVisibility(!current);
        });

        await applyVisibility(readSavedVisibility(), { save: false });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();

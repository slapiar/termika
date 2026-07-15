(() => {
    'use strict';

    if (window.__termikaExplorerAnalysisArrivalLoaded) return;
    window.__termikaExplorerAnalysisArrivalLoaded = true;

    const params = new URLSearchParams(window.location.search);
    if (params.get('from') !== 'explorer') return;

    const STORAGE_KEY = 'termikaXC.explorer.analysisContext.v1';

    function readContext() {
        let serialized = null;
        try {
            serialized = sessionStorage.getItem(STORAGE_KEY);
        } catch (_) {}

        if (!serialized) {
            try {
                serialized = localStorage.getItem(STORAGE_KEY);
            } catch (_) {}
        }
        if (!serialized) return null;

        try {
            const context = JSON.parse(serialized);
            const lat = Number(context?.center?.lat);
            const lon = Number(context?.center?.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
            return context;
        } catch (error) {
            console.warn('Zdrojový kontext Prieskumníka sa nepodarilo načítať:', error);
            return null;
        }
    }

    function formatCenter(center) {
        return `${Number(center.lat).toFixed(5)}, ${Number(center.lon).toFixed(5)}`;
    }

    function setText(id, text, title = text) {
        const node = document.getElementById(id);
        if (!node) return;
        node.textContent = text;
        node.title = title;
    }

    function applySourceContext(context) {
        const pointCount = Array.isArray(context?.points) ? context.points.length : 0;
        const taskName = String(context?.task?.name || 'plánovaná trať').trim() || 'plánovaná trať';
        const sourceLabel = pointCount
            ? `Prieskumník · ${taskName}`
            : 'Prieskumník · stred aktuálnej mapy';
        const centerTextValue = formatCenter(context.center);

        setText('loadedIgcName', sourceLabel);
        setText(
            'pTempFile',
            'AUTO · podľa stredu z Prieskumníka',
            'Po spustení analýzy sa TEMP vyberie automaticky v poradí Windy → stanica → súbor.'
        );

        const centerText = document.getElementById('centerText');
        if (centerText) centerText.textContent = centerTextValue;

        const centerInput = document.getElementById('centerInput');
        if (centerInput) centerInput.value = centerTextValue;

        const sourceMode = document.getElementById('windTempSourceMode');
        if (sourceMode && sourceMode.value !== 'auto') {
            sourceMode.value = 'auto';
            sourceMode.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const useTempProfile = document.getElementById('windUseTempProfile');
        if (useTempProfile) useTempProfile.checked = true;

        document.body.dataset.analysisSource = 'explorer';
        document.dispatchEvent(new CustomEvent('termikaxc:analysis-source-applied', {
            detail: {
                source: 'explorer',
                center: context.center,
                taskName,
                pointCount
            }
        }));
    }

    function activateAnalysisWorkspace() {
        try {
            if (typeof setActiveNavSection === 'function') {
                setActiveNavSection('analysis', false);
            }
        } catch (error) {
            console.warn('Prepnutie pracoviska na Analýzu cez API zlyhalo:', error);
        }

        document.querySelectorAll('#navShell .nav-tab[data-nav-section]').forEach((button) => {
            button.classList.toggle('is-active', button.dataset.navSection === 'analysis');
        });
        document.querySelectorAll('#navDrawer .nav-drawer-section[data-nav-section]').forEach((section) => {
            section.classList.toggle('is-active', section.dataset.navSection === 'analysis');
        });

        const drawer = document.getElementById('navDrawer');
        if (drawer) drawer.hidden = true;
    }

    function settleArrival() {
        const context = readContext();
        if (!context) return;

        applySourceContext(context);
        activateAnalysisWorkspace();

        /*
         * Niektoré staršie moduly dokončujú inicializáciu tesne po DOMContentLoaded.
         * Krátke opakovanie udrží Analýzu ako výsledný stav bez viditeľného blikania.
         */
        [80, 240, 520].forEach((delay) => {
            window.setTimeout(() => {
                applySourceContext(context);
                activateAnalysisWorkspace();
            }, delay);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', settleArrival, { once: true });
    } else {
        settleArrival();
    }
})();

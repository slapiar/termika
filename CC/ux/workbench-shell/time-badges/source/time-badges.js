(() => {
    'use strict';
    if (window.__termikaTimeBadgesLoaded) return;
    window.__termikaTimeBadgesLoaded = true;

    const pad = (value) => String(Math.trunc(Number(value) || 0)).padStart(2, '0');
    let root = null;
    let nowBadge = null;
    let igcBadge = null;
    let lastFlightKey = '';

    function ensureView() {
        if (root?.isConnected) return root;

        root = document.getElementById('termikaTimeBadges') || document.createElement('section');
        root.id = 'termikaTimeBadges';
        root.className = 'termika-time-badges';
        root.setAttribute('aria-label', 'Časové značky pracoviska');

        nowBadge = document.getElementById('termikaNowTimeBadge') || document.createElement('div');
        nowBadge.id = 'termikaNowTimeBadge';
        nowBadge.className = 'termika-time-badge termika-time-badge--now';
        nowBadge.setAttribute('aria-label', 'Aktuálny dátum a čas zariadenia');

        igcBadge = document.getElementById('termikaGlobalIgcTimeBadge') || document.createElement('div');
        igcBadge.id = 'termikaGlobalIgcTimeBadge';
        igcBadge.className = 'termika-time-badge termika-time-badge--igc';
        igcBadge.setAttribute('aria-label', 'Dátum letu, čas štartu a pristátia z IGC');

        if (!nowBadge.isConnected) root.appendChild(nowBadge);
        if (!igcBadge.isConnected) root.appendChild(igcBadge);
        if (!root.isConnected) document.body.appendChild(root);
        return root;
    }

    function formatLocal(date) {
        return `${pad(date.getDate())}. ${pad(date.getMonth() + 1)}. ${date.getFullYear()}: ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    function formatSeconds(seconds) {
        const normalized = ((Math.trunc(Number(seconds) || 0) % 86400) + 86400) % 86400;
        return `${pad(Math.floor(normalized / 3600))}:${pad(Math.floor((normalized % 3600) / 60))}:${pad(normalized % 60)}`;
    }

    function formatFlightDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
        return match ? `${match[3]}.${match[2]}. ${match[1]}` : null;
    }

    function updateNow() {
        ensureView();
        nowBadge.textContent = `NOW - ${formatLocal(new Date())}`;
    }

    function clearIgc() {
        ensureView();
        igcBadge.textContent = '';
        lastFlightKey = '';
    }

    function updateIgc(metadata, points) {
        ensureView();
        if (!Array.isArray(points) || points.length === 0) {
            clearIgc();
            return false;
        }

        const date = formatFlightDate(metadata?.flightDate);
        const first = points.find((point) => Number.isFinite(Number(point?.time_s)));
        const last = [...points].reverse().find((point) => Number.isFinite(Number(point?.time_s)));
        if (!date || !first || !last) {
            clearIgc();
            return false;
        }

        const key = `${date}|${first.time_s}|${last.time_s}|${points.length}`;
        if (key === lastFlightKey && igcBadge.textContent) return true;

        igcBadge.textContent = `IGC ${date}, Štart - ${formatSeconds(first.time_s)} - Pristátie: ${formatSeconds(last.time_s)}`;
        lastFlightKey = key;
        return true;
    }

    function syncFromPilotNetwork() {
        const network = window.PilotNetwork;
        if (!network || !Array.isArray(network.letoveBody) || network.letoveBody.length === 0) {
            clearIgc();
            return;
        }
        updateIgc(network.metadata, network.letoveBody);
    }

    function initialize() {
        ensureView();
        updateNow();
        syncFromPilotNetwork();
    }

    window.TermikaTimeBadges = Object.freeze({
        initialize,
        updateNow,
        updateIgc,
        clearIgc,
        syncFromPilotNetwork,
        getState: () => ({
            now: nowBadge?.textContent || '',
            igc: igcBadge?.textContent || ''
        })
    });

    window.addEventListener('termika:igc-loaded', (event) => {
        updateIgc(event.detail?.metadata, event.detail?.points);
    });
    window.addEventListener('termika:igc-cleared', clearIgc);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }

    window.setInterval(() => {
        updateNow();
        syncFromPilotNetwork();
    }, 500);
})();

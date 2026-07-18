/* @cc-owned time-badges */
(() => {
    'use strict';

    if (window.TermikaTimeBadges) return;

    const MODULE_ID = 'time-badges';
    const TICK_MS = 500;
    const state = {
        installed: false,
        active: false,
        root: null,
        nowLine: null,
        igcLine: null,
        timer: null,
        lastNowText: '',
        lastIgcKey: '',
        igcSource: '',
        parserHooked: false
    };

    const pad = (value) => String(Math.trunc(Number(value) || 0)).padStart(2, '0');

    function formatLocalDateTime(date) {
        return `${pad(date.getDate())}. ${pad(date.getMonth() + 1)}. ${date.getFullYear()}: ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    function formatIgcTime(seconds) {
        const normalized = ((Math.trunc(Number(seconds) || 0) % 86400) + 86400) % 86400;
        return `${pad(Math.floor(normalized / 3600))}:${pad(Math.floor((normalized % 3600) / 60))}:${pad(normalized % 60)}`;
    }

    function formatIgcDate(value) {
        const text = String(value || '').trim();
        let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
        if (match) return `${match[3]}.${match[2]}. ${match[1]}`;

        match = /^(\d{2})\.(\d{2})\.\s*(\d{4})$/.exec(text);
        if (match) return `${match[1]}.${match[2]}. ${match[3]}`;

        return null;
    }

    function ensureView() {
        if (state.root?.isConnected) return state.root;

        const root = document.createElement('section');
        root.id = 'termikaTimeBadges';
        root.className = 'tx-time-badges';
        root.dataset.moduleId = MODULE_ID;
        root.setAttribute('aria-label', 'Časové značky pracoviska');

        const nowLine = document.createElement('div');
        nowLine.id = 'termikaNowTimeBadge';
        nowLine.className = 'tx-time-badges__line tx-time-badges__line--now';
        nowLine.setAttribute('aria-label', 'Aktuálny dátum a čas zariadenia');

        const igcLine = document.createElement('div');
        igcLine.id = 'termikaIgcTimeBadge';
        igcLine.className = 'tx-time-badges__line tx-time-badges__line--igc';
        igcLine.setAttribute('aria-label', 'Dátum letu, čas štartu a čas pristátia z IGC');
        igcLine.textContent = '';

        root.append(nowLine, igcLine);
        document.body.appendChild(root);

        state.root = root;
        state.nowLine = nowLine;
        state.igcLine = igcLine;
        return root;
    }

    function updatePosition() {
        const root = ensureView();
        const nav = document.getElementById('explorerNavShell') || document.getElementById('navShell');
        let top = 12;

        if (nav?.isConnected) {
            const dock = String(nav.dataset.dock || 'top').toLowerCase();
            if (dock === 'top' || dock === '') {
                const rect = nav.getBoundingClientRect();
                if (Number.isFinite(rect.bottom) && rect.bottom > 0) top = Math.round(rect.bottom + 8);
            }
        }

        root.style.setProperty('--tx-time-badges-top', `${top}px`);
    }

    function updateNow() {
        ensureView();
        const text = `NOW - ${formatLocalDateTime(new Date())}`;
        if (text !== state.lastNowText) {
            state.nowLine.textContent = text;
            state.lastNowText = text;
        }
        return text;
    }

    function clearIgc() {
        ensureView();
        state.igcLine.textContent = '';
        state.lastIgcKey = '';
        state.igcSource = '';
    }

    function updateIgc(metadata, points, options = {}) {
        ensureView();

        if (!Array.isArray(points) || points.length === 0) {
            clearIgc();
            return false;
        }

        const date = formatIgcDate(metadata?.flightDate);
        const first = points.find((point) => Number.isFinite(Number(point?.time_s)));
        const last = [...points].reverse().find((point) => Number.isFinite(Number(point?.time_s)));

        if (!first || !last) {
            clearIgc();
            return false;
        }

        const source = String(options.source || 'external');
        const dateText = date ? `${date}, ` : '';
        const key = `${date || ''}|${Number(first.time_s)}|${Number(last.time_s)}|${points.length}|${source}`;
        if (key === state.lastIgcKey && state.igcLine.textContent !== '') return true;

        state.igcLine.textContent = `IGC ${dateText}Štart - ${formatIgcTime(first.time_s)} - Pristátie: ${formatIgcTime(last.time_s)}`;
        state.lastIgcKey = key;
        state.igcSource = source;
        return true;
    }

    function syncIgcFromSharedState() {
        const network = window.PilotNetwork;
        if (!network) return false;

        if (Array.isArray(network.letoveBody) && network.letoveBody.length > 0) {
            return updateIgc(network.metadata || {}, network.letoveBody, { source: 'pilot-network' });
        }

        // Prázdny PilotNetwork smie vymazať iba značku, ktorú sám vytvoril.
        // Na testovacom pracovisku sa IGC načítava cez samostatný parser a
        // prázdny PilotNetwork nesmie každých 500 ms zmazať platný IGC riadok.
        if (state.igcSource === 'pilot-network') {
            clearIgc();
        }
        return false;
    }

    function hookSharedParser() {
        const parser = window.TermikaUxIgcParser;
        const current = parser?.parseBTrack;
        if (!parser || typeof current !== 'function') return false;

        if (current.__termikaTimeBadgesHooked === true) {
            state.parserHooked = true;
            return true;
        }

        const wrapped = function () {
            const parsed = current.apply(this, arguments);
            const points = Array.isArray(parsed?.body) ? parsed.body : [];
            if (points.length > 0) {
                updateIgc(parsed || {}, points, { source: 'igc-parser' });
            }
            return parsed;
        };

        Object.defineProperty(wrapped, '__termikaTimeBadgesHooked', {
            value: true,
            enumerable: false
        });
        Object.defineProperty(wrapped, '__termikaTimeBadgesOriginal', {
            value: current,
            enumerable: false
        });

        parser.parseBTrack = wrapped;
        state.parserHooked = true;
        return true;
    }

    function tick() {
        if (!state.active) return;
        updateNow();
        hookSharedParser();
        syncIgcFromSharedState();
        updatePosition();
    }

    function install() {
        if (state.installed) return true;
        ensureView();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('termika:igc-loaded', handleIgcLoaded);
        window.addEventListener('termika:igc-cleared', clearIgc);
        state.installed = true;
        hookSharedParser();
        return true;
    }

    function activate() {
        install();
        state.active = true;
        state.root.hidden = false;
        tick();
        if (!state.timer) state.timer = window.setInterval(tick, TICK_MS);
        return true;
    }

    function deactivate() {
        state.active = false;
        if (state.timer) {
            window.clearInterval(state.timer);
            state.timer = null;
        }
        if (state.root) state.root.hidden = true;
        return true;
    }

    function destroy() {
        deactivate();
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('termika:igc-loaded', handleIgcLoaded);
        window.removeEventListener('termika:igc-cleared', clearIgc);
        state.root?.remove();
        state.root = null;
        state.nowLine = null;
        state.igcLine = null;
        state.lastNowText = '';
        state.lastIgcKey = '';
        state.igcSource = '';
        state.installed = false;
        return true;
    }

    function handleIgcLoaded(event) {
        updateIgc(event.detail?.metadata || {}, event.detail?.points || [], { source: 'event' });
    }

    const api = Object.freeze({
        id: MODULE_ID,
        version: '1.0.1',
        install,
        activate,
        deactivate,
        destroy,
        updateNow,
        updateIgc,
        clearIgc,
        syncIgcFromSharedState,
        getState: () => ({
            installed: state.installed,
            active: state.active,
            now: state.nowLine?.textContent || '',
            igc: state.igcLine?.textContent || '',
            igcSource: state.igcSource,
            parserHooked: state.parserHooked
        })
    });

    window.TermikaTimeBadges = api;
    window.TermikaHostContext?.provide?.(MODULE_ID, api);

    const start = () => api.activate();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
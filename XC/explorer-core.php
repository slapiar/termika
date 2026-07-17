<?php
$configPath = __DIR__ . '/asset/config.php';

if (!is_file($configPath)) {
    http_response_code(500);
    header('Content-Type: text/html; charset=UTF-8');
    exit('TermikaXC Prieskumník: chýba asset/config.php.');
}

require_once $configPath;

if (!defined('CESIUM_ACCESS_TOKEN')) {
    http_response_code(500);
    exit('V asset/config.php chýba konštanta CESIUM_ACCESS_TOKEN.');
}

$assetVersion = '20260715-01';
$cesiumTokenJson = json_encode(CESIUM_ACCESS_TOKEN, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
?>
<!doctype html>
<html lang="sk">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#081018">
    <title>TermikaXC – Prieskumník preletu</title>

    <script src="https://cesium.com/downloads/cesiumjs/releases/1.143/Build/Cesium/Cesium.js"></script>
    <link rel="stylesheet" href="https://cesium.com/downloads/cesiumjs/releases/1.143/Build/Cesium/Widgets/widgets.css">
    <script src="ux/igc-parser.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>

    <style>
        :root {
            color-scheme: dark;
            --bg: #071019;
            --panel: rgba(10, 22, 32, 0.96);
            --panel-2: #101f2b;
            --line: #2a4557;
            --text: #edf7fb;
            --muted: #91a8b6;
            --cyan: #35d8ff;
            --orange: #ffad3b;
            --green: #56e39f;
            --red: #ff6376;
            --yellow: #ffe16a;
            --shadow: 0 18px 48px rgba(0, 0, 0, 0.42);
        }

        * { box-sizing: border-box; }

        html,
        body {
            width: 100%;
            height: 100%;
            margin: 0;
            overflow: hidden;
            background: var(--bg);
            color: var(--text);
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        button,
        input,
        select,
        textarea { font: inherit; }

        button,
        input,
        select {
            border: 1px solid var(--line);
            border-radius: 7px;
            background: #0d1a24;
            color: var(--text);
        }

        button {
            min-height: 34px;
            padding: 7px 10px;
            cursor: pointer;
            transition: 0.15s ease;
        }

        button:hover,
        button:focus-visible {
            border-color: var(--cyan);
            background: #132837;
            outline: none;
        }

        button.primary {
            border-color: #157e98;
            background: #103646;
            color: #dffaff;
        }

        button.primary.is-active {
            border-color: var(--cyan);
            background: #14546a;
            box-shadow: 0 0 0 1px rgba(53, 216, 255, 0.25) inset;
        }

        button.warn { border-color: #8e6920; }
        button.danger { border-color: #7b2e3b; }
        button.success { border-color: #247b56; background: #12382a; }

        input,
        select {
            width: 100%;
            min-height: 34px;
            padding: 7px 8px;
        }

        input:focus,
        select:focus {
            border-color: var(--cyan);
            outline: none;
            box-shadow: 0 0 0 2px rgba(53, 216, 255, 0.11);
        }

        input[type="checkbox"] {
            width: 17px;
            min-height: 17px;
            accent-color: var(--cyan);
        }

        #app {
            display: grid;
            grid-template-columns: minmax(330px, 390px) 1fr;
            width: 100%;
            height: 100%;
        }

        #sidebar {
            position: relative;
            z-index: 5;
            display: flex;
            flex-direction: column;
            min-width: 0;
            border-right: 1px solid var(--line);
            background: var(--panel);
            box-shadow: var(--shadow);
        }

        .brand {
            padding: 14px 16px 12px;
            border-bottom: 1px solid var(--line);
            background: linear-gradient(135deg, rgba(19, 57, 76, 0.96), rgba(9, 21, 31, 0.98));
        }

        .brand-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }

        .brand h1 {
            margin: 0;
            font-size: 18px;
            letter-spacing: 0.06em;
        }

        .brand h1 span { color: var(--cyan); }

        .brand p {
            margin: 5px 0 0;
            color: var(--muted);
            font-size: 12px;
            line-height: 1.35;
        }

        .back-link {
            color: #d6f8ff;
            font-size: 12px;
            text-decoration: none;
            white-space: nowrap;
        }

        .back-link:hover { color: var(--cyan); }

        #sidebarScroll {
            flex: 1;
            overflow: auto;
            scrollbar-width: thin;
            scrollbar-color: #35546a transparent;
        }

        .section {
            padding: 13px 14px;
            border-bottom: 1px solid rgba(42, 69, 87, 0.75);
        }

        .section h2 {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin: 0 0 10px;
            color: #dff8ff;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .section h2 small {
            color: var(--muted);
            font-size: 10px;
            font-weight: 500;
            letter-spacing: normal;
            text-transform: none;
        }

        .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }

        .grid-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }

        .field { min-width: 0; }

        .field label,
        .field-label {
            display: block;
            margin: 0 0 4px;
            color: var(--muted);
            font-size: 10px;
            letter-spacing: 0.03em;
        }

        .button-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 7px;
            margin-top: 8px;
        }

        .button-row.three { grid-template-columns: repeat(3, 1fr); }

        .check-row {
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 34px;
            color: var(--text);
            font-size: 12px;
        }

        .hint {
            margin: 8px 0 0;
            color: var(--muted);
            font-size: 11px;
            line-height: 1.4;
        }

        .hint strong { color: var(--yellow); }

        .status {
            margin-top: 8px;
            padding: 8px 9px;
            border: 1px solid #284355;
            border-radius: 7px;
            background: #0a1721;
            color: #cbe7f1;
            font-size: 11px;
            line-height: 1.4;
        }

        .status[data-kind="ok"] { border-color: #286b51; color: #bff7db; }
        .status[data-kind="warn"] { border-color: #8b6824; color: #ffe7a4; }
        .status[data-kind="error"] { border-color: #833244; color: #ffc2ca; }

        #pointList {
            display: grid;
            gap: 8px;
        }

        .point-card {
            display: grid;
            grid-template-columns: 28px minmax(0, 1fr) auto;
            gap: 8px;
            align-items: start;
            padding: 8px;
            border: 1px solid #294354;
            border-radius: 8px;
            background: #0b1822;
        }

        .point-index {
            display: grid;
            place-items: center;
            width: 28px;
            height: 28px;
            border: 1px solid #2f8aa4;
            border-radius: 50%;
            color: var(--cyan);
            font-size: 11px;
            font-weight: 800;
        }

        .point-main {
            display: grid;
            gap: 6px;
            min-width: 0;
        }

        .point-main .point-name { font-size: 12px; font-weight: 700; }

        .point-meta {
            color: var(--muted);
            font-size: 10px;
            font-variant-numeric: tabular-nums;
        }

        .point-edit-grid {
            display: grid;
            grid-template-columns: 1fr 88px;
            gap: 6px;
        }

        .point-edit-grid input { min-height: 30px; padding: 5px 7px; font-size: 11px; }

        .point-actions {
            display: grid;
            grid-template-columns: 28px 28px;
            gap: 4px;
        }

        .point-actions button {
            min-width: 28px;
            min-height: 28px;
            padding: 0;
            font-size: 12px;
        }

        .empty-state {
            padding: 14px 10px;
            border: 1px dashed #345267;
            border-radius: 8px;
            color: var(--muted);
            text-align: center;
            font-size: 11px;
            line-height: 1.45;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 7px;
        }

        .summary-item {
            padding: 8px 6px;
            border: 1px solid #294354;
            border-radius: 7px;
            background: #0a1721;
            text-align: center;
        }

        .summary-item strong {
            display: block;
            color: var(--cyan);
            font-size: 14px;
            font-variant-numeric: tabular-nums;
        }

        .summary-item span { color: var(--muted); font-size: 9px; }

        .footer-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 7px;
            padding: 12px 14px;
            border-top: 1px solid var(--line);
            background: #09151f;
        }

        #mapWrap { position: relative; min-width: 0; }
        #cesiumContainer { position: absolute; inset: 0; }

        #mapOverlay {
            position: absolute;
            z-index: 3;
            top: 12px;
            left: 12px;
            right: 12px;
            display: flex;
            justify-content: space-between;
            gap: 10px;
            pointer-events: none;
        }

        .map-chip {
            max-width: min(680px, 70vw);
            padding: 8px 10px;
            border: 1px solid rgba(66, 107, 130, 0.9);
            border-radius: 8px;
            background: rgba(7, 17, 25, 0.86);
            box-shadow: 0 8px 26px rgba(0, 0, 0, 0.28);
            color: #d8edf5;
            font-size: 11px;
            line-height: 1.35;
            backdrop-filter: blur(8px);
        }

        .map-chip strong { color: var(--cyan); }

        #modeChip[data-mode="turnpoint"] strong { color: var(--cyan); }
        #modeChip[data-mode="start"] strong { color: var(--yellow); }
        #modeChip[data-mode="idle"] strong { color: var(--muted); }

        #coordinateChip {
            margin-left: auto;
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
        }

        .cesium-viewer-bottom,
        .cesium-widget-credits { display: none !important; }

        .mobile-toggle { display: none; }

        @media (max-width: 820px) {
            #app { grid-template-columns: 1fr; }

            #sidebar {
                position: absolute;
                z-index: 10;
                inset: 0 auto 0 0;
                width: min(92vw, 390px);
                transform: translateX(-100%);
                transition: transform 0.2s ease;
            }

            #sidebar.is-open { transform: translateX(0); }

            .mobile-toggle {
                position: absolute;
                z-index: 11;
                top: 12px;
                left: 12px;
                display: block;
                width: 42px;
                height: 42px;
                padding: 0;
                background: rgba(9, 25, 36, 0.94);
                box-shadow: var(--shadow);
            }

            #mapOverlay { left: 64px; }
            #coordinateChip { display: none; }
        }
    </style>
</head>
<body>
<div id="app">
    <aside id="sidebar" aria-label="Plánovač preletu">
        <header class="brand">
            <div class="brand-top">
                <h1><span>PRIESKUMNÍK</span> · TermikaXC</h1>
                <a class="back-link" href="index.php">← 3D let</a>
            </div>
            <p>Nacvakaj trasu, nastav súťažnú štartovú pásku a vytvor plánovací súbor IGC.</p>
        </header>

        <div id="sidebarScroll">
            <section class="section">
                <h2>Úloha <small>základné údaje</small></h2>
                <div class="field">
                    <label for="taskName">Názov preletu alebo úlohy</label>
                    <input id="taskName" type="text" value="Nový prelet" maxlength="80">
                </div>
                <div class="grid-2" style="margin-top:8px">
                    <div class="field">
                        <label for="pilotName">Pilot</label>
                        <input id="pilotName" type="text" placeholder="Meno pilota" maxlength="80">
                    </div>
                    <div class="field">
                        <label for="flightDate">Dátum letu</label>
                        <input id="flightDate" type="date">
                    </div>
                </div>
                <div class="grid-2" style="margin-top:8px">
                    <div class="field">
                        <label for="defaultRadius">Predvolený polomer valca</label>
                        <input id="defaultRadius" type="number" min="10" max="100000" step="10" value="400">
                    </div>
                    <div class="field">
                        <label for="closedTask">Typ trasy</label>
                        <label class="check-row" for="closedTask">
                            <input id="closedTask" type="checkbox">
                            Uzavrieť posledný bod na prvý
                        </label>
                    </div>
                </div>
            </section>

            <section class="section">
                <h2>Otočné body <small>klikaj do mapy</small></h2>
                <div class="button-row">
                    <button id="addPointsButton" class="primary" type="button">＋ Nacvakávať body</button>
                    <button id="undoPointButton" type="button">↶ Späť bod</button>
                </div>
                <div class="button-row">
                    <button id="focusTaskButton" type="button">⌖ Zamerať úlohu</button>
                    <button id="clearPointsButton" class="danger" type="button">× Vymazať body</button>
                </div>
                <p class="hint">V režime nacvakávania pridá ľavý klik nový otočný bod. Polohu môžeš neskôr upraviť opätovným nacvaknutím po vymazaní bodu.</p>
            </section>

            <section class="section">
                <h2>Štartová páska <small>voliteľná súťažná podmienka</small></h2>
                <label class="check-row" for="startEnabled">
                    <input id="startEnabled" type="checkbox">
                    Použiť presnú štartovú čiaru
                </label>
                <div class="grid-2" style="margin-top:7px">
                    <div class="field">
                        <label for="startLength">Dĺžka pásky [m]</label>
                        <input id="startLength" type="number" min="50" max="50000" step="50" value="1000">
                    </div>
                    <div class="field">
                        <label for="startAltitude">Predpísaná výška AMSL [m]</label>
                        <input id="startAltitude" type="number" min="0" max="10000" step="10" value="1200">
                    </div>
                </div>
                <div class="grid-2" style="margin-top:8px">
                    <div class="field">
                        <label for="startTolerance">Výšková tolerancia ± [m]</label>
                        <input id="startTolerance" type="number" min="0" max="2000" step="10" value="50">
                    </div>
                    <div class="field">
                        <label for="startCourseMode">Smer po prelete pásky</label>
                        <select id="startCourseMode">
                            <option value="first">Automaticky k prvému TP</option>
                            <option value="manual">Ručný kurz</option>
                        </select>
                    </div>
                </div>
                <div id="manualHeadingField" class="field" style="margin-top:8px" hidden>
                    <label for="startHeading">Ručný kurz k trati [°]</label>
                    <input id="startHeading" type="number" min="0" max="359.9" step="0.1" value="0">
                </div>
                <div class="button-row">
                    <button id="placeStartButton" class="warn" type="button">⌖ Umiestniť stred pásky</button>
                    <button id="clearStartButton" type="button">× Zrušiť polohu</button>
                </div>
                <p class="hint"><strong>Páska sa kreslí kolmo na smer trate.</strong> Žltá šípka ukazuje povolený smer jej nadletenia k najbližšiemu otočnému bodu.</p>
            </section>

            <section class="section">
                <h2>Zoznam bodov <small id="pointCountLabel">0 bodov</small></h2>
                <div id="pointList"></div>
            </section>

            <section class="section">
                <h2>Súhrn <small>živý výpočet</small></h2>
                <div class="summary-grid">
                    <div class="summary-item"><strong id="summaryPoints">0</strong><span>OTOČNÉ BODY</span></div>
                    <div class="summary-item"><strong id="summaryDistance">0,0</strong><span>VZDIALENOSŤ KM</span></div>
                    <div class="summary-item"><strong id="summaryStart">NIE</strong><span>ŠTART PÁSKA</span></div>
                </div>
                <div id="statusBox" class="status" data-kind="info">Prieskumník je pripravený. Začni nacvakávať otočné body.</div>
            </section>
        </div>

        <footer class="footer-actions">
            <button id="saveJsonButton" type="button">↓ Záloha JSON</button>
            <button id="exportIgcButton" class="success" type="button">↓ Vytvoriť .IGC</button>
        </footer>
    </aside>

    <main id="mapWrap">
        <button id="mobileToggle" class="mobile-toggle" type="button" aria-label="Otvoriť plánovač">☰</button>
        <div id="cesiumContainer" aria-label="3D mapa plánovaného preletu"></div>
        <div id="mapOverlay" aria-hidden="true">
            <div id="modeChip" class="map-chip" data-mode="idle"><strong>REŽIM:</strong> voľná mapa</div>
            <div id="coordinateChip" class="map-chip">49.00000° N · 19.50000° E</div>
        </div>
    </main>
</div>

<script>
'use strict';

window.CESIUM_BASE_URL = 'https://cesium.com/downloads/cesiumjs/releases/1.143/Build/Cesium/';
Cesium.Ion.defaultAccessToken = <?php echo $cesiumTokenJson; ?>;

const STORAGE_KEY = 'termikaXC.explorer.task.v1';
const DEFAULT_CENTER = { lat: 48.95, lon: 19.35, height: 260000 };

const state = {
    mode: 'idle',
    points: [],
    start: {
        enabled: false,
        center: null,
        length: 1000,
        altitude: 1200,
        tolerance: 50,
        courseMode: 'first',
        manualHeading: 0
    },
    entities: []
};

const el = (id) => document.getElementById(id);
const ui = {
    sidebar: el('sidebar'),
    taskName: el('taskName'),
    pilotName: el('pilotName'),
    flightDate: el('flightDate'),
    defaultRadius: el('defaultRadius'),
    closedTask: el('closedTask'),
    addPointsButton: el('addPointsButton'),
    undoPointButton: el('undoPointButton'),
    focusTaskButton: el('focusTaskButton'),
    clearPointsButton: el('clearPointsButton'),
    startEnabled: el('startEnabled'),
    startLength: el('startLength'),
    startAltitude: el('startAltitude'),
    startTolerance: el('startTolerance'),
    startCourseMode: el('startCourseMode'),
    manualHeadingField: el('manualHeadingField'),
    startHeading: el('startHeading'),
    placeStartButton: el('placeStartButton'),
    clearStartButton: el('clearStartButton'),
    pointList: el('pointList'),
    pointCountLabel: el('pointCountLabel'),
    summaryPoints: el('summaryPoints'),
    summaryDistance: el('summaryDistance'),
    summaryStart: el('summaryStart'),
    statusBox: el('statusBox'),
    exportIgcButton: el('exportIgcButton'),
    saveJsonButton: el('saveJsonButton'),
    modeChip: el('modeChip'),
    coordinateChip: el('coordinateChip'),
    mobileToggle: el('mobileToggle')
};

ui.flightDate.value = new Date().toISOString().slice(0, 10);

let viewer;
let clickHandler;
let moveHandler;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function numberValue(input, fallback, min = -Infinity, max = Infinity) {
    const value = Number(input.value);
    return Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

function setStatus(message, kind = 'info') {
    ui.statusBox.textContent = message;
    ui.statusBox.dataset.kind = kind;
}

function setMode(mode) {
    state.mode = mode;
    ui.addPointsButton.classList.toggle('is-active', mode === 'turnpoint');
    ui.placeStartButton.classList.toggle('is-active', mode === 'start');
    ui.modeChip.dataset.mode = mode;

    if (mode === 'turnpoint') {
        ui.modeChip.innerHTML = '<strong>REŽIM:</strong> kliknutím pridávaš otočné body';
        setStatus('Klikaj do mapy v poradí plánovaného letu. Každý klik vytvorí nový otočný bod.', 'ok');
    } else if (mode === 'start') {
        ui.modeChip.innerHTML = '<strong>REŽIM:</strong> kliknutím umiestniš stred štartovej pásky';
        setStatus('Klikni na presný stred štartovej pásky. Jej smer sa dopočíta podľa trate.', 'warn');
    } else {
        ui.modeChip.innerHTML = '<strong>REŽIM:</strong> voľná mapa';
    }
}

function sanitizeName(value, fallback = 'BOD') {
    const text = String(value || '').trim();
    return text || fallback;
}

function asciiText(value, maxLength = 24) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9 _.,+\-]/g, '')
        .trim()
        .toUpperCase()
        .slice(0, maxLength);
}

function formatNumberSk(value, decimals = 1) {
    return Number(value).toLocaleString('sk-SK', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function rad(value) { return value * Math.PI / 180; }
function deg(value) { return value * 180 / Math.PI; }

function haversineMeters(a, b) {
    const R = 6371008.8;
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const lat1 = rad(a.lat);
    const lat2 = rad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function bearingDegrees(a, b) {
    const lat1 = rad(a.lat);
    const lat2 = rad(b.lat);
    const dLon = rad(b.lon - a.lon);
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (deg(Math.atan2(y, x)) + 360) % 360;
}

function destinationPoint(origin, bearing, distanceMeters) {
    const R = 6371008.8;
    const angular = distanceMeters / R;
    const theta = rad(bearing);
    const lat1 = rad(origin.lat);
    const lon1 = rad(origin.lon);
    const sinLat2 = Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(theta);
    const lat2 = Math.asin(clamp(sinLat2, -1, 1));
    const lon2 = lon1 + Math.atan2(
        Math.sin(theta) * Math.sin(angular) * Math.cos(lat1),
        Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2)
    );
    return { lat: deg(lat2), lon: ((deg(lon2) + 540) % 360) - 180 };
}

function currentStartHeading() {
    if (state.start.courseMode === 'manual') {
        return ((Number(state.start.manualHeading) % 360) + 360) % 360;
    }
    if (state.start.center && state.points.length) {
        return bearingDegrees(state.start.center, state.points[0]);
    }
    return 0;
}

function startLineGeometry() {
    if (!state.start.enabled || !state.start.center) return null;
    const heading = currentStartHeading();
    const halfLength = Math.max(25, state.start.length / 2);
    const left = destinationPoint(state.start.center, heading - 90, halfLength);
    const right = destinationPoint(state.start.center, heading + 90, halfLength);
    const arrowEnd = destinationPoint(state.start.center, heading, Math.max(250, Math.min(1500, state.start.length * 0.55)));
    return { heading, left, right, arrowEnd };
}

function getTaskDistanceMeters() {
    let total = 0;
    if (state.start.enabled && state.start.center && state.points.length) {
        total += haversineMeters(state.start.center, state.points[0]);
    }
    for (let i = 1; i < state.points.length; i += 1) {
        total += haversineMeters(state.points[i - 1], state.points[i]);
    }
    if (ui.closedTask.checked && state.points.length > 1) {
        total += haversineMeters(state.points[state.points.length - 1], state.points[0]);
    }
    return total;
}

function pointLabel(index, point) {
    return `${index + 1}. ${sanitizeName(point.name, `TP${index + 1}`)}`;
}

function clearTaskEntities() {
    state.entities.forEach((entity) => viewer.entities.remove(entity));
    state.entities = [];
}

function addEntity(definition) {
    const entity = viewer.entities.add(definition);
    state.entities.push(entity);
    return entity;
}

function renderMap() {
    if (!viewer) return;
    clearTaskEntities();

    const routePositions = [];
    if (state.start.enabled && state.start.center && state.points.length) {
        routePositions.push(Cesium.Cartesian3.fromDegrees(state.start.center.lon, state.start.center.lat, 0));
    }
    state.points.forEach((point) => routePositions.push(Cesium.Cartesian3.fromDegrees(point.lon, point.lat, 0)));
    if (ui.closedTask.checked && state.points.length > 1) {
        routePositions.push(Cesium.Cartesian3.fromDegrees(state.points[0].lon, state.points[0].lat, 0));
    }

    if (routePositions.length >= 2) {
        addEntity({
            name: 'Plánovaná trať',
            polyline: {
                positions: routePositions,
                width: 4,
                clampToGround: true,
                material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: 0.16,
                    color: Cesium.Color.fromCssColorString('#35d8ff')
                })
            }
        });
    }

    state.points.forEach((point, index) => {
        const position = Cesium.Cartesian3.fromDegrees(point.lon, point.lat, 0);
        addEntity({
            name: pointLabel(index, point),
            position,
            point: {
                pixelSize: 12,
                color: Cesium.Color.fromCssColorString('#35d8ff'),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            label: {
                text: pointLabel(index, point),
                font: '700 13px system-ui',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 4,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -24),
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });

        addEntity({
            name: `${pointLabel(index, point)} – valec`,
            position,
            ellipse: {
                semiMajorAxis: point.radius,
                semiMinorAxis: point.radius,
                material: Cesium.Color.fromCssColorString('#35d8ff').withAlpha(0.11),
                outline: true,
                outlineColor: Cesium.Color.fromCssColorString('#35d8ff').withAlpha(0.85),
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            }
        });
    });

    const geometry = startLineGeometry();
    if (geometry) {
        const altitude = state.start.altitude;
        const startPositions = [
            Cesium.Cartesian3.fromDegrees(geometry.left.lon, geometry.left.lat, altitude),
            Cesium.Cartesian3.fromDegrees(geometry.right.lon, geometry.right.lat, altitude)
        ];
        const centerPosition = Cesium.Cartesian3.fromDegrees(state.start.center.lon, state.start.center.lat, altitude);
        const arrowEnd = Cesium.Cartesian3.fromDegrees(geometry.arrowEnd.lon, geometry.arrowEnd.lat, altitude);

        addEntity({
            name: 'Štartová páska',
            polyline: {
                positions: startPositions,
                width: 7,
                material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: 0.28,
                    color: Cesium.Color.fromCssColorString('#ffe16a')
                }),
                arcType: Cesium.ArcType.GEODESIC
            }
        });

        addEntity({
            name: 'Smer preletu štartovej pásky',
            polyline: {
                positions: [centerPosition, arrowEnd],
                width: 8,
                material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString('#ffad3b')),
                arcType: Cesium.ArcType.GEODESIC
            }
        });

        addEntity({
            name: 'Stred štartovej pásky',
            position: centerPosition,
            point: {
                pixelSize: 13,
                color: Cesium.Color.fromCssColorString('#ffe16a'),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            label: {
                text: `ŠTART ${Math.round(altitude)} m AMSL\nkurz ${geometry.heading.toFixed(1)}° · ±${Math.round(state.start.tolerance)} m`,
                font: '700 13px system-ui',
                fillColor: Cesium.Color.fromCssColorString('#fff4b2'),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 4,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -34),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });

        [geometry.left, geometry.right].forEach((endpoint) => {
            addEntity({
                polyline: {
                    positions: [
                        Cesium.Cartesian3.fromDegrees(endpoint.lon, endpoint.lat, 0),
                        Cesium.Cartesian3.fromDegrees(endpoint.lon, endpoint.lat, altitude)
                    ],
                    width: 1.5,
                    material: Cesium.Color.fromCssColorString('#ffe16a').withAlpha(0.5)
                }
            });
        });
    }
}

function renderPointList() {
    ui.pointCountLabel.textContent = `${state.points.length} ${state.points.length === 1 ? 'bod' : (state.points.length >= 2 && state.points.length <= 4 ? 'body' : 'bodov')}`;

    if (!state.points.length) {
        ui.pointList.innerHTML = '<div class="empty-state">Zatiaľ tu nie je žiadny otočný bod.<br>Zapni režim „Nacvakávať body“ a klikni do mapy.</div>';
        return;
    }

    ui.pointList.innerHTML = '';
    state.points.forEach((point, index) => {
        const card = document.createElement('article');
        card.className = 'point-card';
        card.innerHTML = `
            <div class="point-index">${index + 1}</div>
            <div class="point-main">
                <div class="point-name">${escapeHtml(sanitizeName(point.name, `TP${index + 1}`))}</div>
                <div class="point-meta">${point.lat.toFixed(5)}° · ${point.lon.toFixed(5)}°</div>
                <div class="point-edit-grid">
                    <input type="text" value="${escapeAttribute(point.name)}" maxlength="40" aria-label="Názov bodu ${index + 1}" data-point-name="${index}">
                    <input type="number" value="${Math.round(point.radius)}" min="10" max="100000" step="10" aria-label="Polomer bodu ${index + 1}" data-point-radius="${index}">
                </div>
            </div>
            <div class="point-actions">
                <button type="button" title="Posunúť vyššie" data-point-up="${index}" ${index === 0 ? 'disabled' : ''}>↑</button>
                <button type="button" title="Posunúť nižšie" data-point-down="${index}" ${index === state.points.length - 1 ? 'disabled' : ''}>↓</button>
                <button type="button" title="Zamerať bod" data-point-focus="${index}">⌖</button>
                <button type="button" title="Vymazať bod" data-point-delete="${index}">×</button>
            </div>
        `;
        ui.pointList.appendChild(card);
    });
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
}

function updateSummary() {
    ui.summaryPoints.textContent = String(state.points.length);
    ui.summaryDistance.textContent = formatNumberSk(getTaskDistanceMeters() / 1000, 1);
    ui.summaryStart.textContent = state.start.enabled && state.start.center ? 'ÁNO' : 'NIE';
}

function syncStateFromInputs() {
    state.start.enabled = ui.startEnabled.checked;
    state.start.length = numberValue(ui.startLength, 1000, 50, 50000);
    state.start.altitude = numberValue(ui.startAltitude, 1200, 0, 10000);
    state.start.tolerance = numberValue(ui.startTolerance, 50, 0, 2000);
    state.start.courseMode = ui.startCourseMode.value === 'manual' ? 'manual' : 'first';
    state.start.manualHeading = numberValue(ui.startHeading, 0, 0, 359.9);
    ui.manualHeadingField.hidden = state.start.courseMode !== 'manual';
}

function persist() {
    syncStateFromInputs();
    const payload = {
        version: 1,
        savedAt: new Date().toISOString(),
        task: {
            name: ui.taskName.value,
            pilot: ui.pilotName.value,
            flightDate: ui.flightDate.value,
            defaultRadius: numberValue(ui.defaultRadius, 400, 10, 100000),
            closed: ui.closedTask.checked
        },
        points: state.points,
        start: state.start
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function refresh({ save = true } = {}) {
    syncStateFromInputs();
    renderPointList();
    renderMap();
    updateSummary();
    if (save) persist();
}

function restore() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.points)) return false;

        ui.taskName.value = data.task?.name || 'Nový prelet';
        ui.pilotName.value = data.task?.pilot || '';
        ui.flightDate.value = data.task?.flightDate || new Date().toISOString().slice(0, 10);
        ui.defaultRadius.value = Number(data.task?.defaultRadius) || 400;
        ui.closedTask.checked = Boolean(data.task?.closed);

        state.points = data.points
            .filter((point) => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon)))
            .map((point, index) => ({
                id: point.id || cryptoId(),
                name: sanitizeName(point.name, `TP${index + 1}`),
                lat: Number(point.lat),
                lon: Number(point.lon),
                radius: clamp(Number(point.radius) || 400, 10, 100000)
            }));

        if (data.start && typeof data.start === 'object') {
            state.start = {
                enabled: Boolean(data.start.enabled),
                center: data.start.center && Number.isFinite(Number(data.start.center.lat)) && Number.isFinite(Number(data.start.center.lon))
                    ? { lat: Number(data.start.center.lat), lon: Number(data.start.center.lon) }
                    : null,
                length: clamp(Number(data.start.length) || 1000, 50, 50000),
                altitude: clamp(Number(data.start.altitude) || 1200, 0, 10000),
                tolerance: clamp(Number(data.start.tolerance) || 50, 0, 2000),
                courseMode: data.start.courseMode === 'manual' ? 'manual' : 'first',
                manualHeading: clamp(Number(data.start.manualHeading) || 0, 0, 359.9)
            };
        }

        ui.startEnabled.checked = state.start.enabled;
        ui.startLength.value = state.start.length;
        ui.startAltitude.value = state.start.altitude;
        ui.startTolerance.value = state.start.tolerance;
        ui.startCourseMode.value = state.start.courseMode;
        ui.startHeading.value = state.start.manualHeading;
        return true;
    } catch (error) {
        console.warn('Obnova konceptu zlyhala:', error);
        return false;
    }
}

function cryptoId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function pickMapPosition(screenPosition) {
    const ray = viewer.camera.getPickRay(screenPosition);
    if (!ray) return null;
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
    if (!cartesian) return null;
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    return {
        lat: Cesium.Math.toDegrees(cartographic.latitude),
        lon: Cesium.Math.toDegrees(cartographic.longitude)
    };
}

function addPoint(position) {
    const radius = numberValue(ui.defaultRadius, 400, 10, 100000);
    const index = state.points.length + 1;
    state.points.push({
        id: cryptoId(),
        name: `TP${index}`,
        lat: position.lat,
        lon: position.lon,
        radius
    });
    refresh();
    setStatus(`Pridaný bod TP${index}. Pokračuj ďalším klikom alebo režim vypni.`, 'ok');
}

function placeStart(position) {
    state.start.center = { lat: position.lat, lon: position.lon };
    ui.startEnabled.checked = true;
    state.start.enabled = true;
    setMode('idle');
    refresh();
    if (state.points.length) {
        setStatus(`Štartová páska je umiestnená. Smer trate je ${currentStartHeading().toFixed(1)}°.`, 'ok');
    } else {
        setStatus('Štartová páska je umiestnená. Po pridaní prvého TP sa automaticky natočí kolmo na smer trate.', 'warn');
    }
}

function focusTask() {
    if (!state.entities.length) {
        setStatus('Najprv pridaj aspoň jeden bod alebo umiestni štartovú pásku.', 'warn');
        return;
    }
    viewer.flyTo(state.entities, { duration: 1.2 });
}

function focusPoint(index) {
    const point = state.points[index];
    if (!point) return;
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(point.lon, point.lat, Math.max(2500, point.radius * 5)),
        duration: 0.9
    });
}

function movePoint(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= state.points.length) return;
    [state.points[index], state.points[target]] = [state.points[target], state.points[index]];
    refresh();
}

function removePoint(index) {
    if (index < 0 || index >= state.points.length) return;
    state.points.splice(index, 1);
    refresh();
    setStatus('Otočný bod bol odstránený.', 'info');
}

function taskPayload() {
    syncStateFromInputs();
    return {
        format: 'TermikaXC Explorer Task',
        version: 1,
        exportedAtUtc: new Date().toISOString(),
        task: {
            name: sanitizeName(ui.taskName.value, 'Nový prelet'),
            pilot: sanitizeName(ui.pilotName.value, ''),
            flightDate: ui.flightDate.value || new Date().toISOString().slice(0, 10),
            closed: ui.closedTask.checked,
            distanceMeters: Math.round(getTaskDistanceMeters())
        },
        start: {
            ...state.start,
            heading: currentStartHeading(),
            geometry: startLineGeometry()
        },
        points: state.points.map((point, index) => ({ ...point, order: index + 1 }))
    };
}

function downloadText(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(value, extension) {
    const base = asciiText(value, 60)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'termika-task';
    return `${base}.${extension}`;
}

function pad(value, length) {
    return String(value).padStart(length, '0');
}

function formatIgcCoordinate(value, isLat) {
    const hemisphere = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    const absolute = Math.abs(value);
    let degreesPart = Math.floor(absolute);
    let minuteThousandths = Math.round((absolute - degreesPart) * 60 * 1000);
    if (minuteThousandths >= 60000) {
        degreesPart += 1;
        minuteThousandths = 0;
    }
    const degreeDigits = isLat ? 2 : 3;
    return `${pad(degreesPart, degreeDigits)}${pad(minuteThousandths, 5)}${hemisphere}`;
}

function formatIgcPoint(point, name) {
    return `C${formatIgcCoordinate(point.lat, true)}${formatIgcCoordinate(point.lon, false)}${asciiText(name, 24)}`;
}

function ymdToDmy(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) {
        const now = new Date();
        return `${pad(now.getUTCDate(), 2)}${pad(now.getUTCMonth() + 1, 2)}${pad(now.getUTCFullYear() % 100, 2)}`;
    }
    return `${match[3]}${match[2]}${match[1].slice(2)}`;
}

function buildIgc() {
    if (!state.points.length) {
        throw new Error('Úloha nemá ani jeden otočný bod.');
    }
    syncStateFromInputs();
    if (state.start.enabled && !state.start.center) {
        throw new Error('Štartová páska je zapnutá, ale nemá umiestnený stred.');
    }

    const now = new Date();
    const declarationDate = `${pad(now.getUTCDate(), 2)}${pad(now.getUTCMonth() + 1, 2)}${pad(now.getUTCFullYear() % 100, 2)}`;
    const declarationTime = `${pad(now.getUTCHours(), 2)}${pad(now.getUTCMinutes(), 2)}${pad(now.getUTCSeconds(), 2)}`;
    const flightDate = ymdToDmy(ui.flightDate.value);
    const taskName = asciiText(ui.taskName.value || 'TERMIKA TASK', 24);
    const pilot = asciiText(ui.pilotName.value || 'NOT SET', 48);

    const declaredPoints = [];
    if (state.start.enabled && state.start.center) {
        declaredPoints.push({ point: state.start.center, name: 'START LINE CENTER' });
    }
    state.points.forEach((point, index) => {
        declaredPoints.push({ point, name: sanitizeName(point.name, `TP${index + 1}`) });
    });
    if (ui.closedTask.checked && state.points.length > 1) {
        declaredPoints.push({ point: state.points[0], name: 'FINISH' });
    }

    const lines = [
        'AXCETASK',
        `HFDTE${flightDate}`,
        `HFPLTPILOTINCHARGE:${pilot}`,
        'HFGTYGLIDERTYPE:PLANNED TASK',
        'HFFTYFRTYPE:TERMIKAXC EXPLORER',
        'HFDTM100GPSDATUM:WGS-1984',
        `LXCETASK:${taskName}`,
        'LXCENOTE:PLANNING DECLARATION - NOT A SIGNED FLIGHT RECORD',
        `C${declarationDate}${declarationTime}${flightDate}0001${pad(declaredPoints.length, 2)}${taskName}`
    ];

    declaredPoints.forEach(({ point, name }) => lines.push(formatIgcPoint(point, name)));

    state.points.forEach((point, index) => {
        lines.push(`LXCETP:${pad(index + 1, 2)};RADIUS_M=${Math.round(point.radius)};NAME=${asciiText(point.name, 24)}`);
    });

    if (state.start.enabled && state.start.center) {
        const geometry = startLineGeometry();
        lines.push(`LXCESTART:CENTER=${state.start.center.lat.toFixed(7)},${state.start.center.lon.toFixed(7)};LENGTH_M=${Math.round(state.start.length)};ALT_AMSL_M=${Math.round(state.start.altitude)};TOLERANCE_M=${Math.round(state.start.tolerance)};COURSE_DEG=${geometry.heading.toFixed(1)}`);
        lines.push(`LXCESTARTLEFT:${geometry.left.lat.toFixed(7)},${geometry.left.lon.toFixed(7)}`);
        lines.push(`LXCESTARTRIGHT:${geometry.right.lat.toFixed(7)},${geometry.right.lon.toFixed(7)}`);
    }

    lines.push(`LXCEDISTANCE_M:${Math.round(getTaskDistanceMeters())}`);
    lines.push(`LXCECLOSED:${ui.closedTask.checked ? 'YES' : 'NO'}`);
    return `${lines.join('\r\n')}\r\n`;
}

async function createViewer() {
    let terrainProvider;
    try {
        terrainProvider = await Cesium.createWorldTerrainAsync();
    } catch (error) {
        console.warn('World Terrain nie je dostupný, používam elipsoid:', error);
        terrainProvider = new Cesium.EllipsoidTerrainProvider();
    }

    viewer = new Cesium.Viewer('cesiumContainer', {
        terrainProvider,
        animation: false,
        timeline: false,
        baseLayerPicker: true,
        geocoder: true,
        homeButton: false,
        sceneModePicker: true,
        navigationHelpButton: false,
        fullscreenButton: true,
        infoBox: true,
        selectionIndicator: true,
        shouldAnimate: false
    });

    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.globe.enableLighting = true;
    viewer.scene.fog.enabled = true;

    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(DEFAULT_CENTER.lon, DEFAULT_CENTER.lat, DEFAULT_CENTER.height),
        orientation: {
            heading: 0,
            pitch: Cesium.Math.toRadians(-58),
            roll: 0
        }
    });

    clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    clickHandler.setInputAction((movement) => {
        if (state.mode === 'idle') return;
        const position = pickMapPosition(movement.position);
        if (!position) {
            setStatus('Na tomto mieste sa nepodarilo určiť polohu na zemskom povrchu.', 'error');
            return;
        }
        if (state.mode === 'turnpoint') addPoint(position);
        if (state.mode === 'start') placeStart(position);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    moveHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    moveHandler.setInputAction((movement) => {
        const position = pickMapPosition(movement.endPosition);
        if (!position) return;
        ui.coordinateChip.textContent = `${position.lat.toFixed(5)}° ${position.lat >= 0 ? 'N' : 'S'} · ${Math.abs(position.lon).toFixed(5)}° ${position.lon >= 0 ? 'E' : 'W'}`;
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
}

function bindUi() {
    ui.addPointsButton.addEventListener('click', () => setMode(state.mode === 'turnpoint' ? 'idle' : 'turnpoint'));
    ui.placeStartButton.addEventListener('click', () => {
        ui.startEnabled.checked = true;
        state.start.enabled = true;
        setMode(state.mode === 'start' ? 'idle' : 'start');
        refresh();
    });

    ui.undoPointButton.addEventListener('click', () => {
        if (!state.points.length) return setStatus('Nie je čo vrátiť späť.', 'warn');
        state.points.pop();
        refresh();
        setStatus('Posledný otočný bod bol odobratý.', 'info');
    });

    ui.clearPointsButton.addEventListener('click', () => {
        if (!state.points.length) return;
        if (!window.confirm('Naozaj vymazať všetky otočné body?')) return;
        state.points = [];
        refresh();
        setStatus('Všetky otočné body boli vymazané.', 'info');
    });

    ui.clearStartButton.addEventListener('click', () => {
        state.start.center = null;
        ui.startEnabled.checked = false;
        state.start.enabled = false;
        setMode('idle');
        refresh();
        setStatus('Poloha štartovej pásky bola zrušená.', 'info');
    });

    ui.focusTaskButton.addEventListener('click', focusTask);

    [
        ui.taskName, ui.pilotName, ui.flightDate, ui.defaultRadius, ui.closedTask,
        ui.startEnabled, ui.startLength, ui.startAltitude, ui.startTolerance,
        ui.startCourseMode, ui.startHeading
    ].forEach((input) => {
        input.addEventListener('input', () => refresh());
        input.addEventListener('change', () => refresh());
    });

    ui.pointList.addEventListener('input', (event) => {
        const nameIndex = event.target.dataset.pointName;
        const radiusIndex = event.target.dataset.pointRadius;
        if (nameIndex !== undefined) {
            const point = state.points[Number(nameIndex)];
            if (point) point.name = event.target.value;
        }
        if (radiusIndex !== undefined) {
            const point = state.points[Number(radiusIndex)];
            if (point) point.radius = clamp(Number(event.target.value) || 400, 10, 100000);
        }
        renderMap();
        updateSummary();
        persist();
    });

    ui.pointList.addEventListener('change', () => renderPointList());

    ui.pointList.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.dataset.pointUp !== undefined) movePoint(Number(button.dataset.pointUp), -1);
        if (button.dataset.pointDown !== undefined) movePoint(Number(button.dataset.pointDown), 1);
        if (button.dataset.pointFocus !== undefined) focusPoint(Number(button.dataset.pointFocus));
        if (button.dataset.pointDelete !== undefined) removePoint(Number(button.dataset.pointDelete));
    });

    ui.saveJsonButton.addEventListener('click', () => {
        const payload = taskPayload();
        downloadText(safeFilename(payload.task.name, 'json'), `${JSON.stringify(payload, null, 2)}\n`, 'application/json;charset=utf-8');
        setStatus('Záloha úlohy vo formáte JSON bola vytvorená.', 'ok');
    });

    ui.exportIgcButton.addEventListener('click', () => {
        try {
            const content = buildIgc();
            downloadText(safeFilename(ui.taskName.value, 'igc'), content, 'text/plain;charset=us-ascii');
            setStatus('Plánovací IGC súbor bol vytvorený. Obsahuje deklaráciu trate a rozšírené údaje štartovej pásky.', 'ok');
        } catch (error) {
            setStatus(error.message || 'IGC súbor sa nepodarilo vytvoriť.', 'error');
        }
    });

    ui.mobileToggle.addEventListener('click', () => ui.sidebar.classList.toggle('is-open'));
}

(async function init() {
    bindUi();
    const restored = restore();
    syncStateFromInputs();
    await createViewer();
    refresh({ save: false });

    if (restored) {
        setStatus('Obnovila som posledný rozpracovaný plán z tohto prehliadača.', 'ok');
        if (state.entities.length) setTimeout(focusTask, 500);
    }
})();
</script>
</body>
</html>

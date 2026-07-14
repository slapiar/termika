<?php
$configPath = __DIR__ . '/asset/config.php';
if (!is_file($configPath)) {
    http_response_code(500);
    exit('Chýba asset/config.php.');
}
require_once $configPath;
if (!defined('CESIUM_ACCESS_TOKEN')) {
    http_response_code(500);
    exit('Chýba CESIUM_ACCESS_TOKEN.');
}
$assetVersion = '20260712-07';
?>
<!doctype html>
<html lang="sk">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>TermikaXC v2.6 – Terrain Analysis</title>
    <script src="https://cesium.com/downloads/cesiumjs/releases/1.143/Build/Cesium/Cesium.js"></script>
    <link rel="stylesheet" href="https://cesium.com/downloads/cesiumjs/releases/1.143/Build/Cesium/Widgets/widgets.css">
    <script src="js/terrain-analysis.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/terrain-analysis-diagnostics.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/terrain-analysis-core.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/terrain-analysis-geometry.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/terrain-contours.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/wind-temp-loader.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/wind-field.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/wind-effects-core.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/wind-effect-terrain.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/wind-effect-surface.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/wind-render.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/wind-ui.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <style>
        :root{color-scheme:dark}
        html,body,#cesiumContainer{width:100%;height:100%;margin:0;overflow:hidden;background:#071018}
        #cesiumContainer{cursor:crosshair}
        [hidden]{display:none!important}
        .floating-window{position:absolute;z-index:20;display:flex;flex-direction:column;min-width:250px;min-height:120px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);background:rgba(7,16,24,.94);color:#eef;font:14px/1.4 system-ui;border:1px solid #426277;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.38);resize:both;overflow:hidden}
        #panel{top:12px;left:12px;width:420px;height:620px}
        #legend{top:12px;right:12px;width:285px;height:540px}
        #cellDiagnostics{left:50%;bottom:64px;width:420px;height:560px;transform:translateX(-50%)}
        .window-header{display:flex;align-items:center;gap:8px;flex:0 0 auto;padding:8px 9px;background:rgba(28,58,73,.95);border-bottom:1px solid #426277;cursor:move;user-select:none;touch-action:none}
        .window-title{flex:1;color:#70e8ff;font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .window-actions{display:flex;gap:4px}
        .window-action{width:25px;height:25px;padding:0;border:1px solid #54778a;border-radius:4px;background:#10212b;color:#dff7ff;cursor:pointer;font:700 16px/1 system-ui}
        .window-action:hover{background:#1c3b4b}
        .window-body{flex:1;min-height:0;padding:12px;overflow:auto}
        .window-body p{margin:5px 0}
        .window-body button{margin:4px 4px 4px 0;padding:7px 10px;cursor:pointer}
        .window-body fieldset{margin:10px 0;padding:9px;border:1px solid #35505f;border-radius:6px}
        .window-body legend{padding:0 6px;color:#70e8ff;font-weight:700}
        .window-body label{display:flex;gap:8px;align-items:center;margin:6px 0}
        .window-body input[type="number"]{width:90px;padding:4px;background:#10212b;color:#fff;border:1px solid #426277;border-radius:4px}
        .future{color:#7f98a5}.future input{opacity:.55}
        #status{max-height:180px;overflow:auto;white-space:pre-wrap;color:#d7e7ef}
        .ok{color:#8cff9d}.err{color:#ff8585}
        .legend-item{display:grid;grid-template-columns:18px 1fr;gap:9px;align-items:start;margin:8px 0}
        .legend-swatch{width:14px;height:14px;margin-top:2px;border:1px solid rgba(255,255,255,.65);border-radius:50%;box-shadow:0 0 8px rgba(255,255,255,.18)}
        .legend-line{width:18px;height:0;margin-top:8px;border-top:2px solid #404040}
        .legend-line.major{border-top-width:4px}
        .legend-item strong{display:block;font-size:13px;color:#fff}
        .legend-item span{display:block;font-size:12px;color:#b9cbd5}
        .legend-note{margin:10px 0 0;padding-top:9px;border-top:1px solid #35505f;font-size:11px;color:#8fa9b8}
        .flat{background:#d3d3d3}.slope{background:#ffd700}.ridge{background:#8b0000}.hill{background:#ff4500}.gully{background:#00bfff}.depression{background:#0000ff}.transition{background:#9370db}
        .diagnostic-intro{margin:0 0 10px;color:#b9cbd5}
        .diagnostic-grid{display:grid;grid-template-columns:minmax(145px,auto) 1fr;gap:4px 12px;margin:8px 0 12px}
        .diagnostic-grid dt{color:#8fa9b8}
        .diagnostic-grid dd{margin:0;color:#fff;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
        .diagnostic-section{margin-top:13px;padding-top:10px;border-top:1px solid #35505f}
        .diagnostic-section h3{margin:0 0 7px;color:#70e8ff;font-size:13px}
        .diagnostic-reasons{margin:0;padding-left:20px}
        .diagnostic-reasons li{margin:4px 0;color:#d7e7ef}
        .diagnostic-pending{padding:8px 9px;border:1px dashed #426277;border-radius:6px;color:#8fa9b8;background:rgba(16,33,43,.55)}
        #windowDock{position:absolute;left:50%;bottom:12px;z-index:30;display:flex;gap:7px;transform:translateX(-50%);padding:6px;background:rgba(7,16,24,.88);border:1px solid #426277;border-radius:8px;box-shadow:0 5px 18px rgba(0,0,0,.35)}
        #windowDock button{padding:6px 10px;border:1px solid #54778a;border-radius:5px;background:#10212b;color:#dff7ff;cursor:pointer}
        #windowDock button:hover{background:#1c3b4b}
        #aimHint{position:absolute;left:50%;top:12px;z-index:12;transform:translateX(-50%);padding:6px 10px;background:rgba(7,16,24,.78);color:#d8f8ff;border:1px solid #426277;border-radius:6px;font:12px/1.2 system-ui;pointer-events:none}
        .record-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .record-badge{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border:1px solid #a33;border-radius:999px;background:rgba(120,0,0,.35);color:#ffd7d7;font-size:12px;font-weight:700;letter-spacing:.2px}
        .record-dot{width:8px;height:8px;border-radius:50%;background:#ff6b6b;box-shadow:0 0 8px rgba(255,107,107,.8)}
        #recordToggleButton.recording{background:#50191f;color:#ffdfe2;border-color:#aa4c57}
        @media (max-width:760px){#panel{width:calc(100vw - 24px);height:60vh}#legend{top:auto;right:12px;bottom:58px;left:12px;width:auto;height:36vh}#cellDiagnostics{left:12px;right:12px;bottom:58px;width:auto;height:56vh;transform:none}.floating-window{max-width:calc(100vw - 24px)}#windowDock{bottom:6px}}
    </style>
</head>
<body>
<div id="cesiumContainer"></div>
<div id="aimHint">Klik na farebný bod = diagnostika · klik na terén = nový stred analýzy</div>

<section id="panel" class="floating-window" data-window-name="Ovládanie">
    <header class="window-header">
        <div class="window-title">TermikaXC v2.6 · modulárna analýza terénu</div>
        <div class="window-actions"><button class="window-action close-window" type="button" title="Zavrieť okno">×</button></div>
    </header>
    <div class="window-body">
        <p>Kruhový zameriavač ukazuje oblasť prvotného pohľadu. Kliknutím na terén zvolíš jej stred.</p>
        <p>Stred: <strong id="centerText">46.43000, 11.85000</strong></p>
        <label>Zadaj stred (lat, lon)
            <input id="centerInput" type="text" value="46.43000, 11.85000" placeholder="46.43000, 11.85000" style="width:220px">
        </label>
        <button id="centerApplyButton" type="button">Presunúť mapu na stred (3000 m ASL)</button>

        <fieldset>
            <legend>Rozsah analýzy</legend>
            <label>Polomer kruhu <input id="radiusInput" type="number" min="40" max="20000" step="40" value="400"> m</label>
            <label>Rozostup vzoriek <input id="spacingInput" type="number" min="5" max="1000" step="5" value="40"> m</label>
        </fieldset>

        <fieldset>
            <legend>Analytické vrstvy</legend>
            <label><input class="module-toggle" type="checkbox" value="geometry" checked> Geometria reliéfu</label>
            <label><input class="module-toggle" type="checkbox" value="contours" checked> Vrstevnice</label>
            <label class="future"><input type="checkbox" disabled> Doliny a žľaby – pripravujeme</label>
            <label class="future"><input type="checkbox" disabled> Hydrológia – pripravujeme</label>
            <label class="future"><input type="checkbox" disabled> Povrchový kryt – pripravujeme</label>
            <label class="future"><input type="checkbox" disabled> Geológia – pripravujeme</label>
            <label class="future"><input type="checkbox" disabled> Oslnenie – pripravujeme</label>
        </fieldset>

        <fieldset>
            <legend>Mapové vrstvy</legend>
            <label><input id="geometryVisible" type="checkbox" checked> Zobraziť geometriu reliéfu</label>
            <label><input id="contoursVisible" type="checkbox" checked> Zobraziť tmavošedé vrstevnice</label>
        </fieldset>

        <fieldset>
            <legend>WIND vrstva (MVP)</legend>
            <label><input id="windEnabled" type="checkbox" checked> Zobraziť veterné prúdnice</label>
            <label>Zdroj TEMP
                <select id="windTempSourceMode">
                    <option value="auto" selected>Auto (Windy → stanica → súbor)</option>
                    <option value="windy">Windy.com</option>
                    <option value="station">Najbližšia meteo stanica</option>
                    <option value="file">Súbor</option>
                </select>
            </label>
            <label>TEMP súbor / URL <input id="windTempSourceUrl" type="text" value="XCtrack/temp.json"></label>
            <label>Windy URL / template <input id="windyTempUrl" type="text" placeholder="https://... alebo template s ${lat}/${lon}"></label>
            <label>Station index URL <input id="stationIndexUrl" type="text" placeholder="https://... alebo template s ${lat}/${lon}"></label>
            <label>Station profile URL template <input id="stationProfileUrlTemplate" type="text" placeholder="https://.../${stationId}.json"></label>
            <label>Výška nad terénom <input id="windAglInput" type="number" min="20" max="5000" step="10" value="300"> m AGL</label>
            <label>Rozostup vetra <input id="windSpacingInput" type="number" min="30" max="1200" step="10" value="120"> m</label>
            <label>Základná rýchlosť <input id="windSpeedInput" type="number" min="0" max="40" step="0.1" value="4.5"> m/s</label>
            <label>Smer toku <input id="windDirInput" type="number" min="0" max="359" step="1" value="230"> °</label>
            <label><input id="windUseTempProfile" type="checkbox" checked> Použiť vietor z TEMP profilu (ak je dostupný)</label>
            <label>Farebnosť vetra
                <select id="windColorMode">
                    <option value="tempDeltaK" selected>Teplotný kontrast</option>
                    <option value="speed">Rýchlosť vetra</option>
                    <option value="convergence">Konvergencia/divergencia</option>
                    <option value="verticalMotion">Vertikálny pohyb (stúpanie/klesanie)</option>
                </select>
            </label>
            <div id="windColorLegend" style="margin-top:6px;padding:6px 8px;border:1px solid #35505f;border-radius:6px;background:rgba(16,33,43,.45);font-size:12px;color:#cfe3ef"></div>
            <label>Téma farieb
                <select id="windColorTheme">
                    <option value="dark" selected>Tmavé pozadie</option>
                    <option value="light">Svetlé pozadie</option>
                </select>
            </label>
            <label><input id="windAnimate" type="checkbox" checked> Animovať smer toku</label>
            <label>Intenzita animácie
                <select id="windAnimationIntensity">
                    <option value="low">Nízka</option>
                    <option value="medium" selected>Stredná</option>
                    <option value="high">Vysoká</option>
                    <option value="auto">Auto (podľa FPS)</option>
                </select>
            </label>
            <div id="windFpsIndicator" style="margin-top:4px;color:#8fa9b8;font-size:12px;">FPS: -- | AUTO profil: --</div>

            <fieldset>
                <legend>Záznam videa</legend>
                <label>FPS záznamu
                    <select id="recordFps">
                        <option value="30" selected>30 fps</option>
                        <option value="60">60 fps</option>
                    </select>
                </label>
                <label>Kvalita
                    <select id="recordQuality">
                        <option value="normal" selected>Normal (8 Mbps)</option>
                        <option value="high">High (16 Mbps)</option>
                    </select>
                </label>
                <label><input id="recordAutoHideUi" type="checkbox" checked> Pri zázname skryť legendu a diagnostiku</label>
                <div class="record-row">
                    <button id="recordToggleButton" type="button">Start recording</button>
                    <span id="recordBadge" class="record-badge" hidden><i class="record-dot"></i><span id="recordElapsed">REC 00:00</span></span>
                </div>
            </fieldset>
        </fieldset>

        <button id="analyzeButton" type="button">Spustiť vybrané analýzy</button>
        <button id="clearButton" type="button">Skryť výsledky</button>
        <div id="status"></div>
    </div>
</section>

<aside id="legend" class="floating-window" data-window-name="Legenda" aria-label="Legenda geometrie terénu">
    <header class="window-header">
        <div class="window-title">Legenda geometrie</div>
        <div class="window-actions"><button class="window-action close-window" type="button" title="Zavrieť okno">×</button></div>
    </header>
    <div class="window-body">
        <div class="legend-item"><i class="legend-swatch flat"></i><div><strong>Rovina</strong><span>Malý sklon a malý lokálny reliéf.</span></div></div>
        <div class="legend-item"><i class="legend-swatch slope"></i><div><strong>Svah</strong><span>Naklonená plocha bez výraznej hrany alebo žľabu.</span></div></div>
        <div class="legend-item"><i class="legend-swatch ridge"></i><div><strong>Rebro alebo hrana</strong><span>Konvexná línia, z ktorej terén klesá do strán.</span></div></div>
        <div class="legend-item"><i class="legend-swatch hill"></i><div><strong>Vyvýšenina</strong><span>Lokálne vypuklá časť terénu.</span></div></div>
        <div class="legend-item"><i class="legend-swatch gully"></i><div><strong>Žľab alebo zbernica</strong><span>Konkávna línia, do ktorej sa terén zbieha.</span></div></div>
        <div class="legend-item"><i class="legend-swatch depression"></i><div><strong>Depresia</strong><span>Lokálne prehĺbená časť terénu.</span></div></div>
        <div class="legend-item"><i class="legend-swatch transition"></i><div><strong>Prechodový terén</strong><span>Nejednoznačný alebo zmiešaný geometrický tvar.</span></div></div>
        <div class="legend-item"><i class="legend-line"></i><div><strong>Vrstevnica</strong><span>Tmavošedá čiara každých 10 m.</span></div></div>
        <div class="legend-item"><i class="legend-line major"></i><div><strong>Hlavná vrstevnica</strong><span>Hrubšia čiara každých 50 m.</span></div></div>
        <p class="legend-note">Vrstevnice sú samostatná priehľadná mapová vrstva bez výplne. Farebné body zostávajú čitateľné nad terénom.</p>
    </div>
</aside>

<section id="cellDiagnostics" class="floating-window" data-window-name="Diagnostika bunky" hidden>
    <header class="window-header">
        <div class="window-title">Diagnostika geometrickej bunky</div>
        <div class="window-actions"><button class="window-action close-window" type="button" title="Zavrieť okno">×</button></div>
    </header>
    <div id="cellDiagnosticsBody" class="window-body">
        <p class="diagnostic-intro">Po vykonaní analýzy klikni na farebný bod. Zobrazia sa vstupné metriky, aktuálne pravidlo a dôvody klasifikácie.</p>
    </div>
</section>

<nav id="windowDock" aria-label="Ovládanie okien">
    <button type="button" data-show-window="panel">Ovládanie</button>
    <button type="button" data-show-window="legend">Legenda</button>
    <button type="button" data-show-window="cellDiagnostics">Diagnostika bodu</button>
</nav>

<script>
    const statusEl = document.getElementById('status');
    const centerText = document.getElementById('centerText');
    const centerInput = document.getElementById('centerInput');
    const centerApplyButton = document.getElementById('centerApplyButton');
    const radiusInput = document.getElementById('radiusInput');
    const geometryVisible = document.getElementById('geometryVisible');
    const contoursVisible = document.getElementById('contoursVisible');
    const windEnabled = document.getElementById('windEnabled');
    const windTempSourceMode = document.getElementById('windTempSourceMode');
    const windTempSourceUrl = document.getElementById('windTempSourceUrl');
    const windyTempUrl = document.getElementById('windyTempUrl');
    const stationIndexUrl = document.getElementById('stationIndexUrl');
    const stationProfileUrlTemplate = document.getElementById('stationProfileUrlTemplate');
    const windAglInput = document.getElementById('windAglInput');
    const windSpacingInput = document.getElementById('windSpacingInput');
    const windSpeedInput = document.getElementById('windSpeedInput');
    const windDirInput = document.getElementById('windDirInput');
    const windUseTempProfile = document.getElementById('windUseTempProfile');
    const windColorMode = document.getElementById('windColorMode');
    const windColorTheme = document.getElementById('windColorTheme');
    const windColorLegend = document.getElementById('windColorLegend');
    const windAnimate = document.getElementById('windAnimate');
    const windAnimationIntensity = document.getElementById('windAnimationIntensity');
    const windFpsIndicator = document.getElementById('windFpsIndicator');
    const recordFps = document.getElementById('recordFps');
    const recordQuality = document.getElementById('recordQuality');
    const recordAutoHideUi = document.getElementById('recordAutoHideUi');
    const recordToggleButton = document.getElementById('recordToggleButton');
    const recordBadge = document.getElementById('recordBadge');
    const recordElapsed = document.getElementById('recordElapsed');
    const cellDiagnostics = document.getElementById('cellDiagnostics');
    const cellDiagnosticsBody = document.getElementById('cellDiagnosticsBody');
    let selectedCenter = { lat: 46.43, lon: 11.85 };
    let previewCenter = { ...selectedCenter };
    let highestWindowZ = 20;
    let windFpsEstimate = 60;
    let windAutoActiveProfile = 'medium';
    let windAutoRerenderBusy = false;
    let activeRecorder = null;
    let activeRecordStream = null;
    let activeRecordChunks = [];
    let recordStartedAtMs = 0;
    let recordTimer = null;
    let recordHiddenTargets = [];

    function formatCenter(point) {
        return point.lat.toFixed(5) + ', ' + point.lon.toFixed(5);
    }

    function formatElapsedRecording(ms) {
        const totalSec = Math.max(0, Math.floor(Number(ms || 0) / 1000));
        const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
        const ss = (totalSec % 60).toString().padStart(2, '0');
        return mm + ':' + ss;
    }

    function updateRecordUi(isRecording) {
        if (!recordToggleButton || !recordBadge || !recordElapsed) return;
        recordToggleButton.textContent = isRecording ? 'Stop recording' : 'Start recording';
        recordToggleButton.classList.toggle('recording', isRecording);
        recordBadge.hidden = !isRecording;
        if (!isRecording) {
            recordElapsed.textContent = 'REC 00:00';
        }
    }

    function updateRecordingTimer() {
        if (!recordElapsed || !recordStartedAtMs) return;
        recordElapsed.textContent = 'REC ' + formatElapsedRecording(Date.now() - recordStartedAtMs);
    }

    function setRecordingAuxUiHidden(hidden) {
        const targets = [
            document.getElementById('legend'),
            document.getElementById('cellDiagnostics'),
            document.getElementById('windowDock'),
            document.getElementById('aimHint')
        ].filter(Boolean);

        if (hidden) {
            recordHiddenTargets = targets
                .filter((el) => !el.hidden)
                .map((el) => el.id);
            recordHiddenTargets.forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.hidden = true;
            });
            return;
        }

        recordHiddenTargets.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.hidden = false;
        });
        recordHiddenTargets = [];
    }

    function selectRecordMimeType() {
        if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== 'function') {
            return '';
        }
        const candidates = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        for (const type of candidates) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return '';
    }

    function getRecordBitrate() {
        return String(recordQuality?.value || 'normal') === 'high' ? 16000000 : 8000000;
    }

    function downloadRecordedVideo(blob, mimeType) {
        const isWebm = String(mimeType || '').toLowerCase().includes('webm');
        const ext = isWebm ? 'webm' : 'mp4';
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = 'termikaxc-wind-' + stamp + '.' + ext;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        return filename;
    }

    function cleanupRecordingState() {
        if (recordTimer) {
            clearInterval(recordTimer);
            recordTimer = null;
        }
        if (activeRecordStream) {
            activeRecordStream.getTracks().forEach((track) => {
                try { track.stop(); } catch (_) {}
            });
        }
        activeRecorder = null;
        activeRecordStream = null;
        activeRecordChunks = [];
        recordStartedAtMs = 0;
        updateRecordUi(false);
        setRecordingAuxUiHidden(false);
    }

    function startRecording() {
        if (activeRecorder && activeRecorder.state === 'recording') return;
        if (!window.MediaRecorder) {
            logStatus('MediaRecorder nie je v tomto prehliadači podporený. Použi OBS alebo iný browser.', 'error');
            return;
        }

        const canvas = viewer?.scene?.canvas;
        if (!canvas || typeof canvas.captureStream !== 'function') {
            logStatus('Canvas captureStream nie je dostupný. Záznam sa nedá spustiť.', 'error');
            return;
        }

        const fps = Math.max(15, Number(recordFps?.value) || 30);
        const mimeType = selectRecordMimeType();
        const recordOptions = { videoBitsPerSecond: getRecordBitrate() };
        if (mimeType) recordOptions.mimeType = mimeType;

        try {
            activeRecordChunks = [];
            activeRecordStream = canvas.captureStream(fps);
            activeRecorder = new MediaRecorder(activeRecordStream, recordOptions);
            recordStartedAtMs = Date.now();

            activeRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) activeRecordChunks.push(event.data);
            };
            activeRecorder.onerror = (event) => {
                const detail = event?.error?.message || 'neznamy problem recordera';
                logStatus('Recorder chyba: ' + detail, 'error');
            };
            activeRecorder.onstop = () => {
                try {
                    const usedMime = activeRecorder?.mimeType || mimeType || 'video/webm';
                    const blob = new Blob(activeRecordChunks, { type: usedMime });
                    const filename = downloadRecordedVideo(blob, usedMime);
                    logStatus('Video uložené: ' + filename + ' (' + Math.round(blob.size / 1024 / 1024 * 10) / 10 + ' MB).', 'success');
                } catch (err) {
                    logStatus('Nepodarilo sa uložiť video: ' + (err?.message || String(err)), 'error');
                } finally {
                    cleanupRecordingState();
                }
            };

            if (recordAutoHideUi?.checked) {
                setRecordingAuxUiHidden(true);
            }

            activeRecorder.start(1000);
            updateRecordUi(true);
            updateRecordingTimer();
            recordTimer = setInterval(updateRecordingTimer, 500);
            logStatus('WIND záznam spustený: ' + fps + ' fps, kvalita ' + (recordQuality?.value || 'normal') + '.');
        } catch (error) {
            cleanupRecordingState();
            logStatus('Záznam sa nepodarilo spustiť: ' + (error?.message || String(error)), 'error');
        }
    }

    function stopRecording() {
        if (!activeRecorder || activeRecorder.state !== 'recording') {
            cleanupRecordingState();
            return;
        }
        try {
            activeRecorder.stop();
            logStatus('WIND záznam zastavený, pripravujem export videa.');
        } catch (error) {
            cleanupRecordingState();
            logStatus('Stop záznamu zlyhal: ' + (error?.message || String(error)), 'error');
        }
    }

    function syncCenterUi(point) {
        centerText.textContent = formatCenter(point);
        centerInput.value = formatCenter(point);
    }

    function parseCenterInput(text) {
        const raw = String(text || '').trim();
        if (!raw) return null;

        const normalized = raw.replace(/;/g, ' ').replace(/,/g, ' ');
        const parts = normalized.split(/\s+/).filter(Boolean);
        if (parts.length < 2) return null;

        const lat = Number(parts[0]);
        const lon = Number(parts[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

        return { lat, lon };
    }

    function refreshWindFpsIndicator() {
        if (!windFpsIndicator) return;
        const fpsText = Number.isFinite(windFpsEstimate) ? windFpsEstimate.toFixed(0) : '--';
        const autoText = String(windAnimationIntensity.value) === 'auto'
            ? windAutoActiveProfile
            : 'manual';
        windFpsIndicator.textContent = 'FPS: ' + fpsText + ' | AUTO profil: ' + autoText;
    }

    function windLegendSwatch(color, label, note) {
        return '<div style="display:grid;grid-template-columns:14px 1fr;gap:8px;align-items:start;margin:3px 0">' +
            '<span style="width:12px;height:12px;border-radius:50%;border:1px solid rgba(255,255,255,.55);background:' + color + ';margin-top:2px"></span>' +
            '<span><strong style="color:#fff">' + label + '</strong> · ' + note + '</span>' +
            '</div>';
    }

    function refreshWindColorLegend() {
        if (!windColorLegend) return;

        const mode = String(windColorMode?.value || 'tempDeltaK');
        const theme = String(windColorTheme?.value || 'dark');

        if (mode === 'speed') {
            const end = theme === 'light' ? '#d62828' : '#ff6b6b';
            windColorLegend.innerHTML =
                '<div style="margin-bottom:4px"><strong>Legenda farieb vetra: Rýchlosť</strong></div>' +
                windLegendSwatch('#70e8ff', 'Nízka rýchlosť', 'slabší vietor') +
                windLegendSwatch(end, 'Vysoká rýchlosť', 'silnejší vietor');
            return;
        }

        if (mode === 'convergence') {
            windColorLegend.innerHTML =
                '<div style="margin-bottom:4px"><strong>Legenda farieb vetra: Konvergencia/divergencia</strong></div>' +
                windLegendSwatch('#00ACC1', 'Konvergencia', 'zbiehanie toku') +
                windLegendSwatch('#AB47BC', 'Divergencia', 'rozbiehanie toku') +
                windLegendSwatch('#90A4AE', 'Neutrál', 'blízko nulovej zmeny');
            return;
        }

        if (mode === 'verticalMotion') {
            windColorLegend.innerHTML =
                '<div style="margin-bottom:4px"><strong>Legenda farieb vetra: Vertikálny pohyb</strong></div>' +
                windLegendSwatch('#FF9AA2', 'Stúpanie', 'celý úsek, kde výška prúdnice narastá') +
                windLegendSwatch('#8FD3FF', 'Klesanie', 'celý úsek, kde výška prúdnice klesá') +
                windLegendSwatch('#C8D6DF', 'Bez zmeny výšky', 'takmer vodorovný úsek prúdnice');
            return;
        }

        windColorLegend.innerHTML =
            '<div style="margin-bottom:4px"><strong>Legenda farieb vetra: Teplotný kontrast</strong></div>' +
            windLegendSwatch('#1E88E5', 'Chladnejší vzduch', 'nižší tempDeltaK') +
            windLegendSwatch('#70E8FF', 'Neutrál', 'okolie 0 K') +
            windLegendSwatch('#FFB300', 'Teplejší vzduch', 'vyšší tempDeltaK');
    }

    function logStatus(text, type = 'info') {
        const line = document.createElement('div');
        line.className = type === 'success' ? 'ok' : (type === 'error' ? 'err' : '');
        line.textContent = text;
        statusEl.appendChild(line);
        statusEl.scrollTop = statusEl.scrollHeight;
    }
    window.logStatus = logStatus;

    function logTempSummaryFirst() {
        const mode = String(windTempSourceMode?.value || 'auto');
        const sourceUrl = String(windTempSourceUrl?.value || '').trim();
        const cachedLevels = Array.isArray(window.WindUI?.state?.lastField?.tempLevels)
            ? window.WindUI.state.lastField.tempLevels
            : [];

        if (cachedLevels.length >= 2) {
            const sorted = cachedLevels
                .filter((lvl) => Number.isFinite(Number(lvl.z_m)))
                .sort((a, b) => Number(a.z_m) - Number(b.z_m));

            if (sorted.length >= 2) {
                const low = sorted[0];
                const high = sorted[sorted.length - 1];
                logStatus(
                    'TEMP profil (cache): ' + sorted.length +
                    ' hladín, z=' + Math.round(Number(low.z_m) || 0) +
                    ' až ' + Math.round(Number(high.z_m) || 0) +
                    ' m, režim „' + mode + '”.',
                    'info'
                );
                return;
            }
        }

        logStatus(
            'TEMP profil: režim „' + mode +
            '“, zdroj „' + (sourceUrl || 'nezadaný') +
            '”. Profil sa načíta pred výpočtom WIND vrstvy.',
            'info'
        );
    }

    function logInputSnapshot(enabledModules) {
        const center = selectedCenter || { lat: NaN, lon: NaN };
        const focusRadiusM = Number(radiusInput.value);
        const gridSpacingM = Number(document.getElementById('spacingInput').value);
        const halfSteps = (Number.isFinite(focusRadiusM) && Number.isFinite(gridSpacingM) && gridSpacingM > 0)
            ? (Math.ceil(focusRadiusM / gridSpacingM) + 1)
            : null;
        const estimatedGridSize = Number.isFinite(halfSteps) ? (halfSteps * 2 + 1) : null;
        const estimatedGridPoints = Number.isFinite(estimatedGridSize) ? (estimatedGridSize * estimatedGridSize) : null;
        const windRadiusM = Number(radiusInput.value);
        const windSpacingM = Number(windSpacingInput.value);
        const windAglM = Number(windAglInput.value);
        const windSpeedMs = Number(windSpeedInput.value);
        const windDirDeg = Number(windDirInput.value);

        logStatus(
            'VSTUPY ANALÝZY: stred ' + Number(center.lat).toFixed(5) + ', ' + Number(center.lon).toFixed(5) +
            ' | fokus radius ' + (Number.isFinite(focusRadiusM) ? focusRadiusM.toFixed(0) : '--') + ' m' +
            ' | rozostup mriežky ' + (Number.isFinite(gridSpacingM) ? gridSpacingM.toFixed(0) : '--') + ' m' +
            ' | odhad mriežky ' + (Number.isFinite(estimatedGridSize) ? (estimatedGridSize + '×' + estimatedGridSize) : '--') +
            ' (~' + (Number.isFinite(estimatedGridPoints) ? estimatedGridPoints.toLocaleString('sk-SK') : '--') + ' bodov)' +
            ' | moduly [' + (enabledModules.length ? enabledModules.join(', ') : 'none') + ']' +
            ' | mapové vrstvy geometry=' + (geometryVisible.checked ? 'on' : 'off') +
            ', contours=' + (contoursVisible.checked ? 'on' : 'off') + '.',
            'info'
        );

        logStatus(
            'VSTUPY WIND: enabled=' + (windEnabled.checked ? 'on' : 'off') +
            ' | radius ' + (Number.isFinite(windRadiusM) ? windRadiusM.toFixed(0) : '--') + ' m' +
            ' | spacing ' + (Number.isFinite(windSpacingM) ? windSpacingM.toFixed(0) : '--') + ' m' +
            ' | AGL ' + (Number.isFinite(windAglM) ? windAglM.toFixed(0) : '--') + ' m' +
            ' | base ' + (Number.isFinite(windSpeedMs) ? windSpeedMs.toFixed(1) : '--') + ' m/s @ ' +
            (Number.isFinite(windDirDeg) ? windDirDeg.toFixed(0) : '--') + '°' +
            ' | tempMode=' + windTempSourceMode.value +
            ' | useTempProfile=' + (windUseTempProfile.checked ? 'on' : 'off') +
            ' | color=' + windColorMode.value + '/' + windColorTheme.value +
            ' | animate=' + (windAnimate.checked ? 'on' : 'off') +
            ' (' + windAnimationIntensity.value + ')' +
            ' | sourceUrl=' + (String(windTempSourceUrl.value || '').trim() || 'nezadaný') + '.',
            'info'
        );
    }

    function formatNumber(value, digits = 2, suffix = '') {
        const number = Number(value);
        if (!Number.isFinite(number)) return 'zatiaľ nevypočítané';
        return number.toLocaleString('sk-SK', {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        }) + suffix;
    }

    function diagnosticRow(list, label, value) {
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = label;
        dd.textContent = value;
        list.append(dt, dd);
    }

    function showCellDiagnostics(cell) {
        const diagnostic = TerrainAnalysis.vytvorDiagnostikuBunky(cell);
        const metrics = diagnostic.metrics;
        const position = diagnostic.position;

        const intro = document.createElement('p');
        intro.className = 'diagnostic-intro';
        intro.textContent = 'Aktuálna pracovná klasifikácia. Zobrazené hodnoty sú podkladom na overenie farby voči vrstevniciam a 3D reliéfu.';

        const grid = document.createElement('dl');
        grid.className = 'diagnostic-grid';
        diagnosticRow(grid, 'Typ', String(diagnostic.type || 'neurčený').replaceAll('_', ' '));
        diagnosticRow(grid, 'Pravidlo', diagnostic.rule || 'neuvedené');
        diagnosticRow(grid, 'Dôvera', formatNumber(diagnostic.confidence, 2));
        diagnosticRow(grid, 'Výška', formatNumber(metrics.heightM, 1, ' m'));
        diagnosticRow(grid, 'Sklon', formatNumber(metrics.slopeDeg, 2, '°'));
        diagnosticRow(grid, 'Orientácia', formatNumber(metrics.aspectDeg, 1, '°'));
        diagnosticRow(grid, 'Lokálny reliéf', formatNumber(metrics.localReliefM, 2, ' m'));
        diagnosticRow(grid, 'Gradient', formatNumber(metrics.gradient, 5));
        diagnosticRow(grid, 'Laplacián', formatNumber(metrics.laplacian, 7));
        diagnosticRow(grid, 'Profilová krivosť', formatNumber(metrics.profileCurvature, 7));
        diagnosticRow(grid, 'Normalizovaný Laplacián', formatNumber(metrics.scaledLaplacian, 3));
        diagnosticRow(grid, 'Normalizovaná profilová krivosť', formatNumber(metrics.scaledProfileCurvature, 3));
        diagnosticRow(grid, 'Lokálna konvexnosť', metrics.convexity || 'neurčená');
        diagnosticRow(grid, 'Poloha', formatNumber(position.lat, 6) + ', ' + formatNumber(position.lon, 6));
        diagnosticRow(grid, 'Bunka mriežky', 'riadok ' + position.row + ', stĺpec ' + position.col);
        diagnosticRow(grid, 'Pôvod', diagnostic.dataOrigin || 'neuvedený');

        const reasonsSection = document.createElement('section');
        reasonsSection.className = 'diagnostic-section';
        const reasonsTitle = document.createElement('h3');
        reasonsTitle.textContent = 'Prečo bola bunka takto zaradená';
        const reasons = document.createElement('ul');
        reasons.className = 'diagnostic-reasons';
        const reasonItems = diagnostic.reasons.length
            ? diagnostic.reasons
            : ['Starší výsledok analýzy neobsahuje uložené dôvody. Spusť analýzu znova.'];
        reasonItems.forEach((reason) => {
            const item = document.createElement('li');
            item.textContent = '✓ ' + reason;
            reasons.appendChild(item);
        });
        reasonsSection.append(reasonsTitle, reasons);

        const pendingSection = document.createElement('section');
        pendingSection.className = 'diagnostic-section';
        const pendingTitle = document.createElement('h3');
        pendingTitle.textContent = 'Nasledujúce vrstvy ešte nie sú dopočítané';
        const pending = document.createElement('div');
        pending.className = 'diagnostic-pending';
        pending.textContent = 'Morfologická rola, farebná rodina G01–G16, relatívna výška alebo hĺbka a intenzita zlomu ostávajú zatiaľ null. Nebudeme ich predstierať odhadom.';
        pendingSection.append(pendingTitle, pending);

        cellDiagnosticsBody.replaceChildren(intro, grid, reasonsSection, pendingSection);
        cellDiagnostics.hidden = false;
        highestWindowZ += 1;
        cellDiagnostics.style.zIndex = highestWindowZ;
        keepWindowInViewport(cellDiagnostics);
    }

    Cesium.Ion.defaultAccessToken = <?php echo json_encode(CESIUM_ACCESS_TOKEN, JSON_UNESCAPED_SLASHES); ?>;
    const viewer = new Cesium.Viewer('cesiumContainer', {
        terrain: Cesium.Terrain.fromWorldTerrain(),
        animation: false,
        timeline: false,
        infoBox: false,
        selectionIndicator: false,
        geocoder: false
    });
    viewer.clock.shouldAnimate = true;

    let fpsFrameCounter = 0;
    let fpsLastTs = performance.now();
    viewer.scene.postRender.addEventListener(() => {
        fpsFrameCounter += 1;
        const now = performance.now();
        const dt = now - fpsLastTs;
        if (dt < 900) return;
        windFpsEstimate = Math.max(1, (fpsFrameCounter * 1000) / dt);
        fpsFrameCounter = 0;
        fpsLastTs = now;
        refreshWindFpsIndicator();
    });

    windAnimationIntensity.addEventListener('change', refreshWindFpsIndicator);
    windColorMode.addEventListener('change', refreshWindColorLegend);
    windColorTheme.addEventListener('change', refreshWindColorLegend);
    recordToggleButton.addEventListener('click', () => {
        if (activeRecorder && activeRecorder.state === 'recording') {
            stopRecording();
            return;
        }
        startRecording();
    });
    refreshWindFpsIndicator();
    refreshWindColorLegend();
    updateRecordUi(false);

    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(selectedCenter.lon, selectedCenter.lat, 9000)
    });
    syncCenterUi(selectedCenter);

    if (window.WindUI) {
        window.WindUI.init({
            aglM: Number(windAglInput.value),
            spacingM: Number(windSpacingInput.value),
            baseSpeedMs: Number(windSpeedInput.value),
            baseDirDeg: Number(windDirInput.value),
            allowFallbackBaseVector: false,
            useTempProfileWind: windUseTempProfile.checked,
            tempSourceMode: windTempSourceMode.value,
            tempSourceUrl: windTempSourceUrl.value,
            windyTempUrl: windyTempUrl.value,
            stationIndexUrl: stationIndexUrl.value,
            stationProfileUrlTemplate: stationProfileUrlTemplate.value,
            colorMode: windColorMode.value,
            colorTheme: windColorTheme.value,
            animationEnabled: windAnimate.checked,
            maxVerticalMs: 4.0,
            maxVerticalRatio: 0.35,
            source: 'ODVODENE'
        });
    }

    const analysisAim = viewer.entities.add({
        id: 'terrain-analysis-aim',
        position: new Cesium.CallbackProperty(() => Cesium.Cartesian3.fromDegrees(previewCenter.lon, previewCenter.lat), false),
        ellipse: {
            semiMajorAxis: new Cesium.CallbackProperty(() => Math.max(40, Number(radiusInput.value) || 400), false),
            semiMinorAxis: new Cesium.CallbackProperty(() => Math.max(40, Number(radiusInput.value) || 400), false),
            material: Cesium.Color.CYAN.withAlpha(0.09),
            outline: true,
            outlineColor: Cesium.Color.CYAN.withAlpha(0.95),
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
    });

    const selectedPoint = viewer.entities.add({
        id: 'terrain-analysis-center',
        position: Cesium.Cartesian3.fromDegrees(selectedCenter.lon, selectedCenter.lat),
        point: {
            pixelSize: 9,
            color: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.CYAN,
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
    });

    function pickTerrainPosition(screenPosition) {
        const cartesian = viewer.scene.pickPosition(screenPosition) || viewer.camera.pickEllipsoid(screenPosition);
        if (!cartesian) return null;
        const point = Cesium.Cartographic.fromCartesian(cartesian);
        return {
            lat: Cesium.Math.toDegrees(point.latitude),
            lon: Cesium.Math.toDegrees(point.longitude)
        };
    }

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((event) => {
        const point = pickTerrainPosition(event.endPosition);
        if (point) previewCenter = point;
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    handler.setInputAction((event) => {
        const picked = viewer.scene.pick(event.position);
        const pickedId = picked?.id;
        if (pickedId?.type === 'terrain-analysis-cell' && pickedId.cell) {
            showCellDiagnostics(pickedId.cell);
            return;
        }

        const point = pickTerrainPosition(event.position);
        if (!point) return;
        selectedCenter = point;
        previewCenter = { ...point };
        selectedPoint.position = Cesium.Cartesian3.fromDegrees(point.lon, point.lat);
        syncCenterUi(point);
        logStatus('Vybraný nový stred kruhovej analýzy.');
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    centerApplyButton.addEventListener('click', () => {
        const parsed = parseCenterInput(centerInput.value);
        if (!parsed) {
            logStatus('Súradnice nie sú platné. Použi formát: 46.43000, 11.85000', 'error');
            return;
        }

        selectedCenter = parsed;
        previewCenter = { ...parsed };
        selectedPoint.position = Cesium.Cartesian3.fromDegrees(parsed.lon, parsed.lat);
        syncCenterUi(parsed);

        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(parsed.lon, parsed.lat, 3000)
        });

        logStatus('Stred bol nastavený ručne na ' + formatCenter(parsed) + '. Kamera je nad bodom vo výške 3000 m ASL.', 'success');
    });

    centerInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        centerApplyButton.click();
    });

    geometryVisible.addEventListener('change', () => {
        TerrainAnalysisCore.setLayerVisible('geometry', geometryVisible.checked);
    });

    contoursVisible.addEventListener('change', () => {
        TerrainContours.setVisible(contoursVisible.checked);
    });

    async function resolveSurfaceAltitudeM(center) {
        try {
            const cart = Cesium.Cartographic.fromDegrees(center.lon, center.lat);
            const sampled = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [cart]);
            const h = sampled?.[0]?.height;
            return Number.isFinite(h) ? Number(h) : null;
        } catch (_) {
            return null;
        }
    }

    async function runWindLayer(center, radiusM, geometry) {
        if (!window.WindUI || !window.WindRender || !window.WindField || !window.WindEffectsCore) {
            throw new Error('WIND moduly nie sú načítané.');
        }

        if (!windEnabled.checked) {
            window.WindUI?.clear?.(viewer);
            return;
        }

        const surfaceAltM = await resolveSurfaceAltitudeM(center);
        const animationProfiles = {
            low: {
                animationSpeedFactor: 3.5,
                animationTrailSeconds: 1.4,
                animationMinSegmentM: 45,
                animationMaxSegmentM: 220,
                animationSamples: 4
            },
            medium: {
                animationSpeedFactor: 8,
                animationTrailSeconds: 2.0,
                animationMinSegmentM: 80,
                animationMaxSegmentM: 420,
                animationSamples: 6
            },
            high: {
                animationSpeedFactor: 13,
                animationTrailSeconds: 2.8,
                animationMinSegmentM: 110,
                animationMaxSegmentM: 600,
                animationSamples: 8
            }
        };
        const resolveAutoProfile = function () {
            if (windFpsEstimate >= 48) return 'high';
            if (windFpsEstimate >= 30) return 'medium';
            return 'low';
        };

        const requestedIntensity = String(windAnimationIntensity.value || 'medium');
        const activeIntensity = requestedIntensity === 'auto' ? resolveAutoProfile() : requestedIntensity;
        windAutoActiveProfile = activeIntensity;
        const animationCfg = animationProfiles[activeIntensity] || animationProfiles.medium;
        refreshWindFpsIndicator();

        const windResult = await window.WindUI.runDemo(viewer, center, {
            aglM: Number(windAglInput.value),
            radiusM,
            spacingM: Number(windSpacingInput.value),
            baseSpeedMs: Number(windSpeedInput.value),
            baseDirDeg: Number(windDirInput.value),
            allowFallbackBaseVector: false,
            useTempProfileWind: windUseTempProfile.checked,
            tempSourceMode: windTempSourceMode.value,
            tempSourceUrl: windTempSourceUrl.value,
            windyTempUrl: windyTempUrl.value,
            stationIndexUrl: stationIndexUrl.value,
            stationProfileUrlTemplate: stationProfileUrlTemplate.value,
            terrainGeometry: geometry,
            activeEffects: ['terrain-steering'],
            colorMode: windColorMode.value,
            colorTheme: windColorTheme.value,
            animationEnabled: windAnimate.checked,
            maxVerticalMs: 4.0,
            maxVerticalRatio: 0.35,
            coolingZones: [],
            ...animationCfg,
            surfaceAltM,
            seedEvery: 3,
            maxSteps: 42,
            stepMeters: 90
        });

        const tempSourceInfo = window.WindUI?.state?.lastTempSource || null;
        if (tempSourceInfo) {
            const requested = tempSourceInfo.requestedMode ? ('; requested=' + tempSourceInfo.requestedMode) : '';
            const loaderDetail = tempSourceInfo.loaderInfo?.detail ? ('; detail=' + tempSourceInfo.loaderInfo.detail) : '';
            logStatus(
                'WIND TEMP zdroj: ' + tempSourceInfo.type + ' -> ' + (tempSourceInfo.detail || 'n/a') + requested + loaderDetail + '.',
                'info'
            );
        }

        const weather = windResult.field.weatherTracking || {};
        const mode = weather.mode || 'FALLBACK_BASE_VECTOR';
        const sampled = Number.isFinite(Number(weather.sampledLevelZ_m))
            ? 'z=' + Number(weather.sampledLevelZ_m).toFixed(0) + ' m'
            : 'bez validnej hladiny';
        const flowStates = Array.isArray(windResult.field.cells)
            ? Array.from(new Set(windResult.field.cells.map((c) => c.flow_state).filter(Boolean)))
            : [];

        logStatus(
            'WIND: vykreslených prúdnic ' + windResult.stats.rendered +
            ' / seedov ' + windResult.stats.streamlines +
            ', režim ' + mode + ', ' + sampled +
            (flowStates.length ? ', flow_state: ' + flowStates.join('/') : '') + '.',
            'success'
        );
        const effects = windResult.field.diagnostics?.effectsApplied || [];
        if (effects.length) {
            logStatus('WIND efekty: ' + effects.join(', ') + '.');
        }

        if (requestedIntensity === 'auto') {
            logStatus('WIND animácia AUTO: profil ' + activeIntensity + ', FPS ~ ' + windFpsEstimate.toFixed(0) + '.');
        }

        if ((Number(windResult.stats.rendered) || 0) < 1) {
            logStatus('WIND: nebola vykreslená žiadna prúdnica. Skontroluj rýchlosť vetra alebo zvýš hustotu výpočtu.', 'error');
        }
    }

    setInterval(async () => {
        if (!windEnabled.checked) return;
        if (String(windAnimationIntensity.value) !== 'auto') return;
        if (!window.WindUI?.state?.lastField || !window.WindRender?.renderField) return;
        if (windAutoRerenderBusy) return;

        const nextProfile = windFpsEstimate >= 48 ? 'high' : (windFpsEstimate >= 30 ? 'medium' : 'low');
        if (nextProfile === windAutoActiveProfile) return;

        const animationProfiles = {
            low: {
                animationSpeedFactor: 3.5,
                animationTrailSeconds: 1.4,
                animationMinSegmentM: 45,
                animationMaxSegmentM: 220,
                animationSamples: 4
            },
            medium: {
                animationSpeedFactor: 8,
                animationTrailSeconds: 2.0,
                animationMinSegmentM: 80,
                animationMaxSegmentM: 420,
                animationSamples: 6
            },
            high: {
                animationSpeedFactor: 13,
                animationTrailSeconds: 2.8,
                animationMinSegmentM: 110,
                animationMaxSegmentM: 600,
                animationSamples: 8
            }
        };

        windAutoRerenderBusy = true;
        try {
            windAutoActiveProfile = nextProfile;
            await window.WindRender.renderField(viewer, window.WindUI.state.lastField, {
                seedEvery: 3,
                maxSteps: 42,
                stepMeters: 90,
                colorMode: windColorMode.value,
                colorTheme: windColorTheme.value,
                animationEnabled: windAnimate.checked,
                ...animationProfiles[nextProfile]
            });
            refreshWindFpsIndicator();
            logStatus('WIND animácia AUTO: prepínam profil na ' + nextProfile + ' (FPS ~ ' + windFpsEstimate.toFixed(0) + ').');
        } catch (_) {
            // Silent: auto re-render is best-effort and must not block manual workflow.
        } finally {
            windAutoRerenderBusy = false;
        }
    }, 2500);

    document.getElementById('analyzeButton').addEventListener('click', async () => {
        const button = document.getElementById('analyzeButton');
        const enabledModules = Array.from(document.querySelectorAll('.module-toggle:checked'))
            .map((input) => input.value);

        button.disabled = true;
        statusEl.replaceChildren();
        logTempSummaryFirst();
        logInputSnapshot(enabledModules);
        logStatus('Spúšťam moduly: ' + enabledModules.join(', ') + '.');

        try {
            const result = await TerrainAnalysisCore.analyze(viewer, {
                center: selectedCenter,
                radiusM: Number(radiusInput.value),
                spacingM: Number(document.getElementById('spacingInput').value),
                enabledModules
            });

            const geometry = result.layers.geometry;
            if (geometry) {
                TerrainAnalysis.zobrazDiagnostiku(viewer, geometry);
                TerrainAnalysisCore.setLayerVisible('geometry', geometryVisible.checked);
            }

            if (result.layers.contours) {
                TerrainContours.setVisible(contoursVisible.checked);
                await TerrainContours.render(viewer, result.layers.contours);
                const contourDiagnostics = result.diagnostics.contours;
                logStatus(
                    'Vrstevnice: interval ' + contourDiagnostics.intervalM + ' m, hlavné každých ' +
                    contourDiagnostics.indexIntervalM + ' m, ' + contourDiagnostics.segmentCount + ' úsekov.'
                );
            } else {
                TerrainContours.clear(viewer);
            }

            if (geometry) {
                logStatus(
                    'Kruhový pohľad: polomer ' + geometry.radiusM.toFixed(0) + ' m, ' +
                    geometry.summary.cellCount + ' buniek, reliéf ' +
                    geometry.summary.reliefM.toFixed(1) + ' m, priemerný sklon ' +
                    geometry.summary.meanSlopeDeg.toFixed(1) + '°.',
                    'success'
                );

                const diagnostics = result.diagnostics.geometry;
                logStatus(
                    'Hrubá podkladová mriežka: ' + diagnostics.gridRows + ' × ' +
                    diagnostics.gridCols + '; po kruhovej maske ostalo ' +
                    diagnostics.cellsAfterMask + ' z ' + diagnostics.cellsBeforeMask + ' buniek.'
                );
                logStatus('Kliknutím na ľubovoľný farebný bod otvoríš jeho číselnú diagnostiku a dôvody klasifikácie.');
            }

            await runWindLayer(selectedCenter, Number(radiusInput.value), geometry || null);
        } catch (error) {
            logStatus('Chyba: ' + error.message, 'error');
        } finally {
            button.disabled = false;
        }
    });

    document.getElementById('clearButton').addEventListener('click', () => {
        TerrainAnalysis.skryDiagnostiku(viewer);
        TerrainContours.clear(viewer);
        window.WindUI?.clear?.(viewer);
        cellDiagnostics.hidden = true;
        logStatus('Výsledné mapové vrstvy boli skryté.');
    });

    window.addEventListener('beforeunload', () => {
        cleanupRecordingState();
    });

    function keepWindowInViewport(windowEl) {
        const rect = windowEl.getBoundingClientRect();
        const maxLeft = Math.max(0, window.innerWidth - Math.min(rect.width, window.innerWidth));
        const maxTop = Math.max(0, window.innerHeight - 42);
        windowEl.style.left = Math.min(Math.max(0, rect.left), maxLeft) + 'px';
        windowEl.style.top = Math.min(Math.max(0, rect.top), maxTop) + 'px';
        windowEl.style.right = 'auto';
        windowEl.style.bottom = 'auto';
        windowEl.style.transform = 'none';
    }

    document.querySelectorAll('.floating-window').forEach((windowEl) => {
        const header = windowEl.querySelector('.window-header');
        let dragState = null;

        windowEl.addEventListener('pointerdown', () => {
            highestWindowZ += 1;
            windowEl.style.zIndex = highestWindowZ;
        });

        header.addEventListener('pointerdown', (event) => {
            if (event.target.closest('button')) return;
            const rect = windowEl.getBoundingClientRect();
            windowEl.style.left = rect.left + 'px';
            windowEl.style.top = rect.top + 'px';
            windowEl.style.right = 'auto';
            windowEl.style.bottom = 'auto';
            windowEl.style.transform = 'none';
            dragState = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
            header.setPointerCapture(event.pointerId);
            event.preventDefault();
        });

        header.addEventListener('pointermove', (event) => {
            if (!dragState) return;
            const nextLeft = dragState.left + event.clientX - dragState.x;
            const nextTop = dragState.top + event.clientY - dragState.y;
            windowEl.style.left = Math.max(0, Math.min(nextLeft, window.innerWidth - 80)) + 'px';
            windowEl.style.top = Math.max(0, Math.min(nextTop, window.innerHeight - 36)) + 'px';
        });

        const stopDrag = () => { dragState = null; };
        header.addEventListener('pointerup', stopDrag);
        header.addEventListener('pointercancel', stopDrag);

        windowEl.querySelector('.close-window').addEventListener('click', (event) => {
            event.stopPropagation();
            windowEl.hidden = true;
        });
    });

    document.querySelectorAll('[data-show-window]').forEach((button) => {
        button.addEventListener('click', () => {
            const windowEl = document.getElementById(button.dataset.showWindow);
            windowEl.hidden = false;
            highestWindowZ += 1;
            windowEl.style.zIndex = highestWindowZ;
            keepWindowInViewport(windowEl);
        });
    });

    window.addEventListener('resize', () => {
        document.querySelectorAll('.floating-window:not([hidden])').forEach(keepWindowInViewport);
    });
</script>
</body>
</html>

<?php
// Používame absolútnu cestu, aby načítanie konfigurácie nezáviselo od pracovného adresára servera.
$configPath = __DIR__ . '/asset/config.php';

if (!is_file($configPath)) {
    http_response_code(500);
    header('Content-Type: text/html; charset=UTF-8');
    echo '<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>TermikaXC – chýba konfigurácia</title>';
    echo '<style>body{margin:0;padding:40px;background:#070b0f;color:#eef;font:16px/1.5 system-ui}main{max-width:760px;margin:auto;padding:28px;border:1px solid #ff5252;border-radius:12px;background:#111820}code{color:#73e8ff}</style></head><body><main>';
    echo '<h1>TermikaXC sa nespustila</h1>';
    echo '<p>Na serveri chýba súbor <code>asset/config.php</code>. Obnov ho z pôvodnej verzie projektu alebo nahraj kompletný balík.</p>';
    echo '</main></body></html>';
    exit;
}

require_once $configPath;

if (!defined('CESIUM_ACCESS_TOKEN')) {
    http_response_code(500);
    exit('V asset/config.php chýba konštanta CESIUM_ACCESS_TOKEN.');
}

// Zmena verzie prinúti prehliadač načítať nové JS/CSS namiesto starej cache.
$assetVersion = '20260715-03';

$jsDirectory = __DIR__ . '/js';
$jsPriority = [
    'meteo-core.js',
    'skewt-render.js',
    'glider-core.js',
    'pilot-network.js',
    'cesium-render.js',
    'wind-effects-core.js',
    'wind-effect-terrain.js',
    'wind-effect-surface.js',
    'wind-temp-loader.js',
    'wind-field.js',
    'wind-render.js',
    'wind-ui.js',
    'terrain-analysis.js',
    'workspace-ui.js',
];
$jsFiles = glob($jsDirectory . '/*.js') ?: [];
$jsFiles = array_map('basename', $jsFiles);
$jsFiles = array_values(array_unique($jsFiles));

usort($jsFiles, static function (string $a, string $b) use ($jsPriority): int {
    $aIndex = array_search($a, $jsPriority, true);
    $bIndex = array_search($b, $jsPriority, true);
    $aRank = $aIndex === false ? PHP_INT_MAX : $aIndex;
    $bRank = $bIndex === false ? PHP_INT_MAX : $bIndex;

    return $aRank === $bRank ? strnatcasecmp($a, $b) : $aRank <=> $bRank;
});
?>
<!DOCTYPE html>
<html lang="sk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TermikaXC – 3D Tactical Flight Control</title>

    <script src="https://cesium.com/downloads/cesiumjs/releases/1.143/Build/Cesium/Cesium.js"></script>
    <link href="https://cesium.com/downloads/cesiumjs/releases/1.143/Build/Cesium/Widgets/widgets.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js"></script>

    <link href="asset/style.css?v=<?php echo rawurlencode($assetVersion); ?>" rel="stylesheet">

<?php foreach ($jsFiles as $jsFile): ?>
    <script src="js/<?php echo rawurlencode($jsFile); ?>?v=<?php echo rawurlencode($assetVersion); ?>"></script>
<?php endforeach; ?>
</head>
<body>
    <div id="appShell">
        <aside id="leftPanel" class="dashboard-panel workspace-window" aria-label="Fyziológia pilota">
            <div class="window-header cyan" title="Potiahni za hlavičku. Dvojklik vráti panel na pôvodné miesto.">
                <strong>FYZIOLÓGIA PILOTA (LIVE)</strong>
                <span class="drag-symbol" aria-hidden="true">⠿</span>
            </div>
            <div class="panel-content">
                <div class="row"><span class="label">Pilot:</span><span id="pId" class="val">Čakám na IGC...</span></div>
                <div class="row"><span class="label">Srdcový tep:</span><span id="pHr" class="val">-- BPM</span></div>
                <div class="row"><span class="label">Saturácia SpO₂:</span><span id="pSpo2" class="val">-- %</span></div>
                <div class="row"><span class="label">Stav tela:</span><span id="pStatus" class="val">--</span></div>
                <div class="chart-wrap">
                    <canvas id="liveBioChart"></canvas>
                </div>
            </div>
        </aside>

        <main id="mapPanel" class="map-panel">
            <div class="map-toolbar">
                <div class="map-title-group">
                    <div class="map-title-line">
                        <strong>3D MAPA LETU</strong>
                        <span id="mapState" class="state-badge">ŠTARTUJEM</span>
                    </div>
                    <span id="igcFileName" class="igc-file-name" title="Aktuálne načítaný IGC súbor">XCtrack/let.igc</span>
                </div>

                <div class="map-actions map-actions-primary">
                    <input id="igcFileInput" type="file" accept=".igc,text/plain,application/octet-stream" hidden>
                    <input id="tempFileInput" type="file" accept=".json,.txt,.csv,.temp,.snd,application/json,text/plain,text/csv" hidden>
                    <select id="igcTempSourceSelect" class="map-temp-source-select" title="Zdroje TEMP profilu pre IGC" aria-label="Zdroj TEMP pre IGC">
                        <option value="XCtrack/temptest.json" selected>TEMP: temptest</option>
                        <option value="XCtrack/11952-1784070000000-fm94.json">TEMP: Poprad FM94</option>
                        <option value="XCtrack/temp.json">TEMP: legacy temp.json</option>
                        <option value="custom">TEMP: vlastná URL...</option>
                    </select>
                    <input id="igcTempCustomUrl" class="map-temp-custom-url" type="text" placeholder="https://.../temp.json" hidden aria-label="Vlastná URL TEMP profilu">
                    <button id="loadIgcButton" type="button" title="Načítať iný záznam letu z počítača">⇧ Načítať IGC</button>
                    <button id="loadTempButton" type="button" title="Načítať TEMP profil z JSON alebo textovej tabuľky">⇧ Načítať TEMP</button>
                    <button id="toggleSkewTButton" type="button" title="Zobraziť TEMP v Skew‑T / log‑P grafe">⌁ Zobraziť Skew‑T</button>
                    <button id="focusFlightButton" type="button" title="Zamerať celý let">⌖ Celý let</button>
                    <button id="toggleDebugButton" type="button" title="Skryť alebo zobraziť diagnostický pult">▤ Skryť diagnostiku</button>
                    <button id="resetPanelLayoutButton" type="button" title="Vrátiť pracovné panely na pôvodné miesta">↺ Panely</button>
                    <button id="toggleFullscreenButton" type="button" title="Roztiahnuť mapu na celú obrazovku">⛶ Celá obrazovka</button>
                </div>

                <div class="camera-toolbar" role="group" aria-label="Režim kamery">
                    <span class="camera-label">KAMERA</span>
                    <button type="button" class="camera-mode-button is-active" data-camera-mode="free" title="Voľné ovládanie Cesium myšou">Voľná 3D</button>
                    <button type="button" class="camera-mode-button" data-camera-mode="overview" title="Zobraziť celý let">Celý let</button>
                    <button type="button" class="camera-mode-button" data-camera-mode="follow" title="Kamera za pilotom">Za pilotom</button>
                    <button type="button" class="camera-mode-button" data-camera-mode="pilot" title="Pohľad z pozície pilota">Pohľad pilota</button>
                </div>
            </div>

            <div id="cesiumContainer" aria-label="3D mapa letu"></div>
            <section id="windCachePreview" class="wind-cache-preview" hidden aria-label="Wind WebM cache preview">
                <div class="wind-cache-preview-bar">
                    <span id="windCachePreviewLabel">WIND cache</span>
                    <button id="closeWindCachePreviewButton" type="button" title="Skryť náhľad cache">×</button>
                </div>
                <video id="windCacheVideo" class="wind-cache-video" muted playsinline controls></video>
            </section>

            <section id="flightControls" class="flight-controls" aria-label="Ovládanie prehrávania letu">
                <div class="playback-buttons">
                    <button id="playPauseButton" type="button" disabled title="Spustiť alebo pozastaviť prehrávanie letu">▶ Prehrať</button>
                    <button id="stopPlaybackButton" type="button" disabled title="Zastaviť prehrávanie a vrátiť sa na začiatok">■ Stop</button>
                </div>

                <div class="timeline-area">
                    <div class="timeline-meta">
                        <span id="flightCurrentTime">--:--:--</span>
                        <span id="flightProgressText">0 / 0</span>
                        <span id="flightEndTime">--:--:--</span>
                    </div>
                    <input id="flightTimeline" type="range" min="0" max="0" value="0" step="1" disabled aria-label="Časová os letu">
                </div>

                <div class="vario-legend" aria-label="Farebná legenda vária">
                    <span><i class="vario-swatch strong-up"></i>&gt; +2</span>
                    <span><i class="vario-swatch up"></i>stúpanie</span>
                    <span><i class="vario-swatch neutral"></i>0</span>
                    <span><i class="vario-swatch down"></i>klesanie</span>
                    <span><i class="vario-swatch strong-down"></i>&lt; −1,5</span>
                </div>
            </section>
        </main>

        <aside id="rightPanel" class="dashboard-panel workspace-window" aria-label="Meteo a 3D geometria">
            <div class="window-header orange" title="Potiahni za hlavičku. Dvojklik vráti panel na pôvodné miesto.">
                <strong>METEO &amp; 3D GEOMETRIA</strong>
                <span class="drag-symbol" aria-hidden="true">⠿</span>
            </div>
            <div class="panel-content">
                <div class="row"><span class="label">Vario:</span><span id="pVario" class="val">-- m/s</span></div>
                <div class="row"><span class="label">Výška IGC:</span><span id="pAlt" class="val">-- m AMSL</span></div>
                <div class="row"><span class="label">Výška terénu:</span><span id="pTerrain" class="val">--</span></div>
                <div class="row"><span class="label">Nad terénom:</span><span id="pAgl" class="val cyan">-- m AGL</span></div>
                <div class="row"><span class="label">Vertikálna korekcia:</span><span id="pAltCorrection" class="val">--</span></div>
                <div class="row"><span class="label">Kalibrácia:</span><span id="pTerrainMode" class="val">Čakám...</span></div>
                <div class="row"><span class="label">AGL štart / cieľ:</span><span id="pAglStartFinish" class="val">--</span></div>
                <div class="row"><span class="label">Minimum AGL:</span><span id="pAglMin" class="val">--</span></div>
                <div class="row"><span class="label">Body pod terénom:</span><span id="pAglNegative" class="val">--</span></div>
                <div class="row"><span class="label">Poloha IGC:</span><span id="pPosition" class="val">--</span></div>
                <div class="row"><span class="label">Základňa (LCL):</span><span id="pLcl" class="val magenta">Vypočítavam...</span></div>
                <div class="row"><span class="label">Priestor CTR:</span><span id="pAirspace" class="val">Bezpečný</span></div>
                <div class="separator"></div>
                <div class="row"><span class="label">IGC súbor:</span><span id="pIgcFile" class="val">let.igc</span></div>
                <div class="row"><span class="label">IGC bodov:</span><span id="pIgcPoints" class="val">--</span></div>
                <div class="row"><span class="label">TEMP súbor:</span><span id="pTempFile" class="val">temptest.json</span></div>
                <div class="row"><span class="label">TEMP hladín:</span><span id="pTempLevels" class="val">--</span></div>
                <div class="row"><span class="label">Miesto:</span><span id="pSite" class="val">--</span></div>
                <div class="separator"></div>
                <div class="panel-subtitle">WIND GENERÁCIE</div>
                <div class="wind-generation-radio-group" role="radiogroup" aria-label="Režim generácie vetra">
                    <label><input type="radio" name="windGenerationModeMain" value="keep" checked> Zachovať poslednú generáciu</label>
                    <label><input type="radio" name="windGenerationModeMain" value="clear-last"> Vymazať poslednú generáciu</label>
                    <label><input type="radio" name="windGenerationModeMain" value="clear-all"> Vymazať všetky generácie z mapy</label>
                </div>
                <div class="wind-generation-mini-actions">
                    <button id="windClearTodayButtonMain" type="button" title="Ručne vymazať všetky dnešné generácie z GENauto a z mapy">Vymazať dnešné GENauto</button>
                    <button id="windLoadFromFilesButtonMain" type="button" title="Načítať vietor zo súborov GENauto/wind">Načítať vietor zo súborov</button>
                    <button id="mapLoadFromFilesButtonMain" type="button" title="Načítať mapové generácie zo súborov GENauto/map">Načítať mapu zo súborov</button>
                </div>
                <div class="row wind-compare-row">
                    <span class="label">Porovnať:</span>
                    <select id="windCompareGenerationMain" class="wind-compare-select" aria-label="Výber WIND generácie na porovnanie">
                        <option value="">Najprv načítaj uložené WIND generácie</option>
                    </select>
                </div>
                <div class="row map-compare-row">
                    <span class="label">Mapa:</span>
                    <select id="mapCompareGenerationMain" class="map-compare-select" aria-label="Výber mapovej generácie na porovnanie">
                        <option value="">Najprv načítaj uložené mapové generácie</option>
                    </select>
                </div>
            </div>
        </aside>

        <section id="debugConsole" class="debug-panel workspace-window" aria-label="Systémový monitor úloh">
            <div class="debug-header" title="Potiahni za hlavičku. Dvojklik vráti panel na pôvodné miesto.">
                <strong>SYSTÉMOVÝ MONITOR ÚLOH</strong>
                <div class="debug-actions">
                    <button id="hideDebugButton" type="button" title="Skryť diagnostický pult">Skryť</button>
                    <button id="clearDebugButton" type="button">Vyčistiť</button>
                    <span class="drag-symbol" aria-hidden="true">⠿</span>
                </div>
            </div>
            <div id="debugLog"></div>
        </section>

        <section id="skewTPanel" class="skewt-panel" aria-label="Skew‑T log‑P graf TEMP profilu" hidden>
            <div class="skewt-header" title="Potiahni okno za hlavičku. Veľkosť zmeníš pravým dolným rohom.">
                <div class="skewt-title-group">
                    <strong>SKEW‑T / LOG‑P · ATMOSFÉRICKÝ PROFIL</strong>
                    <span id="skewTFileName">TEMP</span>
                </div>
                <div class="skewt-actions">
                    <button id="resetSkewTViewButton" type="button" title="Vrátiť okno do stredu">◎ Stred</button>
                    <button id="closeSkewTButton" type="button" title="Zavrieť Skew‑T">×</button>
                </div>
            </div>
            <div class="skewt-meta">
                <span>Hladiny: <strong id="skewTLevels">--</strong></span>
                <span>Prízemie: <strong id="skewTSurface">--</strong></span>
                <span>Vrchol: <strong id="skewTTop">--</strong></span>
                <span>LCL: <strong id="skewTLcl">--</strong></span>
            </div>
            <div class="skewt-canvas-wrap">
                <canvas id="skewTCanvas"></canvas>
            </div>
        </section>
    </div>

    <script>
        let viewer = null;
        let bioChart = null;
        let windLoadingFromFiles = false;
        let mapLoadingFromFiles = false;
        let genAutoMapLayer = null;
        let windWebmExportBusy = false;
        let windLoadedRecords = [];
        let mapLoadedRecords = [];

        const windGenerationModeMainInputs = Array.from(document.querySelectorAll('input[name="windGenerationModeMain"]'));
        const windClearTodayButtonMain = document.getElementById("windClearTodayButtonMain");
        const windLoadFromFilesButtonMain = document.getElementById("windLoadFromFilesButtonMain");
        const mapLoadFromFilesButtonMain = document.getElementById("mapLoadFromFilesButtonMain");
        const windCompareGenerationMain = document.getElementById("windCompareGenerationMain");
        const mapCompareGenerationMain = document.getElementById("mapCompareGenerationMain");
        const windCachePreview = document.getElementById("windCachePreview");
        const windCachePreviewLabel = document.getElementById("windCachePreviewLabel");
        const windCacheVideo = document.getElementById("windCacheVideo");
        const closeWindCachePreviewButton = document.getElementById("closeWindCachePreviewButton");

        function getWindGenerationModeMain() {
            const checked = windGenerationModeMainInputs.find((input) => input.checked);
            return String(checked?.value || "keep");
        }

        function resolveWindGenerationConfigMain() {
            const mode = getWindGenerationModeMain();
            if (mode === "keep") {
                return {
                    mode,
                    preservePrevious: true,
                    clearMode: "none",
                    label: "zachovať predošlé"
                };
            }
            if (mode === "clear-last") {
                return {
                    mode,
                    preservePrevious: false,
                    clearMode: "last",
                    label: "zmazať poslednú"
                };
            }
            return {
                mode: "clear-all",
                preservePrevious: false,
                clearMode: "all",
                label: "zmazať všetko"
            };
        }

        async function genAutoRequest(action, payload = {}) {
            const response = await fetch("genauto.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ action, ...payload })
            });

            let data = null;
            try {
                data = await response.json();
            } catch (_) {
                throw new Error("GENauto endpoint vrátil neplatný JSON.");
            }

            if (!response.ok || data?.status !== "success") {
                throw new Error(String(data?.message || "GENauto operácia zlyhala."));
            }

            return data;
        }

        async function persistGenerationAuto(kind, center, payload, tempMeta = {}) {
            if (!center || !Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lon))) {
                return;
            }

            try {
                return await genAutoRequest("saveGeneration", {
                    kind,
                    center,
                    payload,
                    ...tempMeta
                });
            } catch (error) {
                logStatus("GENauto zapis pre " + kind + " zlyhal: " + error.message, "error");
            }
        }

        function selectWindWebmMimeType() {
            if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== "function") {
                return "";
            }

            const candidates = [
                "video/webm;codecs=vp9",
                "video/webm;codecs=vp8",
                "video/webm"
            ];

            for (const type of candidates) {
                if (MediaRecorder.isTypeSupported(type)) return type;
            }

            return "";
        }

        function blobToBase64(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = String(reader.result || "");
                    const commaIndex = result.indexOf(",");
                    resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
                };
                reader.onerror = () => reject(new Error("Nepodarilo sa previesť WebM blob na base64."));
                reader.readAsDataURL(blob);
            });
        }

        function captureCanvasWebmBlob(viewerInstance, durationMs = 1800, fps = 12) {
            return new Promise((resolve, reject) => {
                const canvas = viewerInstance?.scene?.canvas;
                if (!canvas || typeof canvas.captureStream !== "function") {
                    reject(new Error("Canvas captureStream nie je dostupný."));
                    return;
                }
                if (!window.MediaRecorder) {
                    reject(new Error("MediaRecorder nie je dostupný."));
                    return;
                }

                const stream = canvas.captureStream(Math.max(1, Number(fps) || 12));
                const mimeType = selectWindWebmMimeType();
                const options = { videoBitsPerSecond: 3500000 };
                if (mimeType) options.mimeType = mimeType;

                let recorder = null;
                const chunks = [];
                const cleanup = () => {
                    stream.getTracks().forEach((track) => {
                        try { track.stop(); } catch (_) {}
                    });
                    recorder = null;
                };

                try {
                    recorder = new MediaRecorder(stream, options);
                } catch (error) {
                    cleanup();
                    reject(error);
                    return;
                }

                recorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) chunks.push(event.data);
                };
                recorder.onerror = (event) => {
                    cleanup();
                    reject(event?.error || new Error("Neznáma chyba pri zázname WebM."));
                };
                recorder.onstop = () => {
                    const mime = recorder?.mimeType || mimeType || "video/webm";
                    cleanup();
                    resolve(new Blob(chunks, { type: mime }));
                };

                recorder.start(1000);
                window.setTimeout(() => {
                    if (recorder && recorder.state === "recording") {
                        try {
                            recorder.stop();
                        } catch (error) {
                            cleanup();
                            reject(error);
                        }
                    }
                }, Math.max(800, Number(durationMs) || 1800));
            });
        }

        function showWindCachePreview(webmUrl, labelText = "WIND cache") {
            if (!windCachePreview || !windCacheVideo) return;

            windCachePreview.hidden = false;
            if (windCachePreviewLabel) windCachePreviewLabel.textContent = labelText;
            windCacheVideo.pause();
            windCacheVideo.removeAttribute("src");
            windCacheVideo.load();
            windCacheVideo.src = webmUrl + "?v=" + Date.now();
            windCacheVideo.loop = true;
            windCacheVideo.play().catch(() => {});
        }

        function hideWindCachePreview() {
            if (!windCachePreview || !windCacheVideo) return;
            windCacheVideo.pause();
            windCacheVideo.removeAttribute("src");
            windCacheVideo.load();
            windCachePreview.hidden = true;
        }

        function formatWindCompareLabel(record, index) {
            const time = record?.generated_at_utc ? String(record.generated_at_utc).slice(11, 19) : "--:--:--";
            const mode = String(record?.payload?.generationMode || "-");
            const hasWebm = record?.webm_exists === true ? "webm" : "json";
            return String(index + 1) + " · " + time + " · " + mode + " · " + hasWebm;
        }

        function populateWindCompareSelector(records) {
            if (!windCompareGenerationMain) return;

            windCompareGenerationMain.replaceChildren();

            const emptyOption = document.createElement("option");
            emptyOption.value = "";
            emptyOption.textContent = records.length ? "Vyber WIND generáciu" : "Najprv načítaj uložené WIND generácie";
            windCompareGenerationMain.appendChild(emptyOption);

            records.forEach((record, index) => {
                const option = document.createElement("option");
                option.value = String(record.file || "");
                option.textContent = formatWindCompareLabel(record, index);
                windCompareGenerationMain.appendChild(option);
            });

            if (records.length) {
                windCompareGenerationMain.value = String(records[records.length - 1]?.file || "");
            } else {
                windCompareGenerationMain.value = "";
            }
        }

        function getSelectedWindRecord() {
            const selectedFile = String(windCompareGenerationMain?.value || "");
            if (!selectedFile) return null;
            return windLoadedRecords.find((record) => String(record.file || "") === selectedFile) || null;
        }

        function selectWindCompareRecordByFile(file) {
            if (!windCompareGenerationMain) return;
            windCompareGenerationMain.value = String(file || "");
        }

        async function showSelectedWindRecord() {
            const record = getSelectedWindRecord();
            if (!record) {
                hideWindCachePreview();
                return;
            }

            const webmUrl = record.file ? makeGenAutoWebmUrl(record.file) : "";
            if (record.webm_exists === true && webmUrl) {
                showWindCachePreview(webmUrl, formatWindCompareLabel(record, windLoadedRecords.indexOf(record)));
                return;
            }

            hideWindCachePreview();

            const payload = record.payload && typeof record.payload === "object" ? record.payload : {};
            await renderWindLayer("porovnanie: " + (record.file || "GENauto"), {
                centerOverride: payload.focusCenter || record.center,
                tempProfileOverride: Array.isArray(payload.tempProfile) ? payload.tempProfile : null,
                windOverrides: payload.windSettings && typeof payload.windSettings === "object" ? payload.windSettings : {},
                generationConfigOverride: { mode: "keep", preservePrevious: true, clearMode: "none", label: "porovnanie" },
                skipAutoRecord: true
            });
        }

        function formatMapCompareLabel(record, index) {
            const time = record?.generated_at_utc ? String(record.generated_at_utc).slice(11, 19) : "--:--:--";
            const mode = String(record?.payload?.generationMode || "-");
            return String(index + 1) + " · " + time + " · " + mode;
        }

        function populateMapCompareSelector(records) {
            if (!mapCompareGenerationMain) return;

            mapCompareGenerationMain.replaceChildren();

            const emptyOption = document.createElement("option");
            emptyOption.value = "";
            emptyOption.textContent = records.length ? "Vyber mapovú generáciu" : "Najprv načítaj uložené mapové generácie";
            mapCompareGenerationMain.appendChild(emptyOption);

            records.forEach((record, index) => {
                const option = document.createElement("option");
                option.value = String(record.file || "");
                option.textContent = formatMapCompareLabel(record, index);
                mapCompareGenerationMain.appendChild(option);
            });

            mapCompareGenerationMain.value = records.length ? String(records[records.length - 1]?.file || "") : "";
        }

        function getSelectedMapRecord() {
            const selectedFile = String(mapCompareGenerationMain?.value || "");
            if (!selectedFile) return null;
            return mapLoadedRecords.find((record) => String(record.file || "") === selectedFile) || null;
        }

        async function showSelectedMapRecord() {
            const record = getSelectedMapRecord();
            if (!record) {
                clearGenAutoMapLayer();
                return;
            }

            const center = record?.center || record?.payload?.focusCenter || null;
            const payload = record.payload && typeof record.payload === "object" ? record.payload : {};
            await renderMapGenerationsInScene([{
                ...record,
                center: center,
                payload
            }]);
        }

        function makeGenAutoWebmUrl(jsonFile) {
            const safeFile = String(jsonFile || "").trim();
            if (!safeFile) return "";
            return "genauto.php?action=getWebm&kind=wind&json_file=" + encodeURIComponent(safeFile);
        }

        async function persistWindWebmAuto(jsonFile, center, meta = {}) {
            if (windWebmExportBusy) return null;
            if (!jsonFile || String(jsonFile).trim() === "") return null;
            if (!viewer || viewer.isDestroyed()) return null;

            if (!window.MediaRecorder || typeof viewer.scene?.canvas?.captureStream !== "function") {
                logStatus("WIND WebM cache: prehliadač nepodporuje záznam canvasu.", "info");
                return null;
            }

            windWebmExportBusy = true;
            try {
                const blob = await captureCanvasWebmBlob(viewer, 1800, 12);
                if (!blob || blob.size < 256) {
                    throw new Error("WebM záznam je prázdny alebo príliš malý.");
                }

                const base64 = await blobToBase64(blob);
                const response = await genAutoRequest("saveWebm", {
                    kind: "wind",
                    json_file: jsonFile,
                    center,
                    generation: meta,
                    webm_base64: base64
                });

                logStatus("WIND WebM cache uložená: " + String(response.file || jsonFile.replace(/\.json$/i, ".webm")) + ".", "success");
                return response;
            } catch (error) {
                logStatus("WIND WebM cache sa nepodarilo uložiť: " + error.message, "error");
                return null;
            } finally {
                windWebmExportBusy = false;
            }
        }

        function logStatus(text, statusType = "info") {
            const consoleLog = document.getElementById("debugLog");
            if (!consoleLog) return;

            const p = document.createElement("div");
            p.className = "debug-line " + statusType;
            p.textContent = "[" + new Date().toLocaleTimeString() + "] " + text;
            consoleLog.appendChild(p);
            consoleLog.scrollTop = consoleLog.scrollHeight;
        }

        function logTempProfileSummary(contextLabel = "RESET") {
            const profile = Array.isArray(window.PilotNetwork?.liveAtmosferaTEMP)
                ? window.PilotNetwork.liveAtmosferaTEMP
                : [];

            if (profile.length < 2) {
                logStatus("TEMP profil: nie je načítaný alebo nemá dosť hladín (" + contextLabel + ").", "info");
                return;
            }

            const valid = profile
                .filter((row) => Number.isFinite(Number(row.z_m)))
                .sort((a, b) => Number(a.z_m) - Number(b.z_m));

            if (valid.length < 2) {
                logStatus("TEMP profil: načítaný, ale bez validných výškových hladín (" + contextLabel + ").", "info");
                return;
            }

            const surface = valid[0];
            const top = valid[valid.length - 1];
            const surfaceWind = Number.isFinite(Number(surface.w_speed_kts))
                ? (Number(surface.w_speed_kts) * 0.514444).toFixed(1) + " m/s @ " + Math.round(Number(surface.w_dir_deg) || 0) + "°"
                : "--";
            const topWind = Number.isFinite(Number(top.w_speed_kts))
                ? (Number(top.w_speed_kts) * 0.514444).toFixed(1) + " m/s @ " + Math.round(Number(top.w_dir_deg) || 0) + "°"
                : "--";

            logStatus(
                "TEMP profil (" + contextLabel + "): " + valid.length +
                " hladín, spodok z=" + Math.round(Number(surface.z_m) || 0) + " m" +
                ", vrch z=" + Math.round(Number(top.z_m) || 0) + " m" +
                ", vietor pri zemi " + surfaceWind +
                ", vietor hore " + topWind + ".",
                "info"
            );
        }

        function setMapState(text, type = "info") {
            const state = document.getElementById("mapState");
            if (!state) return;
            state.textContent = text;
            state.className = "state-badge " + type;
        }

        function resizeCesium() {
            if (!viewer || viewer.isDestroyed()) return;
            window.setTimeout(() => {
                viewer.resize();
                viewer.scene.requestRender();
            }, 120);
        }

        async function renderWindLayer(reason = "", options = {}) {
            if (!viewer || viewer.isDestroyed()) return;
            if (!window.WindUI || !window.WindField || !window.WindRender || !window.WindTempLoader) {
                logStatus("WIND vrstva nie je dostupná (moduly sa nenačítali).", "error");
                return;
            }

            const points = Array.isArray(window.PilotNetwork?.letoveBody) ? window.PilotNetwork.letoveBody : [];
            const idxRaw = Number(window.PilotNetwork?.currentIndex);
            const idx = Number.isFinite(idxRaw)
                ? Math.max(0, Math.min(Math.max(0, points.length - 1), Math.round(idxRaw)))
                : 0;
            const point = points[idx] || points[0] || null;

            const centerCandidate = options.centerOverride || (point ? { lat: Number(point.lat), lon: Number(point.lon) } : null);
            const center = centerCandidate
                ? { lat: Number(centerCandidate.lat), lon: Number(centerCandidate.lon) }
                : null;

            if (!Number.isFinite(center.lat) || !Number.isFinite(center.lon)) {
                logStatus("WIND vrstva: neplatný stred výpočtu.", "error");
                return;
            }

            const generationCfg = options.generationConfigOverride || resolveWindGenerationConfigMain();
            const skipAutoRecord = options.skipAutoRecord === true;
            const windOverrides = options.windOverrides && typeof options.windOverrides === "object"
                ? options.windOverrides
                : {};

            const renderOptions = {
                seedEvery: 3,
                maxSteps: 42,
                stepMeters: 90,
                radiusM: 1200,
                spacingM: 120,
                allowFallbackBaseVector: false,
                useTempProfileWind: true,
                maxVerticalMs: 4.0,
                maxVerticalRatio: 0.35,
                coolingZones: [],
                animationEnabled: false,
                ...windOverrides,
                preservePrevious: generationCfg.preservePrevious,
                clearMode: generationCfg.clearMode
            };

            const tempProfile = Array.isArray(options.tempProfileOverride)
                ? options.tempProfileOverride
                : (Array.isArray(window.PilotNetwork?.liveAtmosferaTEMP)
                    ? window.PilotNetwork.liveAtmosferaTEMP
                    : null);

            window.WindUI.init({
                aglM: renderOptions.aglM ?? 260,
                radiusM: renderOptions.radiusM,
                spacingM: renderOptions.spacingM,
                allowFallbackBaseVector: renderOptions.allowFallbackBaseVector,
                useTempProfileWind: renderOptions.useTempProfileWind,
                tempSourceMode: "auto",
                tempSourceUrl: "XCtrack/temp.json",
                colorMode: "tempDeltaK",
                colorTheme: "dark",
                animationEnabled: renderOptions.animationEnabled,
                preservePrevious: generationCfg.preservePrevious,
                clearMode: generationCfg.clearMode,
                maxVerticalMs: renderOptions.maxVerticalMs,
                maxVerticalRatio: renderOptions.maxVerticalRatio,
                source: "ODVODENE"
            });

            try {
                const windResult = await window.WindUI.runDemo(viewer, center, {
                    tempProfile,
                    ...renderOptions
                });

                const rendered = Number(windResult?.stats?.rendered) || 0;
                const seeds = Number(windResult?.stats?.streamlines) || 0;
                const activeLayers = Number(windResult?.stats?.activeLayers) || 0;
                const generationId = Number(windResult?.stats?.generationId) || 0;
                if (rendered > 0) {
                    logStatus(
                        "WIND: vykreslených prúdnic " + rendered + " / seedov " + seeds +
                        " / vrstiev " + activeLayers +
                        ", generácie: " + generationCfg.label +
                        (reason ? " (" + reason + ")" : ""),
                        "success"
                    );
                } else {
                    logStatus(
                        "WIND: nevznikli žiadne prúdnice" + (reason ? " (" + reason + ")" : "") + ".",
                        "error"
                    );
                }

                if (!skipAutoRecord) {
                    const tempMeta = {
                        temp_profile: Array.isArray(tempProfile) ? tempProfile : null,
                        temp_source: window.WindUI?.state?.lastTempSource || null
                    };

                    const mapPayload = {
                        reason,
                        generationMode: generationCfg.mode,
                        generationId,
                        rendered,
                        activeLayers,
                        focusCenter: center,
                        currentIndex: idx,
                        flightPoint: point
                            ? {
                                lat: Number(point.lat),
                                lon: Number(point.lon),
                                time_s: Number(point.time_s),
                                render_alt_m: Number(point.render_alt_m),
                                agl_m: Number(point.agl_m)
                            }
                            : null
                    };

                    const windPayload = {
                        reason,
                        generationMode: generationCfg.mode,
                        generationId,
                        rendered,
                        seeds,
                        activeLayers,
                        focusCenter: center,
                        windSettings: {
                            ...renderOptions,
                            preservePrevious: generationCfg.preservePrevious,
                            clearMode: generationCfg.clearMode
                        },
                        tempProfile: Array.isArray(tempProfile) ? tempProfile : null,
                        tempSource: window.WindUI?.state?.lastTempSource || null
                    };

                    await persistGenerationAuto("map", center, mapPayload, tempMeta);
                    const windSaveResult = await persistGenerationAuto("wind", center, windPayload, tempMeta);

                    if (windSaveResult?.file) {
                        const webmMeta = {
                            rendered,
                            seeds,
                            generationId,
                            generationMode: generationCfg.mode,
                            activeLayers
                        };
                        const webmSaveResult = await persistWindWebmAuto(windSaveResult.file, center, webmMeta);
                        if (webmSaveResult?.file) {
                            logStatus("WIND cache pripravená: " + webmSaveResult.file + ".", "info");
                        }
                    }
                }

                return windResult;
            } catch (error) {
                logStatus("WIND vrstvu sa nepodarilo vykresliť: " + error.message, "error");
                return null;
            }
        }

        async function loadWindFromGenAutoFiles() {
            if (!viewer || viewer.isDestroyed()) {
                logStatus("WIND: mapa ešte nie je pripravená na načítanie zo súborov.", "error");
                return;
            }
            if (windLoadingFromFiles) {
                logStatus("WIND: načítanie zo súborov už prebieha.", "info");
                return;
            }

            windLoadingFromFiles = true;
            windLoadFromFilesButtonMain.disabled = true;
            const originalButtonText = windLoadFromFilesButtonMain.textContent;
            windLoadFromFilesButtonMain.textContent = "… načítavam";
            hideWindCachePreview();

            try {
                const response = await genAutoRequest("listWindToday", { limit: 300 });
                const records = Array.isArray(response.records) ? response.records : [];

                if (!records.length) {
                    windLoadedRecords = [];
                    populateWindCompareSelector([]);
                    logStatus("GENauto: pre dnešok nie sú uložené žiadne WIND súbory.", "info");
                    return;
                }

                windLoadedRecords = records.slice();
                populateWindCompareSelector(windLoadedRecords);
                window.WindRender?.clear?.(viewer, "all");
                logStatus("GENauto: načítaných WIND generácií " + records.length + ".", "info");

                if (windCompareGenerationMain?.value) {
                    await showSelectedWindRecord();
                }

                logStatus("GENauto: načítanie súborov dokončené.", "success");
            } catch (error) {
                logStatus("GENauto: načítanie vetra zo súborov zlyhalo: " + error.message, "error");
            } finally {
                windLoadingFromFiles = false;
                windLoadFromFilesButtonMain.disabled = false;
                windLoadFromFilesButtonMain.textContent = originalButtonText;
            }
        }

        function clearGenAutoMapLayer() {
            if (!viewer || viewer.isDestroyed()) return;
            if (!genAutoMapLayer) return;
            viewer.dataSources.remove(genAutoMapLayer, true);
            genAutoMapLayer = null;
        }

        function formatUtcTimeShort(isoText) {
            const date = new Date(String(isoText || ""));
            if (Number.isNaN(date.getTime())) return "--:--:--";
            return date.toISOString().slice(11, 19);
        }

        async function renderMapGenerationsInScene(records) {
            if (!viewer || viewer.isDestroyed() || !window.Cesium) return;

            clearGenAutoMapLayer();

            const ds = new Cesium.CustomDataSource("GENAUTO_MAP_POINTS");
            const positions = [];

            records.forEach((record, index) => {
                const center = record?.center || record?.payload?.focusCenter || null;
                const lat = Number(center?.lat);
                const lon = Number(center?.lon);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

                const cart = Cesium.Cartesian3.fromDegrees(lon, lat, 26);
                positions.push(cart);

                const localTime = formatUtcTimeShort(record.generated_at_utc);
                const mode = String(record?.payload?.generationMode || "-");

                ds.entities.add({
                    position: cart,
                    point: {
                        pixelSize: 7,
                        color: Cesium.Color.fromCssColorString("#FFD166"),
                        outlineColor: Cesium.Color.fromCssColorString("#2A1A00"),
                        outlineWidth: 1
                    },
                    label: {
                        text: String(index + 1) + " · " + localTime + " · " + mode,
                        font: "11px monospace",
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        fillColor: Cesium.Color.fromCssColorString("#FFF5D6"),
                        outlineColor: Cesium.Color.fromCssColorString("#1D1D1D"),
                        outlineWidth: 2,
                        pixelOffset: new Cesium.Cartesian2(14, -10),
                        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
                        verticalOrigin: Cesium.VerticalOrigin.CENTER,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY
                    },
                    properties: {
                        type: "GENAUTO_MAP_POINT",
                        generated_at_utc: String(record.generated_at_utc || ""),
                        generation_mode: mode
                    }
                });
            });

            if (positions.length >= 2) {
                ds.entities.add({
                    polyline: {
                        positions,
                        width: 2,
                        material: Cesium.Color.fromCssColorString("#FFD166").withAlpha(0.75)
                    },
                    properties: {
                        type: "GENAUTO_MAP_PATH"
                    }
                });
            }

            genAutoMapLayer = ds;
            await viewer.dataSources.add(ds);

            if (positions.length >= 2) {
                const bounds = Cesium.BoundingSphere.fromPoints(positions);
                viewer.camera.flyToBoundingSphere(bounds, {
                    duration: 1.8,
                    offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-38), Math.max(900, bounds.radius * 2.2))
                });
                return;
            }

            if (positions.length === 1) {
                const cartographic = Cesium.Cartographic.fromCartesian(positions[0]);
                if (cartographic) {
                    viewer.camera.flyTo({
                        destination: Cesium.Cartesian3.fromRadians(
                            cartographic.longitude,
                            cartographic.latitude,
                            2600
                        ),
                        duration: 1.5
                    });
                }
            }
        }

        async function loadMapFromGenAutoFiles() {
            if (!viewer || viewer.isDestroyed()) {
                logStatus("MAPA: scéna ešte nie je pripravená.", "error");
                return;
            }
            if (mapLoadingFromFiles) {
                logStatus("MAPA: načítanie mapových generácií už prebieha.", "info");
                return;
            }

            mapLoadingFromFiles = true;
            mapLoadFromFilesButtonMain.disabled = true;
            const originalButtonText = mapLoadFromFilesButtonMain.textContent;
            mapLoadFromFilesButtonMain.textContent = "… načítavam";

            try {
                const response = await genAutoRequest("listMapToday", { limit: 1000 });
                const records = Array.isArray(response.records) ? response.records : [];
                if (!records.length) {
                    mapLoadedRecords = [];
                    populateMapCompareSelector([]);
                    clearGenAutoMapLayer();
                    logStatus("GENauto: pre dnešok nie sú uložené žiadne mapové generácie.", "info");
                    return;
                }

                mapLoadedRecords = records.slice();
                populateMapCompareSelector(mapLoadedRecords);
                await showSelectedMapRecord();
                logStatus("GENauto: načítaných mapových generácií " + records.length + ".", "success");
            } catch (error) {
                logStatus("GENauto: načítanie mapových generácií zlyhalo: " + error.message, "error");
            } finally {
                mapLoadingFromFiles = false;
                mapLoadFromFilesButtonMain.disabled = false;
                mapLoadFromFilesButtonMain.textContent = originalButtonText;
            }
        }

        function setCameraModeUi(mode) {
            document.querySelectorAll(".camera-mode-button").forEach((button) => {
                button.classList.toggle("is-active", button.dataset.cameraMode === mode);
            });
        }

        window.logStatus = logStatus;
        window.setMapState = setMapState;
        window.resizeCesium = resizeCesium;
        window.setCameraModeUi = setCameraModeUi;

        window.onerror = function (msg, url, line) {
            logStatus("CRITICAL ERROR: " + msg + " (riadok " + line + ")", "error");
            return false;
        };

        window.addEventListener("unhandledrejection", function (event) {
            const reason = event.reason?.message || String(event.reason);
            logStatus("NEZACHYTENÁ ASYNCHRÓNNA CHYBA: " + reason, "error");
        });

        document.getElementById("clearDebugButton").addEventListener("click", () => {
            document.getElementById("debugLog").replaceChildren();
            logTempProfileSummary("RESET");
        });

        windClearTodayButtonMain?.addEventListener("click", async () => {
            if (!viewer || viewer.isDestroyed()) {
                logStatus("GENauto: mapa ešte nie je pripravená.", "error");
                return;
            }

            windClearTodayButtonMain.disabled = true;
            const originalText = windClearTodayButtonMain.textContent;
            windClearTodayButtonMain.textContent = "… mažem";

            try {
                const removedLayers = Number(window.WindRender?.clear?.(viewer, "all") || 0);
                clearGenAutoMapLayer();
                const response = await genAutoRequest("clearToday", { kinds: ["map", "wind"] });
                const deletedMap = Number(response.deleted?.map || 0);
                const deletedWind = Number(response.deleted?.wind || 0);

                logStatus(
                    "GENauto: zmazané dnešné súbory map=" + deletedMap + ", wind=" + deletedWind +
                    "; odstránené vrstvy z mapy=" + removedLayers + ".",
                    "success"
                );
            } catch (error) {
                logStatus("GENauto: mazanie dnešných generácií zlyhalo: " + error.message, "error");
            } finally {
                windClearTodayButtonMain.disabled = false;
                windClearTodayButtonMain.textContent = originalText;
            }
        });

        windLoadFromFilesButtonMain?.addEventListener("click", async () => {
            await loadWindFromGenAutoFiles();
        });

        windCompareGenerationMain?.addEventListener("change", async () => {
            if (!windLoadedRecords.length) return;
            await showSelectedWindRecord();
        });

        mapCompareGenerationMain?.addEventListener("change", async () => {
            if (!mapLoadedRecords.length) return;
            await showSelectedMapRecord();
        });

        mapLoadFromFilesButtonMain?.addEventListener("click", async () => {
            await loadMapFromGenAutoFiles();
        });

        closeWindCachePreviewButton?.addEventListener("click", () => {
            hideWindCachePreview();
        });

        hideWindCachePreview();

        document.getElementById("hideDebugButton").addEventListener("click", () => {
            window.WorkspacePanels?.toggleDebug(false);
        });

        document.getElementById("toggleDebugButton").addEventListener("click", () => {
            window.WorkspacePanels?.toggleDebug();
        });

        document.getElementById("resetPanelLayoutButton").addEventListener("click", () => {
            window.WorkspacePanels?.resetAll();
        });

        document.getElementById("focusFlightButton").addEventListener("click", () => {
            if (!viewer || !window.CesiumRender) return;
            CesiumRender.nastavRezimKamery(viewer, "overview", PilotNetwork.letoveBody, PilotNetwork.currentIndex);
        });

        document.querySelectorAll(".camera-mode-button").forEach((button) => {
            button.addEventListener("click", () => {
                if (!viewer || !window.CesiumRender) return;
                CesiumRender.nastavRezimKamery(
                    viewer,
                    button.dataset.cameraMode,
                    PilotNetwork.letoveBody,
                    PilotNetwork.currentIndex
                );
            });
        });

        document.getElementById("playPauseButton").addEventListener("click", () => {
            if (!window.PilotNetwork) return;
            PilotNetwork.prepniPrehravanie();
        });

        document.getElementById("stopPlaybackButton").addEventListener("click", () => {
            if (!window.PilotNetwork) return;
            PilotNetwork.zastavPrehravanie();
        });

        document.getElementById("flightTimeline").addEventListener("input", (event) => {
            if (!window.PilotNetwork) return;
            PilotNetwork.posunNaIndex(Number(event.target.value), { obnovGraf: true });
        });

        const igcInput = document.getElementById("igcFileInput");
        const igcTempSourceSelect = document.getElementById("igcTempSourceSelect");
        const igcTempCustomUrl = document.getElementById("igcTempCustomUrl");
        const loadIgcButton = document.getElementById("loadIgcButton");

        function resolveIgcTempSourceUrl() {
            const selected = String(igcTempSourceSelect?.value || "").trim();
            if (selected === "custom") {
                const custom = String(igcTempCustomUrl?.value || "").trim();
                return custom || "XCtrack/temptest.json";
            }
            return selected || "XCtrack/temptest.json";
        }

        function syncIgcTempSourceUi() {
            if (!igcTempSourceSelect || !igcTempCustomUrl) return;
            const customMode = String(igcTempSourceSelect.value || "") === "custom";
            igcTempCustomUrl.hidden = !customMode;
            if (!customMode) {
                igcTempCustomUrl.value = "";
            }
        }

        igcTempSourceSelect?.addEventListener("change", syncIgcTempSourceUi);
        syncIgcTempSourceUi();

        loadIgcButton.addEventListener("click", () => igcInput.click());

        igcInput.addEventListener("change", async () => {
            const file = igcInput.files?.[0];
            if (!file || !viewer || !window.PilotNetwork) return;

            loadIgcButton.disabled = true;
            loadIgcButton.textContent = "… Načítavam";

            try {
                if (typeof PilotNetwork.nacitajTempProfilPreIgc === "function") {
                    const selectedTempUrl = resolveIgcTempSourceUrl();
                    const tempResult = await PilotNetwork.nacitajTempProfilPreIgc(selectedTempUrl);
                    PilotNetwork.liveAtmosferaTEMP = tempResult.profile;
                    PilotNetwork.tempSourceName = tempResult.source;
                    PilotNetwork.lclVyska = window.MeteoCore?.vypocitajLclZProfily?.(tempResult.profile) ?? PilotNetwork.lclVyska;
                    PilotNetwork.aktualizujTempUi?.();
                    window.SkewTRender?.setProfile?.(tempResult.profile, tempResult.source);
                    logStatus("IGC: TEMP zdroj nastavený na " + tempResult.source + ".", "info");
                }

                await PilotNetwork.nacitajLokalnyIgcSubor(file, viewer, bioChart);
                await renderWindLayer("lokálny IGC");
            } catch (error) {
                logStatus("Lokálny IGC súbor sa nepodarilo načítať: " + error.message, "error");
            } finally {
                loadIgcButton.disabled = false;
                loadIgcButton.textContent = "⇧ Načítať IGC";
                igcInput.value = "";
            }
        });

        const tempInput = document.getElementById("tempFileInput");
        const loadTempButton = document.getElementById("loadTempButton");

        loadTempButton.addEventListener("click", () => tempInput.click());

        tempInput.addEventListener("change", async () => {
            const file = tempInput.files?.[0];
            if (!file || !window.PilotNetwork) return;

            loadTempButton.disabled = true;
            loadTempButton.textContent = "… Načítavam TEMP";

            try {
                await PilotNetwork.nacitajLokalnyTempSubor(file);
                window.SkewTRender?.toggle(true);
                await renderWindLayer("lokálny TEMP");
            } catch (error) {
                logStatus("TEMP súbor sa nepodarilo načítať: " + error.message, "error");
                setMapState("CHYBA TEMP", "error");
            } finally {
                loadTempButton.disabled = false;
                loadTempButton.textContent = "⇧ Načítať TEMP";
                tempInput.value = "";
            }
        });

        document.getElementById("toggleFullscreenButton").addEventListener("click", async () => {
            const mapPanel = document.getElementById("mapPanel");
            try {
                if (!document.fullscreenElement) {
                    await mapPanel.requestFullscreen();
                } else {
                    await document.exitFullscreen();
                }
            } catch (error) {
                logStatus("Celú obrazovku sa nepodarilo zapnúť: " + error.message, "error");
            }
        });

        document.addEventListener("fullscreenchange", () => {
            const button = document.getElementById("toggleFullscreenButton");
            button.textContent = document.fullscreenElement ? "↙ Späť do panelu" : "⛶ Celá obrazovka";
            resizeCesium();
        });

        window.addEventListener("resize", resizeCesium);

        async function spustiAplikaciu() {
            logStatus("Spúšťam jadro systému...");
            setMapState("ŠTARTUJEM");

            if (typeof Cesium === "undefined") {
                logStatus("CesiumJS sa nenačítal. Skontroluj CDN alebo blokovanie siete.", "error");
                setMapState("CHYBA CESIUM", "error");
                return;
            }

            if (!window.PilotNetwork || typeof window.PilotNetwork.spracujIgcSubor !== "function") {
                logStatus("Modul pilot-network.js je starý alebo ostal v cache. Chýba metóda spracujIgcSubor().", "error");
                setMapState("CHYBA MODULU", "error");
                return;
            }

            Cesium.Ion.defaultAccessToken = <?php echo json_encode(CESIUM_ACCESS_TOKEN, JSON_UNESCAPED_SLASHES); ?>;
            logStatus("Cesium ion token bol integrovaný.", "success");

            try {
                logStatus("Inicializujem CesiumJS 1.143 a svetový 3D terén...");
                viewer = new Cesium.Viewer("cesiumContainer", {
                    terrain: Cesium.Terrain.fromWorldTerrain(),
                    animation: false,
                    timeline: false,
                    infoBox: false,
                    selectionIndicator: false,
                    fullscreenButton: false,
                    navigationHelpButton: false,
                    homeButton: true,
                    geocoder: false
                });
                window.termikaViewer = viewer;
                logStatus("3D glóbus a terén boli úspešne naštartované.", "success");
                setMapState("MAPA PRIPRAVENÁ", "success");
            } catch (error) {
                logStatus("Zlyhanie inicializácie 3D mapy: " + error.message, "error");
                setMapState("CHYBA MAPY", "error");
                return;
            }

            try {
                CesiumRender.vykresli3DZakazanyPriestorCTR(viewer, 46.43, 11.85, 3000, 1000);
                logStatus("3D priestor CTR bol vygenerovaný.", "success");
            } catch (error) {
                logStatus("Chyba renderu CTR: " + error.message, "error");
            }

            if (typeof Chart === "undefined") {
                logStatus("Chart.js sa nenačítal. Mapa pobeží bez biometrického grafu.", "error");
            } else {
                try {
                    const chartCtx = document.getElementById("liveBioChart").getContext("2d");
                    bioChart = new Chart(chartCtx, {
                        type: "line",
                        data: {
                            labels: [],
                            datasets: [
                                { label: "SpO₂ (%)", data: [], borderColor: "#ffea00", borderWidth: 2, pointRadius: 0, yAxisID: "y" },
                                { label: "Tep (BPM)", data: [], borderColor: "#00e5ff", borderWidth: 2, pointRadius: 0, yAxisID: "y1" }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            animation: false,
                            scales: {
                                y: { type: "linear", display: true, position: "left", ticks: { color: "#fff" } },
                                y1: { type: "linear", display: true, position: "right", grid: { drawOnChartArea: false }, ticks: { color: "#fff" } }
                            },
                            plugins: { legend: { labels: { color: "#fff", font: { size: 9 } } } }
                        }
                    });
                    logStatus("Biometrické grafy sú pripravené.", "success");
                } catch (error) {
                    logStatus("Chyba Chart.js: " + error.message, "error");
                }
            }

            try {
                logStatus("Načítavam IGC, TEMP a GLIDER dáta...");
                setMapState("NAČÍTAVAM IGC");
                const startupTempUrl = resolveIgcTempSourceUrl();
                await PilotNetwork.spracujIgcSubor(
                    "XCtrack/let.igc",
                    startupTempUrl,
                    "XCtrack/glider.json",
                    viewer,
                    bioChart
                );
                await renderWindLayer("štart");
            } catch (error) {
                logStatus("Spracovanie letových dát zlyhalo: " + error.message, "error");
                setMapState("CHYBA IGC", "error");
            }
        }

        spustiAplikaciu();
    </script>
</body>
</html>

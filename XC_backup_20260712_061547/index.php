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
$assetVersion = '20260711-06';
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

    <script src="js/meteo-core.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/glider-core.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/pilot-network.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/cesium-render.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/workspace-ui.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
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
                    <button id="loadIgcButton" type="button" title="Načítať iný záznam letu z počítača">⇧ Načítať IGC</button>
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
                <div class="row"><span class="label">Poloha IGC:</span><span id="pPosition" class="val">--</span></div>
                <div class="row"><span class="label">Základňa (LCL):</span><span id="pLcl" class="val magenta">Vypočítavam...</span></div>
                <div class="row"><span class="label">Priestor CTR:</span><span id="pAirspace" class="val">Bezpečný</span></div>
                <div class="separator"></div>
                <div class="row"><span class="label">IGC súbor:</span><span id="pIgcFile" class="val">let.igc</span></div>
                <div class="row"><span class="label">IGC bodov:</span><span id="pIgcPoints" class="val">--</span></div>
                <div class="row"><span class="label">Miesto:</span><span id="pSite" class="val">--</span></div>
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
    </div>

    <script>
        let viewer = null;
        let bioChart = null;

        function logStatus(text, statusType = "info") {
            const consoleLog = document.getElementById("debugLog");
            if (!consoleLog) return;

            const p = document.createElement("div");
            p.className = "debug-line " + statusType;
            p.textContent = "[" + new Date().toLocaleTimeString() + "] " + text;
            consoleLog.appendChild(p);
            consoleLog.scrollTop = consoleLog.scrollHeight;
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
        });

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
        const loadIgcButton = document.getElementById("loadIgcButton");

        loadIgcButton.addEventListener("click", () => igcInput.click());

        igcInput.addEventListener("change", async () => {
            const file = igcInput.files?.[0];
            if (!file || !viewer || !window.PilotNetwork) return;

            loadIgcButton.disabled = true;
            loadIgcButton.textContent = "… Načítavam";

            try {
                await PilotNetwork.nacitajLokalnyIgcSubor(file, viewer, bioChart);
            } catch (error) {
                logStatus("Lokálny IGC súbor sa nepodarilo načítať: " + error.message, "error");
            } finally {
                loadIgcButton.disabled = false;
                loadIgcButton.textContent = "⇧ Načítať IGC";
                igcInput.value = "";
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
                await PilotNetwork.spracujIgcSubor(
                    "XCtrack/let.igc",
                    "XCtrack/temp.json",
                    "XCtrack/glider.json",
                    viewer,
                    bioChart
                );
            } catch (error) {
                logStatus("Spracovanie letových dát zlyhalo: " + error.message, "error");
                setMapState("CHYBA IGC", "error");
            }
        }

        spustiAplikaciu();
    </script>
</body>
</html>

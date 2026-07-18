<?php
require_once __DIR__ . '/bootstrap-cache.php';
termika_send_no_store_headers();

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
$assetVersion = termika_asset_version();
$currentYear = gmdate('Y');
$releaseVersion = null;
$releaseVersionPath = __DIR__ . '/asset/RELEASE_VERSION.txt';
if (is_readable($releaseVersionPath)) {
    $releaseRaw = @file_get_contents($releaseVersionPath);
    if (is_string($releaseRaw)) {
        $trimmed = trim($releaseRaw);
        if (preg_match('/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/', $trimmed) === 1) {
            $releaseVersion = $trimmed;
        }
    }
}
?>
<!doctype html>
<html lang="sk">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>TermikaXC v2.6 – Terrain Analysis</title>
    <script src="https://cesium.com/downloads/cesiumjs/releases/1.143/Build/Cesium/Cesium.js"></script>
    <link rel="stylesheet" href="https://cesium.com/downloads/cesiumjs/releases/1.143/Build/Cesium/Widgets/widgets.css">
<?php echo termika_browser_cache_reset_tag(), "\n"; ?>
    <link rel="stylesheet" href="asset/workspace-polish.css?v=<?php echo rawurlencode($assetVersion); ?>">
    <link rel="stylesheet" href="asset/workspace-flight-simulator.css?v=<?php echo rawurlencode($assetVersion); ?>">
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
    <script src="js/cesium-render.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="ux/igc-parser.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/pilot-network.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/workspace-crosshair.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/workspace-hud-toggle.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/terrain-camera-hud-coordinates.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/flight-simulator.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/workspace-flight-toggle.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/flight-emergency-disengage.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/tool-communication.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/windy-map-bridge.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/windy-map-adapter.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
<?php if (defined('WINDY_MAP_KEY') && WINDY_MAP_KEY !== ''): ?>
    <script src="https://unpkg.com/leaflet@1.4.0/dist/leaflet.js"></script>
    <script src="https://api.windy.com/assets/map-forecast/libBoot.js"></script>
    <script>var TERMIKA_WINDY_MAP_KEY = <?php echo json_encode(WINDY_MAP_KEY); ?>;</script>
<?php else: ?>
    <script>var TERMIKA_WINDY_MAP_KEY = null;</script>
<?php endif; ?>
    <style>
        :root{
            color-scheme:light;
            --nav-shell-bg:rgba(255,255,255,.84);
            --nav-shell-border:#cfd8e3;
            --nav-shell-text:#1f3443;
            --nav-shell-muted:#557180;
            --nav-tab-bg:rgba(245,250,255,.9);
            --nav-tab-border:#a9bfcd;
            --nav-tab-text:#1f3443;
            --nav-tab-active-bg:#e4f3ff;
            --nav-tab-active-border:#4ea5cf;
            --nav-drawer-bg:rgba(255,255,255,.95);
            --nav-card-bg:rgba(245,250,255,.88);
            --nav-card-border:#c7d7e2;
        }
        body[data-theme="dark"]{
            color-scheme:dark;
            --nav-shell-bg:rgba(7,16,24,.94);
            --nav-shell-border:#426277;
            --nav-shell-text:#dff7ff;
            --nav-shell-muted:#8fa9b8;
            --nav-tab-bg:#10212b;
            --nav-tab-border:#54778a;
            --nav-tab-text:#dff7ff;
            --nav-tab-active-bg:#1c3b4b;
            --nav-tab-active-border:#70e8ff;
            --nav-drawer-bg:rgba(7,16,24,.97);
            --nav-card-bg:rgba(16,33,43,.62);
            --nav-card-border:#35505f;
        }
        html,body,#cesiumContainer{width:100%;height:100%;margin:0;overflow:hidden;background:#071018}
        #cesiumContainer{cursor:default}
        body.map-crosshair-mode #cesiumContainer{cursor:crosshair}
        .cesium-viewer-toolbar{z-index:40}
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
        #appFooter{position:fixed;left:0;right:0;bottom:0;z-index:11;padding:4px 10px;text-align:center;background:linear-gradient(180deg,rgba(7,16,24,0),rgba(7,16,24,.82));color:#a9c2d1;font:11px/1.3 system-ui;pointer-events:none}
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
        #cursorCoordsBadge{grid-column:1 / -1;display:block;width:100%;box-sizing:border-box;padding:5px 8px;background:rgba(7,16,24,.82);color:#d8f8ff;border:1px solid #426277;border-radius:6px;font:11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;text-align:center;pointer-events:none}
        .record-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .record-badge{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border:1px solid #a33;border-radius:999px;background:rgba(120,0,0,.35);color:#ffd7d7;font-size:12px;font-weight:700;letter-spacing:.2px}
        .record-dot{width:8px;height:8px;border-radius:50%;background:#ff6b6b;box-shadow:0 0 8px rgba(255,107,107,.8)}
        #recordToggleButton.recording{background:#50191f;color:#ffdfe2;border-color:#aa4c57}
        .wind-generation-radio-group{display:flex;flex-direction:column;gap:4px;margin-top:8px}
        .wind-generation-radio-group label{display:flex;align-items:center;gap:8px;margin:0;font-size:12px;color:#d7e7ef}
        .wind-generation-mini-actions{display:grid;grid-template-columns:1fr;gap:6px;margin-top:8px}
        .wind-generation-mini-actions button{width:100%;padding:6px 8px;font-size:12px}
        .compare-row{display:flex;align-items:center;gap:8px;margin-top:8px}
        .compare-row span{min-width:64px;color:#8fa9b8;font-size:12px}
        .compare-select{width:100%;padding:4px 6px;background:#10212b;color:#eef;border:1px solid #426277;border-radius:4px;font-size:12px}
        .nav-shell{position:absolute;left:0;right:0;top:0;z-index:34;display:flex;flex-direction:column;gap:0;pointer-events:none}
        .nav-shell[data-dock="bottom"]{top:auto;bottom:12px}
        .nav-shell[data-dock="left"]{top:0;bottom:12px;right:auto;width:min(420px,calc(100vw - 12px))}
        .nav-shell[data-dock="right"]{top:0;bottom:12px;left:auto;width:min(420px,calc(100vw - 12px))}
        .nav-bar,.nav-drawer,.quick-tool-dock{pointer-events:auto}
        .nav-bar{display:flex;align-items:center;justify-content:flex-start;gap:10px;padding:8px 10px 8px 12px;border:1px solid var(--nav-shell-border);border-radius:0;background:var(--nav-shell-bg);box-shadow:0 8px 22px rgba(0,0,0,.24);backdrop-filter:blur(6px)}
        .nav-brand{display:flex;flex-direction:column;gap:2px;min-width:0}
        .nav-brand strong{font-size:13px;color:var(--nav-shell-text);letter-spacing:.4px}
        .nav-brand span{font-size:11px;color:var(--nav-shell-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .nav-primary{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-start;flex:0 1 auto}
        .nav-tab{padding:7px 10px;border:1px solid var(--nav-tab-border);border-radius:7px;background:var(--nav-tab-bg);color:var(--nav-tab-text);cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap}
        .nav-tab.is-active,.nav-tab:hover{background:var(--nav-tab-active-bg);border-color:var(--nav-tab-active-border)}
        .nav-meta{display:flex;align-items:center;gap:6px;margin-left:4px}
        .nav-dock-picker{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--nav-shell-muted)}
        .nav-dock-picker select,.nav-close-button,.nav-theme-toggle,.drawer-card input[type="text"],.drawer-card input[type="number"],.drawer-card select{background:var(--nav-tab-bg);color:var(--nav-tab-text);border:1px solid var(--nav-tab-border);border-radius:7px}
        .nav-dock-picker select{padding:7px 10px;font-size:12px;font-weight:700;line-height:1}
        .nav-close-button,.nav-theme-toggle{padding:7px 10px;min-width:38px;height:auto;cursor:pointer;font-size:12px;font-weight:700;line-height:1}
        .nav-drawer{border:1px solid var(--nav-shell-border);border-top:0;border-radius:0 0 10px 10px;background:var(--nav-drawer-bg);box-shadow:0 12px 24px rgba(0,0,0,.28);max-height:min(62vh,720px);overflow:auto}
        .nav-shell[data-dock="left"] .nav-drawer,.nav-shell[data-dock="right"] .nav-drawer{height:100%;max-height:none}
        .nav-drawer-section{display:none;padding:14px}
        .nav-drawer-section.is-active{display:block}
        .drawer-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px}
        .drawer-card{grid-column:span 4;padding:12px;border:1px solid var(--nav-card-border);border-radius:10px;background:var(--nav-card-bg)}
        .drawer-card.wide{grid-column:span 8}
        .drawer-card.full{grid-column:1 / -1}
        .drawer-card h3{margin:0 0 10px;color:#70e8ff;font-size:13px}
        .drawer-card p{margin:0 0 8px;color:#b9cbd5;font-size:12px}
        .drawer-card .action-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
        .drawer-card button{padding:7px 10px;border:1px solid #54778a;border-radius:6px;background:#10212b;color:#dff7ff;cursor:pointer}
        .drawer-card button:hover{background:#1c3b4b;border-color:#70e8ff}
        .quick-tool-dock{position:absolute;top:76px;right:12px;z-index:31;display:grid;grid-template-columns:repeat(4,32px);gap:6px;padding:6px;border:1px solid #426277;border-radius:9px;background:rgba(7,16,24,.86);box-shadow:0 8px 18px rgba(0,0,0,.32)}
        .quick-tool-dock button{width:32px;height:32px;padding:0;border:1px solid #54778a;border-radius:8px;background:#10212b;color:#dff7ff;cursor:pointer;font:700 13px/1 system-ui}
        .quick-tool-dock button:hover{background:#1c3b4b;border-color:#70e8ff}
        .temp-data-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px}
        .temp-summary-pill{padding:8px;border:1px solid #35505f;border-radius:8px;background:rgba(7,16,24,.55)}
        .temp-summary-pill strong{display:block;color:#fff;font-size:13px}
        .temp-summary-pill span{display:block;color:#8fa9b8;font-size:11px}
        .temp-graph-wrap{height:320px;border:1px solid #35505f;border-radius:10px;background:rgba(7,16,24,.72);padding:8px}
        #tempProfileGraph{width:100%;height:100%}
        .temp-table-wrap{max-height:320px;overflow:auto;border:1px solid #35505f;border-radius:10px;background:rgba(7,16,24,.55)}
        .temp-table{width:100%;border-collapse:collapse;font-size:12px}
        .temp-table th,.temp-table td{padding:7px 8px;border-bottom:1px solid rgba(53,80,95,.65);text-align:right;font-variant-numeric:tabular-nums}
        .temp-table th:first-child,.temp-table td:first-child{text-align:left}
        .temp-table thead th{position:sticky;top:0;background:#10212b;color:#70e8ff}
        .temp-empty{padding:20px;color:#8fa9b8;text-align:center}
        #debugConsole{left:12px;bottom:12px;width:560px;height:260px}
        #status{max-height:none;height:100%;overflow:auto;white-space:pre-wrap;color:#d7e7ef;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
        @media (max-width:1200px){.drawer-card,.drawer-card.wide{grid-column:span 6}.temp-data-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media (max-width:760px){.nav-shell{left:0;right:0;top:0}.nav-shell[data-dock="bottom"]{bottom:8px}.nav-shell[data-dock="left"],.nav-shell[data-dock="right"]{width:100vw}.nav-bar{align-items:flex-start;flex-direction:column}.nav-primary{justify-content:flex-start}.nav-meta{width:100%;justify-content:space-between}.drawer-card,.drawer-card.wide{grid-column:1 / -1}.quick-tool-dock{top:auto;right:8px;bottom:72px;grid-template-columns:repeat(4,30px);padding:5px;gap:5px}.quick-tool-dock button{width:30px;height:30px;font-size:12px}#cursorCoordsBadge{font-size:10px;padding:4px 6px}.temp-data-summary{grid-template-columns:1fr 1fr}#legend{top:auto;right:12px;bottom:58px;left:12px;width:auto;height:36vh}#cellDiagnostics{left:12px;right:12px;bottom:58px;width:auto;height:56vh;transform:none}.floating-window{max-width:calc(100vw - 24px)}}
    </style>
</head>
<body>
<div id="cesiumContainer"></div>
<div id="aimHint">Klik na farebný bod = diagnostika · klik na terén = nový stred analýzy</div>
<div id="navShell" class="nav-shell" data-dock="top">
    <div class="nav-bar" role="navigation" aria-label="Navigačný panel testovacej stránky">
        <div class="nav-brand">
            <strong>TermikaXC Test Navigator</strong>
            <span>priorita: Zdroje → Analýza → Zobrazenie → Vietor → TEMP → Záznam → Okná</span>
        </div>
        <div class="nav-primary">
            <button type="button" class="nav-tab" data-nav-route="explorer">Explorer</button>
            <button type="button" class="nav-tab is-active" data-nav-section="sources">Zdroje</button>
            <button type="button" class="nav-tab" data-nav-section="analysis">Analýza</button>
            <button type="button" class="nav-tab" data-nav-section="display">Zobrazenie</button>
            <button type="button" class="nav-tab" data-nav-section="wind">Vietor</button>
            <button type="button" class="nav-tab" data-nav-section="temp">TEMP</button>
            <button type="button" class="nav-tab" data-nav-section="record">Záznam</button>
            <button type="button" class="nav-tab" data-nav-section="windows">Okná</button>
            <button type="button" class="nav-tab nav-home-tab" data-nav-home="index">Domov</button>
        </div>
        <div class="nav-meta">
            <label class="nav-dock-picker">Lišta
                <select id="navDockMode" aria-label="Ukotvenie navigačnej lišty">
                    <option value="top" selected>Hore</option>
                    <option value="bottom">Dole</option>
                    <option value="left">Vľavo</option>
                    <option value="right">Vpravo</option>
                </select>
            </label>
            <button id="navThemeToggleButton" class="nav-theme-toggle" type="button" title="Prepnúť svetlý/tmavý režim">☀</button>
            <button id="navCloseDrawerButton" class="nav-close-button" type="button" title="Zavrieť vysúvateľný panel">×</button>
        </div>
    </div>

    <section id="navDrawer" class="nav-drawer" aria-label="Obsah navigačnej sekcie" hidden>
        <div class="nav-drawer-section" data-nav-section="explorer">
            <div class="drawer-grid">
                <div class="drawer-card full">
                    <h3>Explorer</h3>
                    <p>Táto sekcia je pripravená pre Joyee workflow a prieskumné nástroje. Môže tu pribudnúť výber vrstiev, diagnostické pohľady a ďalšie prieskumné režimy bez zahltenia hlavných sekcií.</p>
                    <div class="action-row">
                        <button type="button" data-show-window="legend">Legenda</button>
                        <button type="button" data-show-window="cellDiagnostics">Diagnostika bunky</button>
                        <button type="button" data-show-window="debugConsole">Debugger</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="nav-drawer-section is-active" data-nav-section="sources">
            <div class="drawer-grid">
                <div class="drawer-card wide">
                    <h3>Zdroje letu a profilov</h3>
                    <p>Načítanie IGC a TEMP patrí sem. Z tejto sekcie sa začína pracovný tok.</p>
                    <input id="igcFileInput" type="file" accept=".igc,text/plain,application/octet-stream" hidden>
                    <input id="tempFileInput" type="file" accept=".json,.txt,.csv,.temp,.snd,application/json,text/plain,text/csv" hidden>
                    <div class="action-row">
                        <button id="loadIgcButton" type="button" title="Načítať iný IGC z počítača">Načítať IGC</button>
                        <button id="loadTempButton" type="button" title="Načítať TEMP profil zo súboru">Načítať TEMP</button>
                    </div>
                    <div class="row"><span class="label">IGC zdroj:</span><span id="loadedIgcName" class="val">bez súboru</span></div>
                    <div class="row"><span class="label">Aktuálny stred:</span><strong id="centerText">46.43000, 11.85000</strong></div>
                    <div class="row"><span class="label">TEMP zdroj:</span><span id="pTempFile" class="val">XCtrack/temptest.json</span></div>
                    <div class="row"><span class="label">Počet hladín:</span><span id="pTempLevels" class="val">--</span></div>
                </div>
                <div class="drawer-card">
                    <h3>Nastavenie fokusu</h3>
                    <label>Zadaj stred (lat, lon)
                        <input id="centerInput" type="text" value="46.43000, 11.85000" placeholder="46.43000, 11.85000" style="width:100%">
                    </label>
                    <button id="centerApplyButton" type="button">Presunúť mapu na stred (3000 m ASL)</button>
                </div>
                <div class="drawer-card full">
                    <h3>Zdroje TEMP a sieťové nastavenia</h3>
                    <div class="drawer-grid">
                        <div class="drawer-card">
                            <label>Zdroj TEMP
                                <select id="windTempSourceMode">
                                    <option value="auto">Automaticky (Windy → stanica → súbor)</option>
                                    <option value="windy" selected>Windy.com cez proxy</option>
                                    <option value="station">Najbližšia meteo stanica</option>
                                    <option value="file">Lokálny súbor</option>
                                </select>
                            </label>
                            <label>Lokálny TEMP súbor alebo adresa <input id="windTempSourceUrl" type="text" value="XCtrack/temptest.json"></label>
                        </div>
                        <div class="drawer-card">
                            <label>Adresa Windy proxy <input id="windyTempUrl" type="text" value="windy-temp-proxy.php?lat=${lat}&lon=${lon}" placeholder="windy-temp-proxy.php?lat=${lat}&amp;lon=${lon}"></label>
                            <label>Zoznam staníc alebo jeho adresa <input id="stationIndexUrl" type="text" placeholder="https://... alebo template s ${lat}/${lon}"></label>
                            <label>Šablóna adresy profilu stanice <input id="stationProfileUrlTemplate" type="text" placeholder="https://.../${stationId}.json"></label>
                            <div class="action-row">
                                <button id="openSetupButton" type="button">Otvoriť setup.php</button>
                            </div>
                            <p style="margin:6px 0 0;color:#6f8594;font-size:12px;">Tu sa zadáva aj <strong>WINDY_API_KEY</strong> pre Windy TEMP proxy.</p>
                        </div>
                        <div class="drawer-card">
                            <h3>Údržba dát TEMP</h3>
                            <p>Ručné čistenie automaticky uložených TEMP záznamov, ktoré neboli použité v žiadnej uloženej analýze.</p>
                            <div class="action-row">
                                <button id="tempCleanupButton" type="button" title="Vymazať nepoužité auto TEMP záznamy">Vyčistiť nepoužité TEMP</button>
                            </div>
                            <p id="tempUnusedCountStatus" style="margin:6px 0 0;color:#8fa9b8;font-size:12px;">Nepoužité TEMP v DB: <strong id="tempUnusedCountBadge" style="color:#ff6b6b;font-size:11px;">--</strong></p>
                            <p id="tempCleanupStatus" style="margin:6px 0 0;color:#8fa9b8;font-size:12px;">Posledná údržba: --</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="nav-drawer-section" data-nav-section="analysis">
            <div class="drawer-grid">
                <div class="drawer-card">
                    <h3>Rozsah analýzy</h3>
                    <label>Polomer kruhu <input id="radiusInput" type="number" min="40" max="20000" step="40" value="400"> m</label>
                    <label>Rozostup vzoriek <input id="spacingInput" type="number" min="5" max="1000" step="5" value="40"> m</label>
                </div>
                <div class="drawer-card wide">
                    <h3>Analytické vrstvy</h3>
                    <label><input class="module-toggle" type="checkbox" value="geometry" checked> Geometria reliéfu</label>
                    <label><input class="module-toggle" type="checkbox" value="contours" checked> Vrstevnice</label>
                    <label class="future"><input type="checkbox" disabled> Doliny a žľaby – pripravujeme</label>
                    <label class="future"><input type="checkbox" disabled> Hydrológia – pripravujeme</label>
                    <label class="future"><input type="checkbox" disabled> Povrchový kryt – pripravujeme</label>
                    <label class="future"><input type="checkbox" disabled> Geológia – pripravujeme</label>
                    <label class="future"><input type="checkbox" disabled> Oslnenie – pripravujeme</label>
                </div>
                <div class="drawer-card full">
                    <h3>Výpočet</h3>
                    <div class="action-row">
                        <button id="analyzeButton" type="button">Spustiť vybrané analýzy</button>
                        <button id="clearButton" type="button">Skryť výsledky</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="nav-drawer-section" data-nav-section="display">
            <div class="drawer-grid">
                <div class="drawer-card">
                    <h3>Mapové vrstvy</h3>
                    <label><input id="geometryVisible" type="checkbox" checked> Zobraziť geometriu reliéfu</label>
                    <label><input id="contoursVisible" type="checkbox" checked> Zobraziť tmavošedé vrstevnice</label>
                </div>
                <div class="drawer-card wide">
                    <h3>Pomocné okná a zobrazenia</h3>
                    <div class="action-row">
                        <button type="button" data-show-window="legend">Legenda</button>
                        <button type="button" data-show-window="cellDiagnostics">Diagnostika bunky</button>
                        <button type="button" data-show-window="debugConsole">Debugger</button>
                    </div>
                    <p>Legenda, diagnostika a debugger sú samostatné plávajúce okná, presúvateľné a zatvárateľné.</p>
                </div>
            </div>
        </div>

        <div class="nav-drawer-section" data-nav-section="wind">
            <div class="drawer-grid">
                <div class="drawer-card">
                    <h3>WIND jadro</h3>
                    <label><input id="windEnabled" type="checkbox" checked> Zobraziť veterné prúdnice</label>
                    <label>Výška nad terénom <input id="windAglInput" type="number" min="20" max="5000" step="10" value="300"> m AGL</label>
                    <label>Rozostup vetra <input id="windSpacingInput" type="number" min="30" max="1200" step="10" value="120"> m</label>
                    <label>Základná rýchlosť <input id="windSpeedInput" type="number" min="0" max="40" step="0.1" value="4.5"> m/s</label>
                    <label>Smer toku <input id="windDirInput" type="number" min="0" max="359" step="1" value="230"> °</label>
                    <label><input id="windUseTempProfile" type="checkbox" checked> Použiť vietor z TEMP profilu</label>
                </div>
                <div class="drawer-card wide">
                    <h3>Vizuál vetra a animácia</h3>
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
                </div>
                <div class="drawer-card full">
                    <h3>Komunikácia fokusu (windy-focus)</h3>
                    <p>Univerzálny komunikačný kanál pre prenos fokusu medzi nástrojmi. Týmto sa mapové integrácie prepájajú bez pevnej väzby na konkrétny panel.</p>
                    <div class="row" style="margin:6px 0 10px;">
                        <span class="label">Windy adapter:</span>
                        <span id="windyAdapterStatusBadge" class="val">OFFLINE</span>
                    </div>
                    <div class="row" style="margin:0 0 10px;">
                        <span class="label">Posledný update:</span>
                        <span id="windyAdapterLastUpdateBadge" class="val">--</span>
                    </div>
                    <div class="row" style="margin:0 0 10px;">
                        <span class="label">Zdroj:</span>
                        <span id="windyAdapterSourceBadge" class="val">--</span>
                    </div>
                    <div class="action-row">
                        <button id="windyAdapterConnectButton" type="button">Skúsiť pripojiť Windy adapter</button>
                        <button id="windBroadcastFocusButton" type="button">Poslať aktuálny fokus</button>
                        <button id="windSimulateIncomingFocusButton" type="button">Simulovať príchod fokusu</button>
                    </div>
                </div>
                <div class="drawer-card full">
                    <h3>Generácie vetra a porovnanie</h3>
                    <div class="wind-generation-radio-group" role="radiogroup" aria-label="Režim generácie vetra">
                        <label><input type="radio" name="windGenerationModeTest" value="keep" checked> Zachovať poslednú generáciu</label>
                        <label><input type="radio" name="windGenerationModeTest" value="clear-last"> Vymazať poslednú generáciu</label>
                        <label><input type="radio" name="windGenerationModeTest" value="clear-all"> Vymazať všetky generácie z mapy</label>
                    </div>
                    <div class="action-row">
                        <button id="windDeleteLastButton" type="button">Zmazať poslednú generáciu</button>
                        <button id="windDeleteAllButton" type="button">Zmazať všetky generácie</button>
                        <button id="windClearTodayButtonTest" type="button">Vymazať dnešné GENauto</button>
                        <button id="windLoadFromFilesButtonTest" type="button">Načítať vietor zo súborov</button>
                        <button id="mapLoadFromFilesButtonTest" type="button">Načítať mapu zo súborov</button>
                    </div>
                    <div class="compare-row">
                        <span>Porovnať:</span>
                        <select id="windCompareGenerationTest" class="compare-select" aria-label="Výber WIND generácie na porovnanie">
                            <option value="">Najprv načítaj uložené WIND generácie</option>
                        </select>
                    </div>
                    <div class="compare-row">
                        <span>Mapa:</span>
                        <select id="mapCompareGenerationTest" class="compare-select" aria-label="Výber mapovej generácie na porovnanie">
                            <option value="">Najprv načítaj uložené mapové generácie</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div class="nav-drawer-section" data-nav-section="temp">
            <div class="drawer-grid">
                <div class="drawer-card full">
                    <h3>TEMP profil</h3>
                    <p>V tejto sekcii je vždy viditeľná aktuálna tabuľka TEMP a prehľadový graf. Pri výpočte sa sem zapíše profil použitý tesne pred simuláciou.</p>
                    <div class="row"><span class="label">Fokus TEMP:</span><span id="tempFocusCoords" class="val">--</span></div>
                    <div class="action-row">
                        <button id="tempDownloadButton" type="button" title="Stiahnuť aktuálny TEMP profil do JSON">Stiahnuť TEMP JSON</button>
                        <button id="tempSaveDbButton" type="button" title="Uložiť aktuálny TEMP profil do GENauto databázy">Uložiť TEMP do DB</button>
                        <button id="tempRefreshSavedButton" type="button" title="Načítať dnešný zoznam uložených TEMP profilov">Načítať zoznam TEMP</button>
                    </div>
                    <div class="row" style="margin-top:8px;gap:8px;">
                        <span class="label">Uložené TEMP:</span>
                        <select id="tempSavedSelect" class="compare-select" aria-label="Výber uloženého TEMP profilu" style="flex:1;min-width:220px;">
                            <option value="">Najprv načítaj zoznam TEMP</option>
                        </select>
                        <button id="tempLoadSavedButton" type="button" title="Načítať vybraný TEMP profil zo zoznamu">Načítať</button>
                    </div>
                    <div id="tempProfileSummary" class="temp-data-summary"></div>
                </div>
                <div class="drawer-card wide">
                    <h3>Graf profilu</h3>
                    <div class="temp-graph-wrap">
                        <canvas id="tempProfileGraph"></canvas>
                    </div>
                </div>
                <div class="drawer-card wide">
                    <h3>Tabuľka hladín</h3>
                    <div id="tempProfileTableWrap" class="temp-table-wrap"></div>
                </div>
            </div>
        </div>

        <div class="nav-drawer-section" data-nav-section="record">
            <div class="drawer-grid">
                <div class="drawer-card full">
                    <h3>Záznam videa</h3>
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
                </div>
            </div>
        </div>

        <div class="nav-drawer-section" data-nav-section="windows">
            <div class="drawer-grid">
                <div class="drawer-card full">
                    <h3>Okná a nástroje</h3>
                    <div class="action-row">
                        <button type="button" data-show-window="legend">Otvoriť legendu</button>
                        <button type="button" data-show-window="cellDiagnostics">Otvoriť diagnostiku</button>
                        <button type="button" data-show-window="debugConsole">Otvoriť debugger</button>
                        <button type="button" data-show-window="windyMapWindow">Otvoriť Windy mapu</button>
                    </div>
                </div>
            </div>
        </div>
    </section>
</div>

<nav id="quickToolDock" class="quick-tool-dock" aria-label="Rýchle mapové nástroje">
    <button type="button" id="quickOpenSourcesButton" title="Zdroje a nastavenia">◎</button>
    <button type="button" id="quickAnalyzeButton" title="Spustiť analýzu">▶</button>
    <button type="button" id="quickClearButton" title="Skryť výsledky">■</button>
    <button type="button" id="quickCursorModeButton" title="Prepnúť režim myši (zameriavací/štandardný)">✛</button>
    <button type="button" data-show-window="legend" title="Legenda">L</button>
    <button type="button" data-show-window="debugConsole" title="Debugger">D</button>
    <button type="button" data-show-window="cellDiagnostics" title="Diagnostika bunky">?</button>
    <button type="button" data-show-window="windyMapWindow" title="Windy mapa">W</button>
    <div id="cursorCoordsBadge">--</div>
</nav>

<aside id="legend" class="floating-window" data-window-name="Legenda" aria-label="Legenda geometrie terénu" hidden>
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

<section id="windyMapWindow" class="floating-window" data-window-name="Windy mapa" style="width:520px;height:480px;right:20px;top:80px" hidden>
    <header class="window-header">
        <div class="window-title">Windy mapa</div>
        <div class="window-actions">
            <span id="windyConnectionStatusBadge" style="display:inline-flex;align-items:center;padding:0 8px;height:24px;border:1px solid #426277;border-radius:999px;background:rgba(7,16,24,.8);color:#8fa9b8;font-size:11px;font-weight:700;line-height:1;white-space:nowrap">Windy: čakám</span>
            <button id="windyFocusPickerToggleButton" class="window-action" type="button" title="Zapnúť výber fokusu z mapy">⌖</button>
            <button class="window-action close-window" type="button" title="Zavrieť okno">×</button>
        </div>
    </header>
    <div class="window-body" style="padding:0;display:flex;flex-direction:column;height:calc(100% - 36px)">
        <div style="position:relative;flex:1;min-height:0">
            <div id="windy" style="position:absolute;inset:0;min-height:0"></div>
            <div id="windyMapLoadingPanel" style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:14px;background:rgba(5,12,18,.84);border-bottom:1px solid #35505f;z-index:2">
                <div style="font-size:12px;font-weight:700;letter-spacing:.04em;color:#70e8ff;margin-bottom:8px">WINDY MAPA - STAV PRIPOJENIA</div>
                <div id="windyMapLoadingText" style="font-size:12px;line-height:1.45;color:#cfe6f3;white-space:pre-line">Čakám na otvorenie okna Windy...</div>
            </div>
        </div>
        <div style="padding:8px;display:flex;align-items:center;gap:8px;border-top:1px solid #35505f;background:rgba(7,16,24,.85)">
            <span id="windyMapFocusLabel" style="flex:1;font-size:12px;color:#8fa9b8">Naviguj na Windy mape...</span>
            <button id="windyUseFocusButton" type="button" style="padding:6px 14px;background:#0d4a6b;border:1px solid #70e8ff;border-radius:6px;color:#dff7ff;cursor:pointer;font-weight:700">Použiť tento fokus ↗</button>
        </div>
    </div>
</section>

<section id="debugConsole" class="floating-window" data-window-name="Debugger" hidden>
    <header class="window-header">
        <div class="window-title">Debugger · systémový monitor úloh</div>
        <div class="window-actions">
            <button id="clearDebugButton" class="window-action" type="button" title="Vyčistiť log">↺</button>
            <button class="window-action close-window" type="button" title="Zavrieť okno">×</button>
        </div>
    </header>
    <div class="window-body">
        <div id="status"></div>
    </div>
</section>

<footer id="appFooter">© PIAR Team <?php echo htmlspecialchars((string)$currentYear, ENT_QUOTES, 'UTF-8'); ?><?php if ($releaseVersion !== null): ?> · v<?php echo htmlspecialchars($releaseVersion, ENT_QUOTES, 'UTF-8'); ?><?php else: ?> · VERZIA NEDOSTUPNÁ<?php endif; ?></footer>

<script>
    const statusEl = document.getElementById('status');
    const centerText = document.getElementById('centerText');
    const centerInput = document.getElementById('centerInput');
    const centerApplyButton = document.getElementById('centerApplyButton');
    const loadedIgcName = document.getElementById('loadedIgcName');
    const navShell = document.getElementById('navShell');
    const navDrawer = document.getElementById('navDrawer');
    const navDockMode = document.getElementById('navDockMode');
    const navThemeToggleButton = document.getElementById('navThemeToggleButton');
    const navCloseDrawerButton = document.getElementById('navCloseDrawerButton');
    const navTabs = Array.from(document.querySelectorAll('.nav-tab'));
    const navSections = Array.from(document.querySelectorAll('.nav-drawer-section'));
    const navHomeButtons = Array.from(document.querySelectorAll('[data-nav-home]'));
    const navRouteButtons = Array.from(document.querySelectorAll('[data-nav-route]'));
    const radiusInput = document.getElementById('radiusInput');
    const geometryVisible = document.getElementById('geometryVisible');
    const contoursVisible = document.getElementById('contoursVisible');
    const windEnabled = document.getElementById('windEnabled');
    const windTempSourceMode = document.getElementById('windTempSourceMode');
    const windTempSourceUrl = document.getElementById('windTempSourceUrl');
    const windyTempUrl = document.getElementById('windyTempUrl');
    const stationIndexUrl = document.getElementById('stationIndexUrl');
    const stationProfileUrlTemplate = document.getElementById('stationProfileUrlTemplate');
    const openSetupButton = document.getElementById('openSetupButton');
    const tempCleanupButton = document.getElementById('tempCleanupButton');
    const tempUnusedCountBadge = document.getElementById('tempUnusedCountBadge');
    const tempCleanupStatus = document.getElementById('tempCleanupStatus');
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
    const windGenerationModeInputs = Array.from(document.querySelectorAll('input[name="windGenerationModeTest"]'));
    const windDeleteLastButton = document.getElementById('windDeleteLastButton');
    const windDeleteAllButton = document.getElementById('windDeleteAllButton');
    const windClearTodayButtonTest = document.getElementById('windClearTodayButtonTest');
    const windLoadFromFilesButtonTest = document.getElementById('windLoadFromFilesButtonTest');
    const mapLoadFromFilesButtonTest = document.getElementById('mapLoadFromFilesButtonTest');
    const windyAdapterConnectButton = document.getElementById('windyAdapterConnectButton');
    const windyAdapterStatusBadge = document.getElementById('windyAdapterStatusBadge');
    const windyAdapterLastUpdateBadge = document.getElementById('windyAdapterLastUpdateBadge');
    const windyAdapterSourceBadge = document.getElementById('windyAdapterSourceBadge');
    const windyConnectionStatusBadge = document.getElementById('windyConnectionStatusBadge');
    const windyMapLoadingPanel = document.getElementById('windyMapLoadingPanel');
    const windyMapLoadingText = document.getElementById('windyMapLoadingText');
    const windyFocusPickerToggleButton = document.getElementById('windyFocusPickerToggleButton');
    const windBroadcastFocusButton = document.getElementById('windBroadcastFocusButton');
    const windSimulateIncomingFocusButton = document.getElementById('windSimulateIncomingFocusButton');
    const windCompareGenerationTest = document.getElementById('windCompareGenerationTest');
    const mapCompareGenerationTest = document.getElementById('mapCompareGenerationTest');
    const recordFps = document.getElementById('recordFps');
    const recordQuality = document.getElementById('recordQuality');
    const recordAutoHideUi = document.getElementById('recordAutoHideUi');
    const recordToggleButton = document.getElementById('recordToggleButton');
    const recordBadge = document.getElementById('recordBadge');
    const recordElapsed = document.getElementById('recordElapsed');
    const cellDiagnostics = document.getElementById('cellDiagnostics');
    const cellDiagnosticsBody = document.getElementById('cellDiagnosticsBody');
    const tempProfileSummary = document.getElementById('tempProfileSummary');
    const tempProfileTableWrap = document.getElementById('tempProfileTableWrap');
    const tempProfileGraph = document.getElementById('tempProfileGraph');
    const tempFocusCoords = document.getElementById('tempFocusCoords');
    const tempDownloadButton = document.getElementById('tempDownloadButton');
    const tempSaveDbButton = document.getElementById('tempSaveDbButton');
    const tempRefreshSavedButton = document.getElementById('tempRefreshSavedButton');
    const tempSavedSelect = document.getElementById('tempSavedSelect');
    const tempLoadSavedButton = document.getElementById('tempLoadSavedButton');
    const cursorCoordsBadge = document.getElementById('cursorCoordsBadge');
    const quickOpenSourcesButton = document.getElementById('quickOpenSourcesButton');
    const quickAnalyzeButton = document.getElementById('quickAnalyzeButton');
    const quickClearButton = document.getElementById('quickClearButton');
    const quickCursorModeButton = document.getElementById('quickCursorModeButton');
    const igcInput = document.getElementById('igcFileInput');
    const loadIgcButton = document.getElementById('loadIgcButton');
    const tempInput = document.getElementById('tempFileInput');
    const loadTempButton = document.getElementById('loadTempButton');
    let selectedCenter = { lat: 46.43, lon: 11.85 };
    let previewCenter = { ...selectedCenter };
    let highestWindowZ = 20;
    let windFpsEstimate = 60;
    let windAutoActiveProfile = 'medium';
    let windAutoRerenderBusy = false;
    let windLoadingFromFiles = false;
    let mapLoadingFromFiles = false;
    let genAutoMapLayer = null;
    let windLoadedRecords = [];
    let mapLoadedRecords = [];
    let activeRecorder = null;
    let activeRecordStream = null;
    let activeRecordChunks = [];
    let recordStartedAtMs = 0;
    let recordTimer = null;
    let recordHiddenTargets = [];
    let activeNavSection = 'sources';
    let manualTempProfile = null;
    let manualTempSourceName = 'XCtrack/temptest.json';
    let tempFocusPoint = null;
    let tempSavedRecords = [];
    let mapMouseCrosshairMode = true;
    let tempAutoSaveInProgress = false;
    let lastAutoSavedTempKey = '';
    const communicationDisposers = [];
    let runtimeCleanupDone = false;
    let sceneInputHandler = null;

    function formatCenter(point) {
        return point.lat.toFixed(5) + ', ' + point.lon.toFixed(5);
    }

    function formatCenterSafe(point) {
        if (!point || !Number.isFinite(Number(point.lat)) || !Number.isFinite(Number(point.lon))) {
            return '--';
        }
        return Number(point.lat).toFixed(5) + ', ' + Number(point.lon).toFixed(5);
    }

    function formatTempSavedLabel(record, index) {
        const time = record?.generated_at_utc ? String(record.generated_at_utc).slice(11, 19) : '--:--:--';
        const center = record?.center && Number.isFinite(Number(record.center.lat)) && Number.isFinite(Number(record.center.lon))
            ? Number(record.center.lat).toFixed(3) + ', ' + Number(record.center.lon).toFixed(3)
            : '--';
        const levels = Number(record?.levels_count || 0);
        return String(index + 1) + ' · ' + time + ' · ' + center + ' · ' + levels + ' hl.';
    }

    function updateCursorCoordsBadge(point = null) {
        if (!cursorCoordsBadge) return;

        if (!mapMouseCrosshairMode) {
            cursorCoordsBadge.textContent = 'vypnute';
            cursorCoordsBadge.style.opacity = '0.65';
            return;
        }

        if (!point || !Number.isFinite(Number(point.lat)) || !Number.isFinite(Number(point.lon))) {
            cursorCoordsBadge.textContent = '--';
            cursorCoordsBadge.style.opacity = '0.9';
            return;
        }

        cursorCoordsBadge.textContent = Number(point.lat).toFixed(5) + ', ' + Number(point.lon).toFixed(5);
        cursorCoordsBadge.style.opacity = '1';
    }

    function applyMouseMode(enabledCrosshair) {
        mapMouseCrosshairMode = enabledCrosshair === true;
        document.body.classList.toggle('map-crosshair-mode', mapMouseCrosshairMode);

        if (quickCursorModeButton) {
            quickCursorModeButton.textContent = mapMouseCrosshairMode ? '✛' : '◉';
            quickCursorModeButton.title = mapMouseCrosshairMode
                ? 'Prepnúť na štandardný kurzor'
                : 'Prepnúť na zameriavací kríž + súradnice';
        }

        updateCursorCoordsBadge();
    }

    function setTempFocusPoint(point, sourceLabel = '') {
        if (point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon))) {
            tempFocusPoint = {
                lat: Number(point.lat),
                lon: Number(point.lon)
            };
        }

        if (!tempFocusCoords) return;

        const centerTextValue = formatCenterSafe(tempFocusPoint);
        const sourceSuffix = String(sourceLabel || '').trim() !== ''
            ? ' (' + String(sourceLabel).trim() + ')'
            : '';
        tempFocusCoords.textContent = centerTextValue + sourceSuffix;
    }

    function buildTempExportFilename(point = null) {
        const focus = point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon))
            ? point
            : (tempFocusPoint || selectedCenter || null);
        const latText = Number.isFinite(Number(focus?.lat)) ? Number(focus.lat).toFixed(5).replace('-', 'm').replace('.', '_') : 'na';
        const lonText = Number.isFinite(Number(focus?.lon)) ? Number(focus.lon).toFixed(5).replace('-', 'm').replace('.', '_') : 'na';
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        return 'temp-profile__lat' + latText + '__lon' + lonText + '__' + stamp + '.json';
    }

    function downloadTempProfileJson() {
        if (!Array.isArray(manualTempProfile) || manualTempProfile.length < 2) {
            logStatus('TEMP export: profil ešte nie je načítaný.', 'error');
            return;
        }

        const focus = tempFocusPoint || selectedCenter || null;
        const payload = {
            source: manualTempSourceName,
            center: focus,
            exported_at_iso: new Date().toISOString(),
            profile: manualTempProfile
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const filename = buildTempExportFilename(focus);

        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1500);
        logStatus('TEMP export: uložený súbor ' + filename + '.', 'success');
    }

    function populateTempSavedSelector(records) {
        if (!tempSavedSelect) return;

        tempSavedSelect.replaceChildren();

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = records.length ? 'Vyber uložený TEMP profil' : 'Najprv načítaj zoznam TEMP';
        tempSavedSelect.appendChild(emptyOption);

        records.forEach((record, index) => {
            const option = document.createElement('option');
            option.value = String(record.temp_hash || '');
            option.textContent = formatTempSavedLabel(record, index);
            tempSavedSelect.appendChild(option);
        });

        tempSavedSelect.value = records.length ? String(records[records.length - 1]?.temp_hash || '') : '';
    }

    function updateTempUnusedCountBadge(count) {
        if (!tempUnusedCountBadge) return;
        const normalized = Number(count);
        tempUnusedCountBadge.textContent = Number.isFinite(normalized) ? String(Math.max(0, Math.trunc(normalized))) : '--';
    }

    async function saveCurrentTempToDb() {
        if (!Array.isArray(manualTempProfile) || manualTempProfile.length < 2) {
            logStatus('TEMP DB: profil ešte nie je načítaný.', 'error');
            return;
        }

        const focus = tempFocusPoint || selectedCenter || null;
        if (!focus || !Number.isFinite(Number(focus.lat)) || !Number.isFinite(Number(focus.lon))) {
            logStatus('TEMP DB: chýba platný fokus so súradnicami.', 'error');
            return;
        }

        const response = await genAutoRequest('saveTempProfile', {
            center: {
                lat: Number(focus.lat),
                lon: Number(focus.lon)
            },
            manual_save: true,
            temp_profile: manualTempProfile,
            temp_source: {
                sourceLabel: manualTempSourceName,
                focus: {
                    lat: Number(focus.lat),
                    lon: Number(focus.lon)
                }
            }
        });

        logStatus(
            'TEMP DB: uložené ' + String(response.file || '(bez názvu)') +
            ' | fokus ' + formatCenterSafe(focus) +
            ' | hladín ' + String(response.levels_count || manualTempProfile.length) + '.',
            'success'
        );

        updateTempUnusedCountBadge(response.unused_temp_count);

        await loadSavedTempList();
    }

    async function autoSaveTempProfileIfWindy(profile, point, resolvedSource) {
        const resolvedMode = String(resolvedSource?.resolvedMode || '').toLowerCase();
        if (resolvedMode !== 'windy') {
            return;
        }

        if (!Array.isArray(profile) || profile.length < 2) {
            return;
        }

        const lat = Number(point?.lat);
        const lon = Number(point?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return;
        }

        const first = profile[0] || {};
        const last = profile[profile.length - 1] || {};
        const signature = [
            lat.toFixed(5),
            lon.toFixed(5),
            profile.length,
            Number(first.z_m).toFixed(2),
            Number(last.z_m).toFixed(2),
            Number(first.T_c).toFixed(2),
            Number(last.T_c).toFixed(2)
        ].join('|');

        if (signature === lastAutoSavedTempKey || tempAutoSaveInProgress) {
            return;
        }

        tempAutoSaveInProgress = true;
        try {
            const response = await genAutoRequest('saveTempProfile', {
                center: {
                    lat,
                    lon
                },
                manual_save: false,
                temp_profile: profile,
                temp_source: {
                    sourceLabel: manualTempSourceName,
                    loader: resolvedSource || null,
                    autoSaved: true,
                    focus: {
                        lat,
                        lon
                    }
                }
            });

            lastAutoSavedTempKey = signature;
            logStatus('TEMP DB: auto-save (Windy) uložený ' + String(response.file || '(bez názvu)') + '.', 'success');
            updateTempUnusedCountBadge(response.unused_temp_count);
        } catch (error) {
            logStatus('TEMP DB: auto-save (Windy) zlyhal: ' + (error?.message || String(error)), 'error');
        } finally {
            tempAutoSaveInProgress = false;
        }
    }

    async function loadSavedTempList() {
        const response = await genAutoRequest('listTempToday', { limit: 500 });
        const records = Array.isArray(response.records) ? response.records : [];
        tempSavedRecords = records.slice();
        populateTempSavedSelector(tempSavedRecords);
        updateTempUnusedCountBadge(response.unused_temp_count);
        logStatus('TEMP DB: načítaný zoznam profilov ' + records.length + '.', 'info');
    }

    async function loadSelectedTempFromDb() {
        const selectedHash = String(tempSavedSelect?.value || '').trim();
        if (!selectedHash) {
            logStatus('TEMP DB: vyber profil zo zoznamu.', 'info');
            return;
        }

        const response = await fetch('genauto.php?action=getTempProfile&temp_hash=' + encodeURIComponent(selectedHash), {
            method: 'GET',
            cache: 'no-store'
        });

        const data = await response.json();
        if (!response.ok || data?.status !== 'success') {
            throw new Error(String(data?.message || 'TEMP profil sa nepodarilo načítať.'));
        }

        const profile = Array.isArray(data.profile) ? data.profile : [];
        if (profile.length < 2) {
            throw new Error('Uložený TEMP profil je prázdny alebo neplatný.');
        }

        const selectedRecord = tempSavedRecords.find((record) => String(record.temp_hash || '') === selectedHash) || null;
        const focus = selectedRecord?.center || tempFocusPoint || selectedCenter;
        setTempFocusPoint(focus, 'DB');
        renderTempProfileViews(profile, selectedRecord?.file || 'TEMP_DB', focus);
        setActiveNavSection('temp', true);
        logStatus('TEMP DB: načítaný profil ' + String(selectedRecord?.file || selectedHash) + '.', 'success');
    }

    async function runTempCleanupMaintenance() {
        const response = await genAutoRequest('cleanupTempUnused', {
            force_delete: true,
            ttl_seconds: 0
        });

        const guard = response?.guard_dog || {};
        const deletedEvents = Number(guard.deleted_events || 0);
        const deletedProfiles = Number(guard.deleted_profiles || 0);
        const statusText =
            'Posledná údržba: zmazané eventy ' + deletedEvents +
            ', osirelé profily ' + deletedProfiles +
            ' (' + new Date().toLocaleTimeString('sk-SK') + ')';

        if (tempCleanupStatus) {
            tempCleanupStatus.textContent = statusText;
        }

        updateTempUnusedCountBadge(response.unused_temp_count);

        logStatus('Údržba TEMP: zmazané eventy=' + deletedEvents + ', osirelé profily=' + deletedProfiles + '.', 'success');

        await loadSavedTempList();
    }

    function updateSourceLabels() {
        if (loadedIgcName && !loadedIgcName.textContent.trim()) {
            loadedIgcName.textContent = 'bez súboru';
        }
        const tempLabel = document.getElementById('pTempFile');
        if (tempLabel) {
            tempLabel.textContent = String(manualTempSourceName || 'TEMP');
            tempLabel.title = String(manualTempSourceName || 'TEMP');
        }
    }

    function applyNavDock(mode) {
        if (!navShell) return;
        const normalized = ['top', 'bottom', 'left', 'right'].includes(String(mode)) ? String(mode) : 'top';
        navShell.dataset.dock = normalized;
        if (navDockMode && navDockMode.value !== normalized) {
            navDockMode.value = normalized;
        }
    }

    function applyUiTheme(mode) {
        const normalized = mode === 'dark' ? 'dark' : 'light';
        document.body.dataset.theme = normalized;
        if (navThemeToggleButton) {
            navThemeToggleButton.textContent = normalized === 'dark' ? '☾' : '☀';
            navThemeToggleButton.title = normalized === 'dark'
                ? 'Prepnúť na svetlý režim'
                : 'Prepnúť na tmavý režim';
        }
        try {
            localStorage.setItem('terrainAnalysisTheme', normalized);
        } catch (_) {
            // No-op when storage is unavailable.
        }
    }

    function initUiTheme() {
        let stored = 'light';
        try {
            const value = localStorage.getItem('terrainAnalysisTheme');
            if (value === 'dark' || value === 'light') {
                stored = value;
            }
        } catch (_) {
            // No-op when storage is unavailable.
        }
        applyUiTheme(stored);
    }

    function setActiveNavSection(sectionId, forceOpen = true) {
        activeNavSection = sectionId;
        navTabs.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.navSection === sectionId);
        });
        navSections.forEach((section) => {
            section.classList.toggle('is-active', section.dataset.navSection === sectionId);
        });
        if (forceOpen && navDrawer) {
            navDrawer.hidden = false;
        }
    }

    function toggleNavDrawer(forceVisible = null) {
        if (!navDrawer) return;
        const shouldShow = forceVisible === null ? navDrawer.hidden : Boolean(forceVisible);
        navDrawer.hidden = !shouldShow;
    }

    function renderTempProfileViews(profile, sourceLabel = 'TEMP', focusPoint = null) {
        const rows = Array.isArray(profile)
            ? profile.slice().filter((row) => Number.isFinite(Number(row.z_m))).sort((a, b) => Number(a.z_m) - Number(b.z_m))
            : [];
        manualTempProfile = rows.length ? rows.slice() : manualTempProfile;
        manualTempSourceName = sourceLabel || manualTempSourceName;
        if (focusPoint && Number.isFinite(Number(focusPoint.lat)) && Number.isFinite(Number(focusPoint.lon))) {
            setTempFocusPoint(focusPoint, 'TEMP');
        }
        updateSourceLabels();

        if (tempProfileSummary) {
            if (!rows.length) {
                tempProfileSummary.innerHTML = '<div class="temp-summary-pill"><strong>Bez dát</strong><span>Načítaj TEMP profil.</span></div>';
            } else {
                const first = rows[0];
                const last = rows[rows.length - 1];
                const lclInfo = window.MeteoCore?.vypocitajLclDetail?.(rows) || null;
                const focusText = formatCenterSafe(tempFocusPoint || selectedCenter);
                tempProfileSummary.innerHTML = [
                    '<div class="temp-summary-pill"><span>Zdroj</span><strong>' + String(sourceLabel || 'TEMP') + '</strong></div>',
                    '<div class="temp-summary-pill"><span>Hladiny</span><strong>' + rows.length + '</strong></div>',
                    '<div class="temp-summary-pill"><span>Rozsah</span><strong>' + Math.round(Number(first.z_m) || 0) + '–' + Math.round(Number(last.z_m) || 0) + ' m</strong></div>',
                    '<div class="temp-summary-pill"><span>LCL</span><strong>' + (lclInfo ? (Math.round(lclInfo.z_m) + ' m') : '—') + '</strong></div>',
                    '<div class="temp-summary-pill"><span>Súradnice</span><strong>' + focusText + '</strong></div>'
                ].join('');
            }
        }

        if (tempProfileTableWrap) {
            if (!rows.length) {
                tempProfileTableWrap.innerHTML = '<div class="temp-empty">TEMP profil zatiaľ nie je načítaný.</div>';
            } else {
                const header = '<table class="temp-table"><thead><tr><th>#</th><th>p [hPa]</th><th>z [m]</th><th>T [°C]</th><th>Td [°C]</th><th>dir [°]</th><th>spd [kt]</th><th>u [m/s]</th><th>v [m/s]</th></tr></thead><tbody>';
                const body = rows.map((row, index) => {
                    const uv = windUvFromDirSpeed(row.w_dir_deg, row.w_speed_kts);
                    return '<tr>' +
                        '<td>' + String(index + 1) + '</td>' +
                        '<td>' + (Number.isFinite(Number(row.p_hpa)) ? Number(row.p_hpa).toFixed(2) : '—') + '</td>' +
                        '<td>' + (Number.isFinite(Number(row.z_m)) ? Number(row.z_m).toFixed(1) : '—') + '</td>' +
                        '<td>' + (Number.isFinite(Number(row.T_c)) ? Number(row.T_c).toFixed(2) : '—') + '</td>' +
                        '<td>' + (Number.isFinite(Number(row.Td_c)) ? Number(row.Td_c).toFixed(2) : '—') + '</td>' +
                        '<td>' + (Number.isFinite(Number(row.w_dir_deg)) ? Number(row.w_dir_deg).toFixed(0) : '—') + '</td>' +
                        '<td>' + (Number.isFinite(Number(row.w_speed_kts)) ? Number(row.w_speed_kts).toFixed(2) : '—') + '</td>' +
                        '<td>' + (Number.isFinite(uv.u) ? uv.u.toFixed(2) : '—') + '</td>' +
                        '<td>' + (Number.isFinite(uv.v) ? uv.v.toFixed(2) : '—') + '</td>' +
                        '</tr>';
                }).join('');
                tempProfileTableWrap.innerHTML = header + body + '</tbody></table>';
            }
        }

        if (tempProfileGraph instanceof HTMLCanvasElement) {
            const ctx = tempProfileGraph.getContext('2d');
            if (!ctx) return;
            const rect = tempProfileGraph.getBoundingClientRect();
            const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
            const width = Math.max(300, Math.round(rect.width * dpr));
            const height = Math.max(180, Math.round(rect.height * dpr));
            if (tempProfileGraph.width !== width || tempProfileGraph.height !== height) {
                tempProfileGraph.width = width;
                tempProfileGraph.height = height;
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, rect.width, rect.height);
            ctx.fillStyle = '#071017';
            ctx.fillRect(0, 0, rect.width, rect.height);

            if (!rows.length) {
                ctx.fillStyle = '#8fa9b8';
                ctx.font = '14px system-ui';
                ctx.textAlign = 'center';
                ctx.fillText('Načítaj TEMP profil', rect.width / 2, rect.height / 2);
                return;
            }

            const margin = { top: 20, right: 84, bottom: 28, left: 54 };
            const plot = {
                left: margin.left,
                top: margin.top,
                right: rect.width - margin.right,
                bottom: rect.height - margin.bottom
            };
            plot.width = plot.right - plot.left;
            plot.height = plot.bottom - plot.top;

            const zValues = rows.map((row) => Number(row.z_m)).filter(Number.isFinite);
            const tValues = rows.flatMap((row) => [Number(row.T_c), Number(row.Td_c)]).filter(Number.isFinite);
            const zMin = Math.min(...zValues);
            const zMax = Math.max(...zValues);
            const tMin = Math.floor((Math.min(...tValues) - 2) / 5) * 5;
            const tMax = Math.ceil((Math.max(...tValues) + 2) / 5) * 5;
            const yOf = (z) => plot.bottom - ((z - zMin) / Math.max(1, zMax - zMin)) * plot.height;
            const xOf = (t) => plot.left + ((t - tMin) / Math.max(1, tMax - tMin)) * plot.width;

            ctx.strokeStyle = 'rgba(143,169,184,0.22)';
            ctx.lineWidth = 1;
            for (let t = tMin; t <= tMax; t += 5) {
                const x = xOf(t);
                ctx.beginPath();
                ctx.moveTo(x, plot.top);
                ctx.lineTo(x, plot.bottom);
                ctx.stroke();
            }
            for (let i = 0; i < 6; i += 1) {
                const z = zMin + ((zMax - zMin) * i / 5);
                const y = yOf(z);
                ctx.beginPath();
                ctx.moveTo(plot.left, y);
                ctx.lineTo(plot.right, y);
                ctx.stroke();
                ctx.fillStyle = '#8fa9b8';
                ctx.font = '11px system-ui';
                ctx.textAlign = 'right';
                ctx.fillText(Math.round(z) + ' m', plot.left - 8, y + 4);
            }

            const drawLine = (key, color) => {
                ctx.strokeStyle = color;
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                rows.forEach((row, index) => {
                    const x = xOf(Number(row[key]));
                    const y = yOf(Number(row.z_m));
                    if (index === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();
            };

            drawLine('T_c', '#ff6b6b');
            drawLine('Td_c', '#55efc4');

            ctx.fillStyle = '#ff6b6b';
            ctx.fillRect(rect.width - 70, 22, 12, 3);
            ctx.fillStyle = '#eef';
            ctx.font = '11px system-ui';
            ctx.textAlign = 'left';
            ctx.fillText('T', rect.width - 52, 26);
            ctx.fillStyle = '#55efc4';
            ctx.fillRect(rect.width - 70, 42, 12, 3);
            ctx.fillStyle = '#eef';
            ctx.fillText('Td', rect.width - 52, 46);

            ctx.strokeStyle = '#70e8ff';
            ctx.fillStyle = '#70e8ff';
            rows.forEach((row) => {
                const y = yOf(Number(row.z_m));
                const speed = Number(row.w_speed_kts) || 0;
                const dir = Number(row.w_dir_deg) || 0;
                const len = Math.max(8, Math.min(32, speed * 0.9));
                const startX = rect.width - 62;
                const endX = startX + Math.cos((dir - 90) * Math.PI / 180) * len;
                const endY = y + Math.sin((dir - 90) * Math.PI / 180) * len;
                ctx.beginPath();
                ctx.moveTo(startX, y);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            });
        }
    }

    function normalizeTempProfileRows(raw) {
        if (!Array.isArray(raw)) {
            throw new Error('TEMP profil musí byť pole výškových hladín.');
        }

        const aliases = {
            p_hpa: ['p_hpa', 'pressure', 'pressure_hpa', 'p', 'pres'],
            z_m: ['z_m', 'height', 'height_m', 'alt', 'altitude', 'gpheight', 'geopotential_height'],
            T_c: ['T_c', 'temperature', 'temperature_c', 'temp', 't'],
            Td_c: ['Td_c', 'dewpoint', 'dew_point', 'dewpoint_c', 'td'],
            w_dir_deg: ['w_dir_deg', 'wind_direction', 'wind_dir', 'direction', 'dd'],
            w_speed_kts: ['w_speed_kts', 'wind_speed_kts', 'wind_speed', 'speed', 'ff']
        };

        const pick = (row, names) => {
            for (const name of names) {
                if (row && row[name] !== undefined && row[name] !== null && row[name] !== '') {
                    const value = Number(String(row[name]).trim().replace(',', '.'));
                    if (Number.isFinite(value)) return value;
                }
            }
            return null;
        };

        const normalized = raw.map((row) => ({
            p_hpa: pick(row, aliases.p_hpa),
            z_m: pick(row, aliases.z_m),
            T_c: pick(row, aliases.T_c),
            Td_c: pick(row, aliases.Td_c),
            w_dir_deg: pick(row, aliases.w_dir_deg),
            w_speed_kts: pick(row, aliases.w_speed_kts)
        })).filter((row) =>
            [row.p_hpa, row.z_m, row.T_c, row.Td_c].every(Number.isFinite)
        ).sort((a, b) => Number(a.z_m) - Number(b.z_m));

        if (normalized.length < 2) {
            throw new Error('TEMP neobsahuje aspoň dve platné hladiny p, z, T a Td.');
        }

        return normalized.map((row) => ({
            ...row,
            w_dir_deg: Number.isFinite(Number(row.w_dir_deg)) ? Number(row.w_dir_deg) : 0,
            w_speed_kts: Number.isFinite(Number(row.w_speed_kts)) ? Number(row.w_speed_kts) : 0
        }));
    }

    function parseTempTextLocal(text) {
        const trimmed = String(text || '').trim();
        if (!trimmed) {
            throw new Error('TEMP súbor je prázdny.');
        }

        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed?.features) && String(parsed?.type || '') === 'FeatureCollection') {
                if (!window.WindTempLoader?.convertWindyFeatureCollection) {
                    throw new Error('WindTempLoader nevie previesť FM94 profil.');
                }
                return normalizeTempProfileRows(window.WindTempLoader.convertWindyFeatureCollection(parsed));
            }
            const raw = Array.isArray(parsed) ? parsed : (parsed.profile || parsed.levels || parsed.data || parsed.tempProfile || []);
            return normalizeTempProfileRows(raw);
        }

        const raw = [];
        for (const lineRaw of trimmed.split(/\r?\n/)) {
            const line = lineRaw.trim();
            if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith(';')) continue;
            let tokens;
            if (line.includes(';')) tokens = line.split(';');
            else if (line.includes('\t')) tokens = line.split(/\t+/);
            else if (line.includes(',') && !line.includes(' ')) tokens = line.split(',');
            else tokens = line.split(/\s+/);
            const values = tokens.map((value) => Number(String(value).trim().replace(',', '.')));
            if (values.length < 4 || !values.slice(0, 4).every(Number.isFinite)) continue;
            raw.push({
                p_hpa: values[0],
                z_m: values[1],
                T_c: values[2],
                Td_c: values[3],
                w_dir_deg: Number.isFinite(values[4]) ? values[4] : 0,
                w_speed_kts: Number.isFinite(values[5]) ? values[5] : 0
            });
        }

        return normalizeTempProfileRows(raw);
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
            document.getElementById('quickToolDock'),
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

    function getWindGenerationMode() {
        const checked = windGenerationModeInputs.find((input) => input.checked);
        return String(checked?.value || 'keep');
    }

    function resolveWindGenerationConfig() {
        const mode = getWindGenerationMode();
        if (mode === 'keep') {
            return {
                mode,
                preservePrevious: true,
                clearMode: 'none',
                label: 'zachovať predošlé'
            };
        }
        if (mode === 'clear-last') {
            return {
                mode,
                preservePrevious: false,
                clearMode: 'last',
                label: 'zmazať poslednú'
            };
        }
        return {
            mode: 'clear-all',
            preservePrevious: false,
            clearMode: 'all',
            label: 'zmazať všetko'
        };
    }

    async function genAutoRequest(action, payload = {}) {
        const response = await fetch('genauto.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...payload })
        });

        let data = null;
        try {
            data = await response.json();
        } catch (_) {
            throw new Error('GENauto endpoint vrátil neplatný JSON.');
        }

        if (!response.ok || data?.status !== 'success') {
            throw new Error(String(data?.message || 'GENauto operácia zlyhala.'));
        }

        return data;
    }

    async function persistGenerationAuto(kind, center, payload, tempMeta = {}) {
        if (!center || !Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lon))) {
            return null;
        }

        try {
            return await genAutoRequest('saveGeneration', {
                kind,
                center,
                payload,
                ...tempMeta
            });
        } catch (error) {
            logStatus('GENauto zápis pre ' + kind + ' zlyhal: ' + error.message, 'error');
            return null;
        }
    }

    function formatWindCompareLabel(record, index) {
        const time = record?.generated_at_utc ? String(record.generated_at_utc).slice(11, 19) : '--:--:--';
        const mode = String(record?.payload?.generationMode || '-');
        const hasWebm = record?.webm_exists === true ? 'webm' : 'json';
        return String(index + 1) + ' · ' + time + ' · ' + mode + ' · ' + hasWebm;
    }

    function populateWindCompareSelector(records) {
        if (!windCompareGenerationTest) return;

        windCompareGenerationTest.replaceChildren();

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = records.length ? 'Vyber WIND generáciu' : 'Najprv načítaj uložené WIND generácie';
        windCompareGenerationTest.appendChild(emptyOption);

        records.forEach((record, index) => {
            const option = document.createElement('option');
            option.value = String(record.file || '');
            option.textContent = formatWindCompareLabel(record, index);
            windCompareGenerationTest.appendChild(option);
        });

        windCompareGenerationTest.value = records.length ? String(records[records.length - 1]?.file || '') : '';
    }

    function getSelectedWindRecord() {
        const selectedFile = String(windCompareGenerationTest?.value || '');
        if (!selectedFile) return null;
        return windLoadedRecords.find((record) => String(record.file || '') === selectedFile) || null;
    }

    async function showSelectedWindRecord() {
        const record = getSelectedWindRecord();
        if (!record) return;

        const payload = record.payload && typeof record.payload === 'object' ? record.payload : {};
        const center = payload.focusCenter || record.center || selectedCenter;
        await runWindLayer(
            {
                lat: Number(center?.lat),
                lon: Number(center?.lon)
            },
            Number(payload?.windSettings?.radiusM) || Number(radiusInput.value),
            null,
            {
                tempProfileOverride: Array.isArray(payload.tempProfile) ? payload.tempProfile : null,
                windOverrides: payload.windSettings && typeof payload.windSettings === 'object' ? payload.windSettings : {},
                generationConfigOverride: { mode: 'keep', preservePrevious: true, clearMode: 'none', label: 'porovnanie' },
                skipAutoRecord: true,
                reason: 'porovnanie: ' + (record.file || 'GENauto')
            }
        );
    }

    function clearGenAutoMapLayer() {
        if (!viewer || viewer.isDestroyed()) return;
        if (!genAutoMapLayer) return;
        viewer.dataSources.remove(genAutoMapLayer, true);
        genAutoMapLayer = null;
    }

    function formatMapCompareLabel(record, index) {
        const time = record?.generated_at_utc ? String(record.generated_at_utc).slice(11, 19) : '--:--:--';
        const mode = String(record?.payload?.generationMode || '-');
        return String(index + 1) + ' · ' + time + ' · ' + mode;
    }

    function populateMapCompareSelector(records) {
        if (!mapCompareGenerationTest) return;

        mapCompareGenerationTest.replaceChildren();

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = records.length ? 'Vyber mapovú generáciu' : 'Najprv načítaj uložené mapové generácie';
        mapCompareGenerationTest.appendChild(emptyOption);

        records.forEach((record, index) => {
            const option = document.createElement('option');
            option.value = String(record.file || '');
            option.textContent = formatMapCompareLabel(record, index);
            mapCompareGenerationTest.appendChild(option);
        });

        mapCompareGenerationTest.value = records.length ? String(records[records.length - 1]?.file || '') : '';
    }

    function getSelectedMapRecord() {
        const selectedFile = String(mapCompareGenerationTest?.value || '');
        if (!selectedFile) return null;
        return mapLoadedRecords.find((record) => String(record.file || '') === selectedFile) || null;
    }

    async function renderMapGenerationsInScene(records) {
        if (!viewer || viewer.isDestroyed() || !window.Cesium) return;

        clearGenAutoMapLayer();

        const ds = new Cesium.CustomDataSource('GENAUTO_MAP_POINTS_TEST');
        const positions = [];

        records.forEach((record, index) => {
            const center = record?.center || record?.payload?.focusCenter || null;
            const lat = Number(center?.lat);
            const lon = Number(center?.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

            const cart = Cesium.Cartesian3.fromDegrees(lon, lat, 26);
            positions.push(cart);

            ds.entities.add({
                position: cart,
                point: {
                    pixelSize: 7,
                    color: Cesium.Color.fromCssColorString('#FFD166'),
                    outlineColor: Cesium.Color.fromCssColorString('#2A1A00'),
                    outlineWidth: 1
                },
                label: {
                    text: String(index + 1) + ' · ' + formatMapCompareLabel(record, index),
                    font: '11px monospace',
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    fillColor: Cesium.Color.fromCssColorString('#FFF5D6'),
                    outlineColor: Cesium.Color.fromCssColorString('#1D1D1D'),
                    outlineWidth: 2,
                    pixelOffset: new Cesium.Cartesian2(14, -10),
                    horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
                    verticalOrigin: Cesium.VerticalOrigin.CENTER,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                }
            });
        });

        if (positions.length >= 2) {
            ds.entities.add({
                polyline: {
                    positions,
                    width: 2,
                    material: Cesium.Color.fromCssColorString('#FFD166').withAlpha(0.75)
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
                    destination: Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 2600),
                    duration: 1.5
                });
            }
        }
    }

    async function showSelectedMapRecord() {
        const record = getSelectedMapRecord();
        if (!record) {
            clearGenAutoMapLayer();
            return;
        }
        await renderMapGenerationsInScene([record]);
    }

    async function loadWindFromGenAutoFiles() {
        if (!viewer || viewer.isDestroyed()) {
            logStatus('WIND: mapa ešte nie je pripravená na načítanie zo súborov.', 'error');
            return;
        }
        if (windLoadingFromFiles) {
            logStatus('WIND: načítanie zo súborov už prebieha.', 'info');
            return;
        }

        windLoadingFromFiles = true;
        windLoadFromFilesButtonTest.disabled = true;
        const originalButtonText = windLoadFromFilesButtonTest.textContent;
        windLoadFromFilesButtonTest.textContent = '... načítavam';

        try {
            const response = await genAutoRequest('listWindToday', { limit: 300 });
            const records = Array.isArray(response.records) ? response.records : [];

            if (!records.length) {
                windLoadedRecords = [];
                populateWindCompareSelector([]);
                logStatus('GENauto: pre dnešok nie sú uložené žiadne WIND súbory.', 'info');
                return;
            }

            windLoadedRecords = records.slice();
            populateWindCompareSelector(windLoadedRecords);
            window.WindRender?.clear?.(viewer, 'all');
            await showSelectedWindRecord();
            logStatus('GENauto: načítaných WIND generácií ' + records.length + '.', 'success');
        } catch (error) {
            logStatus('GENauto: načítanie vetra zo súborov zlyhalo: ' + error.message, 'error');
        } finally {
            windLoadingFromFiles = false;
            windLoadFromFilesButtonTest.disabled = false;
            windLoadFromFilesButtonTest.textContent = originalButtonText;
        }
    }

    async function loadMapFromGenAutoFiles() {
        if (!viewer || viewer.isDestroyed()) {
            logStatus('MAPA: scéna ešte nie je pripravená.', 'error');
            return;
        }
        if (mapLoadingFromFiles) {
            logStatus('MAPA: načítanie mapových generácií už prebieha.', 'info');
            return;
        }

        mapLoadingFromFiles = true;
        mapLoadFromFilesButtonTest.disabled = true;
        const originalButtonText = mapLoadFromFilesButtonTest.textContent;
        mapLoadFromFilesButtonTest.textContent = '... načítavam';

        try {
            const response = await genAutoRequest('listMapToday', { limit: 1000 });
            const records = Array.isArray(response.records) ? response.records : [];

            if (!records.length) {
                mapLoadedRecords = [];
                populateMapCompareSelector([]);
                clearGenAutoMapLayer();
                logStatus('GENauto: pre dnešok nie sú uložené žiadne mapové generácie.', 'info');
                return;
            }

            mapLoadedRecords = records.slice();
            populateMapCompareSelector(mapLoadedRecords);
            await showSelectedMapRecord();
            logStatus('GENauto: načítaných mapových generácií ' + records.length + '.', 'success');
        } catch (error) {
            logStatus('GENauto: načítanie mapových generácií zlyhalo: ' + error.message, 'error');
        } finally {
            mapLoadingFromFiles = false;
            mapLoadFromFilesButtonTest.disabled = false;
            mapLoadFromFilesButtonTest.textContent = originalButtonText;
        }
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

    function windUvFromDirSpeed(dirDeg, speedKts) {
        const dir = Number(dirDeg);
        const speedMs = Number(speedKts) * 0.514444;
        if (!Number.isFinite(dir) || !Number.isFinite(speedMs)) {
            return { u: null, v: null, speedMs: null };
        }

        const rad = (dir * Math.PI) / 180;
        return {
            u: -Math.sin(rad) * speedMs,
            v: -Math.cos(rad) * speedMs,
            speedMs
        };
    }

    async function loadAndLogTempProfileFirst(center) {
        if (Array.isArray(manualTempProfile) && manualTempProfile.length >= 2) {
            logStatus('TEMP profil: používam ručne načítaný profil „' + manualTempSourceName + '”.', 'info');
            renderTempProfileViews(manualTempProfile, manualTempSourceName);
            manualTempProfile.forEach((lvl, index) => {
                const uv = windUvFromDirSpeed(lvl.w_dir_deg, lvl.w_speed_kts);
                logStatus(
                    'TEMP[' + String(index + 1).padStart(3, '0') + ']' +
                    ' p=' + Number(lvl.p_hpa).toFixed(2) + ' hPa' +
                    ' | z=' + Number(lvl.z_m).toFixed(1) + ' m' +
                    ' | T=' + Number(lvl.T_c).toFixed(2) + ' °C' +
                    ' | Td=' + Number(lvl.Td_c).toFixed(2) + ' °C' +
                    ' | wind=' + Number(lvl.w_dir_deg).toFixed(0) + '° @ ' + Number(lvl.w_speed_kts).toFixed(2) + ' kt' +
                    ' (' + (Number.isFinite(uv.speedMs) ? uv.speedMs.toFixed(2) : '--') + ' m/s)' +
                    ' | u=' + (Number.isFinite(uv.u) ? uv.u.toFixed(2) : '--') + ' m/s' +
                    ' | v=' + (Number.isFinite(uv.v) ? uv.v.toFixed(2) : '--') + ' m/s',
                    'info'
                );
            });
            return manualTempProfile.slice();
        }

        const mode = String(windTempSourceMode?.value || 'auto');
        const sourceUrl = String(windTempSourceUrl?.value || '').trim();
        const settings = {
            sourceMode: mode,
            tempSourceUrl: sourceUrl,
            windyTempUrl: String(windyTempUrl?.value || '').trim(),
            stationIndexUrl: String(stationIndexUrl?.value || '').trim(),
            stationProfileUrlTemplate: String(stationProfileUrlTemplate?.value || '').trim()
        };

        if (!window.WindTempLoader?.loadProfile) {
            throw new Error('WindTempLoader nie je dostupný.');
        }

        logStatus(
            'TEMP profil: načítavam pred výpočtom (mode=' + mode + ', source=' + (sourceUrl || 'nezadaný') + ').',
            'info'
        );

        const profile = await window.WindTempLoader.loadProfile(center, settings);
        const resolved = window.WindTempLoader?.lastResolvedSource || null;

        const sorted = Array.isArray(profile)
            ? profile.slice().filter((lvl) => Number.isFinite(Number(lvl.z_m))).sort((a, b) => Number(a.z_m) - Number(b.z_m))
            : [];

        if (sorted.length < 2) {
            throw new Error('TEMP profil neobsahuje aspoň dve validné hladiny.');
        }

        const low = sorted[0];
        const high = sorted[sorted.length - 1];
        logStatus(
            'TEMP profil pripravený: ' + sorted.length +
            ' hladín, z=' + Math.round(Number(low.z_m) || 0) +
            ' až ' + Math.round(Number(high.z_m) || 0) +
            ' m, resolved=' + (resolved?.resolvedMode || mode) +
            (resolved?.detail ? ' (' + resolved.detail + ')' : '') + '.',
            'success'
        );

        logStatus('TEMP DETAIL (všetky hladiny):', 'info');
        sorted.forEach((lvl, index) => {
            const z = Number(lvl.z_m);
            const p = Number(lvl.p_hpa);
            const t = Number(lvl.T_c);
            const td = Number(lvl.Td_c);
            const dir = Number(lvl.w_dir_deg);
            const speedKts = Number(lvl.w_speed_kts);
            const uv = windUvFromDirSpeed(dir, speedKts);

            logStatus(
                'TEMP[' + String(index + 1).padStart(3, '0') + ']' +
                ' p=' + (Number.isFinite(p) ? p.toFixed(2) : '--') + ' hPa' +
                ' | z=' + (Number.isFinite(z) ? z.toFixed(1) : '--') + ' m' +
                ' | T=' + (Number.isFinite(t) ? t.toFixed(2) : '--') + ' °C' +
                ' | Td=' + (Number.isFinite(td) ? td.toFixed(2) : '--') + ' °C' +
                ' | wind=' + (Number.isFinite(dir) ? dir.toFixed(0) : '--') + '° @ ' +
                (Number.isFinite(speedKts) ? speedKts.toFixed(2) : '--') + ' kt' +
                ' (' + (Number.isFinite(uv.speedMs) ? uv.speedMs.toFixed(2) : '--') + ' m/s)' +
                ' | u=' + (Number.isFinite(uv.u) ? uv.u.toFixed(2) : '--') + ' m/s' +
                ' | v=' + (Number.isFinite(uv.v) ? uv.v.toFixed(2) : '--') + ' m/s',
                'info'
            );
        });

        return sorted;
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
            ' | generations=' + resolveWindGenerationConfig().mode +
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
    windDeleteLastButton.addEventListener('click', () => {
        const removed = Number(window.WindRender?.clear?.(viewer, 'last') || 0);
        if (removed > 0) {
            logStatus('WIND: zmazaná posledná generácia.', 'success');
            return;
        }
        logStatus('WIND: nebola nájdená žiadna generácia na zmazanie.', 'info');
    });
    windDeleteAllButton.addEventListener('click', () => {
        const removed = Number(window.WindRender?.clear?.(viewer, 'all') || 0);
        if (removed > 0) {
            logStatus('WIND: zmazané všetky generácie (' + removed + ').', 'success');
            return;
        }
        logStatus('WIND: neboli nájdené žiadne generácie na zmazanie.', 'info');
    });
    navTabs.forEach((button) => {
        button.addEventListener('click', () => {
            const sectionId = String(button.dataset.navSection || 'sources');
            const sameSectionOpen = activeNavSection === sectionId && navDrawer && !navDrawer.hidden;
            if (sameSectionOpen) {
                toggleNavDrawer(false);
                return;
            }
            setActiveNavSection(sectionId, true);
        });
    });
    navHomeButtons.forEach((button) => {
        button.addEventListener('click', () => {
            window.location.href = 'index.php';
        });
    });
    navRouteButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const route = String(button.dataset.navRoute || '').trim();
            if (route === 'explorer') {
                window.location.href = 'explorer.php';
            }
        });
    });
    navDockMode?.addEventListener('change', () => applyNavDock(navDockMode.value));
    navThemeToggleButton?.addEventListener('click', () => {
        const current = document.body.dataset.theme === 'dark' ? 'dark' : 'light';
        applyUiTheme(current === 'dark' ? 'light' : 'dark');
    });
    navCloseDrawerButton?.addEventListener('click', () => toggleNavDrawer(false));
    quickOpenSourcesButton?.addEventListener('click', () => setActiveNavSection('sources', true));
    quickAnalyzeButton?.addEventListener('click', () => document.getElementById('analyzeButton')?.click());
    quickClearButton?.addEventListener('click', () => document.getElementById('clearButton')?.click());
    quickCursorModeButton?.addEventListener('click', () => {
        applyMouseMode(!mapMouseCrosshairMode);
    });
    openSetupButton?.addEventListener('click', () => {
        window.location.href = 'setup.php';
    });
    tempCleanupButton?.addEventListener('click', async () => {
        const originalText = tempCleanupButton.textContent;
        tempCleanupButton.disabled = true;
        tempCleanupButton.textContent = '... čistím';
        try {
            await runTempCleanupMaintenance();
        } catch (error) {
            logStatus('Údržba TEMP zlyhala: ' + (error?.message || String(error)), 'error');
            if (tempCleanupStatus) {
                tempCleanupStatus.textContent = 'Posledná údržba: chyba';
            }
        } finally {
            tempCleanupButton.disabled = false;
            tempCleanupButton.textContent = originalText;
        }
    });
    document.getElementById('clearDebugButton')?.addEventListener('click', () => {
        statusEl.replaceChildren();
        logStatus('Debugger bol vyčistený.');
    });
    loadIgcButton?.addEventListener('click', () => igcInput?.click());
    loadTempButton?.addEventListener('click', () => tempInput?.click());
    tempDownloadButton?.addEventListener('click', () => {
        downloadTempProfileJson();
    });
    tempSaveDbButton?.addEventListener('click', async () => {
        const originalText = tempSaveDbButton.textContent;
        tempSaveDbButton.disabled = true;
        tempSaveDbButton.textContent = '... ukladám';
        try {
            await saveCurrentTempToDb();
        } catch (error) {
            logStatus('TEMP DB: ukladanie zlyhalo: ' + (error?.message || String(error)), 'error');
        } finally {
            tempSaveDbButton.disabled = false;
            tempSaveDbButton.textContent = originalText;
        }
    });
    tempRefreshSavedButton?.addEventListener('click', async () => {
        const originalText = tempRefreshSavedButton.textContent;
        tempRefreshSavedButton.disabled = true;
        tempRefreshSavedButton.textContent = '... načítavam';
        try {
            await loadSavedTempList();
        } catch (error) {
            logStatus('TEMP DB: načítanie zoznamu zlyhalo: ' + (error?.message || String(error)), 'error');
        } finally {
            tempRefreshSavedButton.disabled = false;
            tempRefreshSavedButton.textContent = originalText;
        }
    });
    tempLoadSavedButton?.addEventListener('click', async () => {
        const originalText = tempLoadSavedButton.textContent;
        tempLoadSavedButton.disabled = true;
        tempLoadSavedButton.textContent = '...';
        try {
            await loadSelectedTempFromDb();
        } catch (error) {
            logStatus('TEMP DB: načítanie profilu zlyhalo: ' + (error?.message || String(error)), 'error');
        } finally {
            tempLoadSavedButton.disabled = false;
            tempLoadSavedButton.textContent = originalText;
        }
    });
    igcInput?.addEventListener('change', async () => {
        const file = igcInput.files?.[0];
        if (!file) return;

        loadIgcButton.disabled = true;
        loadIgcButton.textContent = '... načítavam';
        try {
            const igcText = await file.text();
            const sharedParser = window.TermikaUxIgcParser?.parseBTrack;
            if (typeof sharedParser !== 'function') {
                throw new Error('Spoločný IGC parser nie je dostupný (TermikaUxIgcParser.parseBTrack).');
            }

            const parsedShared = sharedParser(igcText);
            const points = Array.isArray(parsedShared?.body) ? parsedShared.body : [];
            if (!points.length) {
                throw new Error('IGC neobsahuje žiadne validné B-záznamy.');
            }

            if (typeof window.CesiumRender?.pripravCelyLet !== 'function') {
                throw new Error('Cesium render modul nie je dostupný (CesiumRender.pripravCelyLet).');
            }

            if (points.length < 2) {
                throw new Error('IGC má príliš málo bodov na vykreslenie dráhy.');
            }

            window.CesiumRender.pripravCelyLet(viewer, points);
            window.CesiumRender.nastavRezimKamery?.(viewer, 'overview', points, 0);

            const center = parsedShared?.center || points[Math.floor(points.length / 2)] || points[0];
            selectedCenter = { lat: Number(center.lat), lon: Number(center.lon) };
            previewCenter = { ...selectedCenter };
            selectedPoint.position = Cesium.Cartesian3.fromDegrees(selectedCenter.lon, selectedCenter.lat);
            syncCenterUi(selectedCenter);
            loadedIgcName.textContent = file.name;
            loadedIgcName.title = file.name;
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(selectedCenter.lon, selectedCenter.lat, 3000),
                duration: 1.5
            });
            logStatus('IGC načítaný: ' + file.name + ', body=' + points.length + ', nový stred ' + formatCenter(selectedCenter) + '.', 'success');
            setActiveNavSection('analysis', false);
        } catch (error) {
            logStatus('IGC súbor sa nepodarilo načítať: ' + (error?.message || String(error)), 'error');
        } finally {
            loadIgcButton.disabled = false;
            loadIgcButton.textContent = 'Načítať IGC';
            igcInput.value = '';
        }
    });
    tempInput?.addEventListener('change', async () => {
        const file = tempInput.files?.[0];
        if (!file) return;

        loadTempButton.disabled = true;
        loadTempButton.textContent = '... načítavam';
        try {
            const text = await file.text();
            const profile = parseTempTextLocal(text);
            manualTempProfile = profile.slice();
            manualTempSourceName = file.name;
            renderTempProfileViews(profile, file.name, selectedCenter);
            logStatus('TEMP načítaný: ' + file.name + ', hladiny=' + profile.length + '.', 'success');
            setActiveNavSection('temp', false);
        } catch (error) {
            logStatus('TEMP súbor sa nepodarilo načítať: ' + (error?.message || String(error)), 'error');
        } finally {
            loadTempButton.disabled = false;
            loadTempButton.textContent = 'Načítať TEMP';
            tempInput.value = '';
        }
    });
    applyNavDock(navDockMode?.value || 'top');
    initUiTheme();
    applyMouseMode(true);
    setActiveNavSection('sources', false);
    toggleNavDrawer(false);
    renderTempProfileViews([], manualTempSourceName);
    windClearTodayButtonTest?.addEventListener('click', async () => {
        if (!viewer || viewer.isDestroyed()) {
            logStatus('GENauto: mapa ešte nie je pripravená.', 'error');
            return;
        }

        windClearTodayButtonTest.disabled = true;
        const originalText = windClearTodayButtonTest.textContent;
        windClearTodayButtonTest.textContent = '... mažem';

        try {
            const removedLayers = Number(window.WindRender?.clear?.(viewer, 'all') || 0);
            clearGenAutoMapLayer();
            const response = await genAutoRequest('clearToday', { kinds: ['map', 'wind', 'temp'] });
            const deletedMap = Number(response.deleted?.map || 0);
            const deletedWind = Number(response.deleted?.wind || 0);
            const deletedTemp = Number(response.deleted?.temp || 0);
            windLoadedRecords = [];
            mapLoadedRecords = [];
            tempSavedRecords = [];
            populateWindCompareSelector([]);
            populateMapCompareSelector([]);
            populateTempSavedSelector([]);

            logStatus(
                'GENauto: zmazané dnešné súbory map=' + deletedMap + ', wind=' + deletedWind +
                ', temp=' + deletedTemp +
                '; odstránené vrstvy z mapy=' + removedLayers + '.',
                'success'
            );

            renderTempProfileViews(sorted, resolved?.detail || sourceUrl || mode);
        } catch (error) {
            logStatus('GENauto: mazanie dnešných generácií zlyhalo: ' + error.message, 'error');
        } finally {
            windClearTodayButtonTest.disabled = false;
            windClearTodayButtonTest.textContent = originalText;
        }
    });
    windLoadFromFilesButtonTest?.addEventListener('click', async () => {
        await loadWindFromGenAutoFiles();
    });
    mapLoadFromFilesButtonTest?.addEventListener('click', async () => {
        await loadMapFromGenAutoFiles();
    });
    windCompareGenerationTest?.addEventListener('change', async () => {
        if (!windLoadedRecords.length) return;
        await showSelectedWindRecord();
    });
    mapCompareGenerationTest?.addEventListener('change', async () => {
        if (!mapLoadedRecords.length) return;
        await showSelectedMapRecord();
    });
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
    setTempFocusPoint(selectedCenter, 'stred');
    updateCursorCoordsBadge();
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
    updateSourceLabels();

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

    function zoomToAltitudeM(zoomValue) {
        const zoom = Number(zoomValue);
        if (!Number.isFinite(zoom)) return 3000;
        const clamped = Math.min(16, Math.max(1, zoom));
        return Math.max(700, Math.round(22000000 / Math.pow(2, clamped)));
    }

    function altitudeMToZoom(altitudeM) {
        const altitude = Number(altitudeM);
        if (!Number.isFinite(altitude) || altitude <= 0) return 9;
        const estimate = Math.log2(22000000 / altitude);
        return Math.min(16, Math.max(1, Math.round(estimate)));
    }

    function applyIncomingFocus(payload, sourceLabel = 'kanál windy-focus') {
        if (!payload || typeof payload !== 'object') {
            logStatus('Komunikácia: prišiel neplatný payload fokusu.', 'error');
            return;
        }

        const lat = Number(payload.lat);
        const lon = Number(payload.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
            logStatus('Komunikácia: payload fokusu nemá platné lat/lon.', 'error');
            return;
        }

        const point = { lat, lon };
        const destinationHeightM = zoomToAltitudeM(payload.zoom);

        selectedCenter = point;
        previewCenter = { ...point };
        selectedPoint.position = Cesium.Cartesian3.fromDegrees(point.lon, point.lat);
        syncCenterUi(point);

        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(point.lon, point.lat, destinationHeightM),
            duration: 1.3
        });

        const zoomLabel = Number.isFinite(Number(payload.zoom)) ? String(Math.round(Number(payload.zoom))) : 'auto';
        logStatus(
            'Komunikácia: fokus prijatý zo zdroja ' + sourceLabel +
            ' -> ' + formatCenter(point) + ' (zoom ' + zoomLabel + ').',
            'success'
        );
    }

    function setWindyAdapterStatusBadge(status, message) {
        if (!windyAdapterStatusBadge) return;

        const normalized = String(status || 'offline').toLowerCase();
        windyAdapterStatusBadge.textContent = normalized.toUpperCase();
        windyAdapterStatusBadge.title = String(message || '');

        if (normalized === 'ready') {
            windyAdapterStatusBadge.style.color = '#59d68b';
            return;
        }
        if (normalized === 'error') {
            windyAdapterStatusBadge.style.color = '#ff8a80';
            return;
        }
        windyAdapterStatusBadge.style.color = '#8fa9b8';
    }

    function formatTimestampLocal(isoString) {
        const timestamp = String(isoString || '').trim();
        if (!timestamp) return '--';
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return '--';
        return date.toLocaleString('sk-SK');
    }

    function setWindyAdapterLastUpdateBadge(timestampIso, sourceLabel = '') {
        if (!windyAdapterLastUpdateBadge) return;
        const timeText = formatTimestampLocal(timestampIso);
        windyAdapterLastUpdateBadge.textContent = timeText;
        windyAdapterLastUpdateBadge.title = String(timestampIso || '');
    }

    function setWindyAdapterSourceBadge(sourceLabel = '') {
        if (!windyAdapterSourceBadge) return;
        const source = String(sourceLabel || '').trim();
        if (!source) {
            windyAdapterSourceBadge.textContent = '--';
            windyAdapterSourceBadge.style.color = '#8fa9b8';
            return;
        }

        windyAdapterSourceBadge.textContent = source;

        if (/windyapi\.map|windymap|windy-map-bridge/i.test(source)) {
            windyAdapterSourceBadge.style.color = '#59d68b';
            return;
        }
        if (/local-event-bus|leaflet|mock/i.test(source)) {
            windyAdapterSourceBadge.style.color = '#8fd0ff';
            return;
        }
        if (/error|unknown/i.test(source)) {
            windyAdapterSourceBadge.style.color = '#ff8a80';
            return;
        }
        windyAdapterSourceBadge.style.color = '#b6c7d1';
    }

    function refreshWindyAdapterStatus() {
        const fallbackMessage = 'Windy adapter nie je načítaný.';
        if (!window.WindyMapAdapterTool?.getStatus) {
            setWindyAdapterStatusBadge('offline', fallbackMessage);
            setWindyAdapterLastUpdateBadge('', '');
            setWindyAdapterSourceBadge('');
            return;
        }

        const status = window.WindyMapAdapterTool.getStatus();
        setWindyAdapterStatusBadge(status.status, status.message);
        setWindyAdapterLastUpdateBadge(status.lastStatusAtIso || status?.lastFocus?.timestampIso, status.bridgeName || 'adapter');
        setWindyAdapterSourceBadge(status.bridgeName || 'adapter');
    }

    if (window.TermikaCommunicationTool) {
        communicationDisposers.push(window.TermikaCommunicationTool.on('channel:windy-focus', ({ payload, context }) => {
            const adapterId = String(context?.adapterId || 'unknown');
            applyIncomingFocus(payload, adapterId);
            setWindyAdapterLastUpdateBadge(payload?.timestampIso, adapterId);
            setWindyAdapterSourceBadge(adapterId);
        }));
        communicationDisposers.push(window.TermikaCommunicationTool.on('windy-map-adapter:status', ({ status, message, updatedAtIso, bridgeName, heartbeat }) => {
            setWindyAdapterStatusBadge(status, message);
            setWindyAdapterLastUpdateBadge(updatedAtIso, bridgeName || 'adapter');
            setWindyAdapterSourceBadge((heartbeat ? 'heartbeat · ' : '') + String(bridgeName || 'adapter'));
        }));
        communicationDisposers.push(window.TermikaCommunicationTool.on('windy-map-adapter:focus', ({ focus, bridgeName, updatedAtIso }) => {
            setWindyAdapterLastUpdateBadge(updatedAtIso || focus?.timestampIso, bridgeName || focus?.source || 'adapter');
            setWindyAdapterSourceBadge(bridgeName || focus?.source || 'adapter');
        }));
        communicationDisposers.push(window.TermikaCommunicationTool.on('windy-map-bridge:ready', ({ name, timestampIso }) => {
            setWindyAdapterLastUpdateBadge(timestampIso, String(name || 'bridge-ready'));
            setWindyAdapterSourceBadge(String(name || 'bridge-ready'));
            logStatus('Windy bridge pripravený: ' + String(name || 'unknown') + '.', 'success');
        }));
    } else {
        logStatus('Komunikačný modul nie je načítaný. Kanál windy-focus je neaktívny.', 'error');
    }

    function pickTerrainPosition(screenPosition) {
        const cartesian = viewer.scene.pickPosition(screenPosition) || viewer.camera.pickEllipsoid(screenPosition);
        if (!cartesian) return null;
        const point = Cesium.Cartographic.fromCartesian(cartesian);
        return {
            lat: Cesium.Math.toDegrees(point.latitude),
            lon: Cesium.Math.toDegrees(point.longitude)
        };
    }

    // Funkcia na načítanie TEMP pri kliknutí na bod mapy
    async function loadTempOnPointClick(point) {
        if (!window.WindTempLoader) {
            logStatus('WindTempLoader modul nie je načítaný.', 'error');
            return;
        }

        try {
            setTempFocusPoint(point, 'klik mapy');
            logStatus('Načítavám TEMP profil pre bod ' + formatCenter(point) + '...', 'info');

            const sourceMode = document.getElementById('windTempSourceMode')?.value || 'auto';
            const windyTempUrl = document.getElementById('windyTempUrl')?.value?.trim() || 'windy-temp-proxy.php?lat=${lat}&lon=${lon}';
            const tempSourceUrl = document.getElementById('windTempSourceUrl')?.value?.trim() || 'XCtrack/temptest.json';
            const stationIndexUrl = document.getElementById('stationIndexUrl')?.value?.trim() || '';
            const stationProfileUrlTemplate = document.getElementById('stationProfileUrlTemplate')?.value?.trim() || '';

            const settings = {
                sourceMode: sourceMode,
                windyTempUrl: windyTempUrl,
                windyTempUrlTemplate: windyTempUrl,
                tempSourceUrl: tempSourceUrl,
                stationIndexUrl: stationIndexUrl,
                stationProfileUrlTemplate: stationProfileUrlTemplate
            };

            window.WindTempLoader.configure(settings);

            const profile = await window.WindTempLoader.loadProfile(point, settings);
            const resolvedSource = window.WindTempLoader?.lastResolvedSource;

            if (!Array.isArray(profile) || profile.length === 0) {
                logStatus('TEMP profil je prázdny. Skontroluj nastavenia zdroja.', 'warning');
                renderTempProfileViews([], 'PRÁZDNY');
                return;
            }

            renderTempProfileViews(profile, resolvedSource?.resolvedMode || 'TEMP', point);

            await autoSaveTempProfileIfWindy(profile, point, resolvedSource);

            if (document.getElementById('pTempFile')) {
                document.getElementById('pTempFile').textContent = resolvedSource?.detail || sourceMode;
            }

            logStatus('TEMP profil načítaný z ' + (resolvedSource?.resolvedMode || sourceMode) + ' pre bod ' + formatCenter(point) + '.', 'success');
        } catch (error) {
            logStatus('Chyba pri načítaní TEMP profilu: ' + (error?.message || String(error)), 'error');
            renderTempProfileViews([], 'CHYBA: ' + (error?.message || 'unknown error'));
        }
    }

    sceneInputHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    sceneInputHandler.setInputAction((event) => {
        const point = pickTerrainPosition(event.endPosition);
        if (point) {
            previewCenter = point;
            if (mapMouseCrosshairMode) {
                updateCursorCoordsBadge(point);
            }
        } else if (mapMouseCrosshairMode) {
            updateCursorCoordsBadge();
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    sceneInputHandler.setInputAction((event) => {
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
        setTempFocusPoint(point, 'klik mapy');
        logStatus('Vybraný nový stred kruhovej analýzy.');
        
        // Automaticky načítaj TEMP profil z Windy pre tento bod
        loadTempOnPointClick(point);
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
        setTempFocusPoint(parsed, 'ručný fokus');

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

    windBroadcastFocusButton?.addEventListener('click', async () => {
        if (!window.TermikaCommunicationTool) {
            logStatus('Komunikačný modul nie je dostupný.', 'error');
            return;
        }

        try {
            const currentHeightM = Number(viewer.camera.positionCartographic?.height);
            const payload = {
                lat: selectedCenter.lat,
                lon: selectedCenter.lon,
                zoom: altitudeMToZoom(currentHeightM),
                source: 'terrain-analysis-test',
                timestampIso: new Date().toISOString()
            };

            await window.TermikaCommunicationTool.send('windy-focus', payload, {
                meta: { origin: 'terrain-analysis-test' }
            });

            logStatus('Komunikácia: odoslaný windy-focus payload ' + formatCenter(selectedCenter) + '.', 'success');
        } catch (error) {
            logStatus('Komunikácia: odoslanie windy-focus zlyhalo: ' + (error?.message || String(error)), 'error');
        }
    });

    windSimulateIncomingFocusButton?.addEventListener('click', async () => {
        if (!window.TermikaCommunicationTool) {
            logStatus('Komunikačný modul nie je dostupný.', 'error');
            return;
        }

        try {
            const samplePayload = {
                lat: Number((selectedCenter.lat + 0.035).toFixed(5)),
                lon: Number((selectedCenter.lon + 0.045).toFixed(5)),
                zoom: 10,
                source: 'windy-map-mock',
                timestampIso: new Date().toISOString()
            };

            await window.TermikaCommunicationTool.send('windy-focus', samplePayload, {
                meta: { origin: 'windy-map-mock' }
            });
        } catch (error) {
            logStatus('Komunikácia: simulácia windy-focus zlyhala: ' + (error?.message || String(error)), 'error');
        }
    });

    windyAdapterConnectButton?.addEventListener('click', () => {
        if (!window.WindyMapAdapterTool) {
            logStatus('Windy adapter modul nie je načítaný.', 'error');
            refreshWindyAdapterStatus();
            return;
        }

        try {
            const connected = Boolean(window.WindyMapAdapterTool.enable());
            const status = window.WindyMapAdapterTool.getStatus?.();
            refreshWindyAdapterStatus();
            if (connected && status?.status === 'ready') {
                logStatus('Windy adapter je pripravený: ' + String(status.bridgeName || 'bridge') + '.', 'success');
                return;
            }
            logStatus('Windy adapter je zapnutý, ale bridge zatiaľ nie je dostupný.', 'info');
        } catch (error) {
            logStatus('Windy adapter sa nepodarilo zapnúť: ' + (error?.message || String(error)), 'error');
            refreshWindyAdapterStatus();
        }
    });

    if (window.WindyMapAdapterTool) {
        try {
            window.WindyMapAdapterTool.enable();
        } catch (_) {
            // Ignore boot errors and keep manual connect available.
        }
    }
    refreshWindyAdapterStatus();

    // --- Windy Map Forecast embed ---
    let windyAPI = null;
    let windyMapInitialized = false;
    let windyMapInitRetryTimer = null;
    let windyMapInitFailTimer = null;
    let windyLibBootLoadPromise = null;
    let windyMapInitAttempts = 0;
    const WINDY_MAP_INIT_MAX_ATTEMPTS = 3;
    let windyMapFocusPickerEnabled = false;
    let windyMapPickedFocus = null;
    let windyMapFocusMarker = null;

    function formatWindyFocus(point, zoom = null) {
        if (!point || !Number.isFinite(Number(point.lat)) || !Number.isFinite(Number(point.lon))) {
            return 'Naviguj na Windy mape...';
        }

        const base = Number(point.lat).toFixed(5) + ', ' + Number(point.lon).toFixed(5);
        if (Number.isFinite(Number(zoom))) {
            return base + '  (zoom ' + Math.round(Number(zoom)) + ')';
        }
        return base;
    }

    function formatWindyMapKeyFingerprint(rawKey) {
        const key = String(rawKey || '').trim();
        if (!key) return '(none)';
        if (key.length <= 10) return key;
        return key.slice(0, 6) + '...' + key.slice(-4);
    }

    function setWindyMapFocusPickerEnabled(enabled) {
        windyMapFocusPickerEnabled = Boolean(enabled);

        if (windyFocusPickerToggleButton) {
            windyFocusPickerToggleButton.textContent = windyMapFocusPickerEnabled ? '✦' : '⌖';
            windyFocusPickerToggleButton.title = windyMapFocusPickerEnabled
                ? 'Vypnúť výber fokusu z mapy'
                : 'Zapnúť výber fokusu z mapy';
            windyFocusPickerToggleButton.style.color = windyMapFocusPickerEnabled ? '#70e8ff' : '';
        }

        const mapEmbed = document.getElementById('windy');
        if (mapEmbed) {
            mapEmbed.style.cursor = windyMapFocusPickerEnabled ? 'crosshair' : '';
        }

        const label = document.getElementById('windyMapFocusLabel');
        if (label) {
            if (windyMapFocusPickerEnabled) {
                label.textContent = windyMapPickedFocus
                    ? 'Vybraný fokus: ' + formatWindyFocus(windyMapPickedFocus, windyMapPickedFocus.zoom)
                    : 'Režim výberu fokusu: klikni do mapy.';
            } else {
                label.textContent = windyMapPickedFocus
                    ? 'Vybraný fokus: ' + formatWindyFocus(windyMapPickedFocus, windyMapPickedFocus.zoom)
                    : 'Naviguj na Windy mape...';
            }
        }
    }

    function setWindyMapFocusMarker(api, lat, lon) {
        if (!api?.map || typeof L === 'undefined') return;
        try {
            if (windyMapFocusMarker) {
                api.map.removeLayer(windyMapFocusMarker);
                windyMapFocusMarker = null;
            }
            windyMapFocusMarker = L.marker([lat, lon]).addTo(api.map);
        } catch (_) {
            // ignore marker rendering errors
        }
    }

    function clearWindyMapFocusMarker() {
        if (windyAPI?.map && windyMapFocusMarker) {
            try { windyAPI.map.removeLayer(windyMapFocusMarker); } catch (_) { /* ignore */ }
        }
        windyMapFocusMarker = null;
    }

    function setWindyConnectionStatus(status, message = '') {
        if (!windyConnectionStatusBadge) return;

        const normalized = String(status || 'offline').toLowerCase();
        const textMap = {
            ready: 'Windy: pripojené',
            loading: 'Windy: načítavam',
            offline: 'Windy: offline',
            missing_key: 'Windy: chýba kľúč',
            error: 'Windy: chyba'
        };

        windyConnectionStatusBadge.textContent = textMap[normalized] || ('Windy: ' + normalized);
        windyConnectionStatusBadge.title = String(message || '');

        if (normalized === 'ready') {
            windyConnectionStatusBadge.style.color = '#59d68b';
            windyConnectionStatusBadge.style.borderColor = '#2f9f56';
            return;
        }
        if (normalized === 'loading') {
            windyConnectionStatusBadge.style.color = '#70e8ff';
            windyConnectionStatusBadge.style.borderColor = '#426277';
            return;
        }
        if (normalized === 'missing_key' || normalized === 'error') {
            windyConnectionStatusBadge.style.color = '#ff8a80';
            windyConnectionStatusBadge.style.borderColor = '#c35a5a';
            return;
        }
        windyConnectionStatusBadge.style.color = '#8fa9b8';
        windyConnectionStatusBadge.style.borderColor = '#426277';
    }

    function setWindyMapLoadingMessage(message, options = {}) {
        if (!windyMapLoadingPanel || !windyMapLoadingText) return;

        const text = String(message || '').trim();
        const append = options.append === true;
        const isError = options.error === true;

        windyMapLoadingPanel.hidden = false;
        windyMapLoadingPanel.style.display = 'flex';
        windyMapLoadingText.style.color = isError ? '#ffb6b6' : '#cfe6f3';

        if (!text) return;

        if (append) {
            const previous = String(windyMapLoadingText.textContent || '').trim();
            windyMapLoadingText.textContent = previous ? (previous + '\n' + text) : text;
            window.setTimeout(() => { markWindyReadyFromDom(); }, 350);
            return;
        }

        windyMapLoadingText.textContent = text;
        window.setTimeout(() => { markWindyReadyFromDom(); }, 350);
    }

    function clearWindyMapLoadingMessage() {
        if (!windyMapLoadingPanel || !windyMapLoadingText) return;
        windyMapLoadingText.textContent = '';
        windyMapLoadingPanel.hidden = true;
        windyMapLoadingPanel.style.display = 'none';
    }

    function readWindyUnauthorizedMessage() {
        const root = document.getElementById('windy');
        if (!root) return '';

        const text = String(root.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return '';

        const isUnauthorized = /cannot use windy api|unauthorized domain|statuscode\s*[:=]\s*403|forbidden/i.test(text);
        return isUnauthorized ? text : '';
    }

    function isWindyMapDomReady() {
        const root = document.getElementById('windy');
        if (!root) return false;
        if (root.querySelector('.leaflet-container, .leaflet-pane, canvas, .windy-logo, #logo-wrapper')) {
            return true;
        }
        return false;
    }

    function markWindyReadyFromDom() {
        const unauthorizedMessage = readWindyUnauthorizedMessage();
        if (unauthorizedMessage) {
            if (windyMapInitFailTimer) {
                clearTimeout(windyMapInitFailTimer);
                windyMapInitFailTimer = null;
            }
            if (windyMapInitRetryTimer) {
                clearInterval(windyMapInitRetryTimer);
                windyMapInitRetryTimer = null;
            }

            const currentOrigin = window.location.origin || '(unknown origin)';
            const keyFingerprint = formatWindyMapKeyFingerprint(window.TERMIKA_WINDY_MAP_KEY);
            setWindyConnectionStatus('error', 'Windy API odmietlo doménu: ' + currentOrigin);
            setWindyMapLoadingMessage(
                'Windy API vrátilo 403 (unauthorized domain).\n'
                + 'Aktuálny origin: ' + currentOrigin + '\n'
                + 'Aktívny WINDY_MAP_KEY: ' + keyFingerprint + '\n'
                + 'Vo Windy Map Forecast API whiteliste povoľ tento origin (bez path).',
                { error: true }
            );
            logStatus('Windy API 403 unauthorized domain pre origin: ' + currentOrigin + ' · key ' + keyFingerprint, 'error');
            return false;
        }

        if (!isWindyMapDomReady()) return false;

        if (windyMapInitFailTimer) {
            clearTimeout(windyMapInitFailTimer);
            windyMapInitFailTimer = null;
        }
        if (windyMapInitRetryTimer) {
            clearInterval(windyMapInitRetryTimer);
            windyMapInitRetryTimer = null;
        }

        setWindyConnectionStatus('ready', 'Windy mapa je viditeľná a pripravená.');
        clearWindyMapLoadingMessage();
        return true;
    }

    function ensureWindyLibBootLoaded() {
        if (typeof windyInit === 'function') {
            return Promise.resolve(true);
        }

        if (windyLibBootLoadPromise) {
            return windyLibBootLoadPromise;
        }

        windyLibBootLoadPromise = new Promise((resolve, reject) => {
            const scriptSrc = 'https://api.windy.com/assets/map-forecast/libBoot.js';
            let scriptEl = document.querySelector('script[data-termika-windy-libboot="1"]');
            let settled = false;

            const finish = (ok, error = null) => {
                if (settled) return;
                settled = true;
                windyLibBootLoadPromise = null;
                if (ok) {
                    resolve(true);
                } else {
                    reject(error || new Error('Windy libBoot.js sa nepodarilo načítať.'));
                }
            };

            const checkLoaded = () => {
                if (typeof windyInit === 'function') {
                    finish(true);
                    return true;
                }
                return false;
            };

            if (checkLoaded()) return;

            const onLoad = () => {
                if (!checkLoaded()) {
                    finish(false, new Error('Windy libBoot.js sa síce načítal, ale windyInit nie je dostupný.'));
                }
            };

            const onError = () => {
                finish(false, new Error('Prehliadač zablokoval alebo nenačítal Windy libBoot.js.'));
            };

            if (!scriptEl) {
                scriptEl = document.createElement('script');
                scriptEl.src = scriptSrc;
                scriptEl.async = true;
                scriptEl.dataset.termikaWindyLibboot = '1';
                scriptEl.addEventListener('load', onLoad, { once: true });
                scriptEl.addEventListener('error', onError, { once: true });
                document.head.appendChild(scriptEl);
                return;
            }

            // Existing tag may have already fired load/error before we attached listeners.
            // Force a fresh fetch+execute attempt with a cache buster.
            const retryScript = document.createElement('script');
            retryScript.src = scriptSrc + '?v=' + Date.now();
            retryScript.async = true;
            retryScript.dataset.termikaWindyLibboot = '1';
            retryScript.addEventListener('load', onLoad, { once: true });
            retryScript.addEventListener('error', onError, { once: true });
            document.head.appendChild(retryScript);

            window.setTimeout(() => {
                if (typeof windyInit !== 'function') {
                    finish(false, new Error('Windy libBoot.js sa síce načítava, ale prehliadač ho nespúšťa (možný adblock/CSP).'));
                }
            }, 4500);
        });

        return windyLibBootLoadPromise;
    }

    function refreshWindyMapSize() {
        if (!windyAPI?.map) return;
        window.setTimeout(() => {
            try {
                windyAPI.map.invalidateSize?.(true);
                windyAPI.map.redraw?.();
            } catch (_) {
                // ignore resize refresh errors
            }
        }, 120);
    }

    function scheduleWindyMapInitRetry() {
        if (windyMapInitRetryTimer) return;
        windyMapInitRetryTimer = window.setInterval(() => {
            if (readWindyUnauthorizedMessage()) {
                markWindyReadyFromDom();
                return;
            }
            if (markWindyReadyFromDom()) return;
            if (windyAPI?.map) {
                clearInterval(windyMapInitRetryTimer);
                windyMapInitRetryTimer = null;
                refreshWindyMapSize();
                setWindyConnectionStatus('ready', 'Windy mapa je pripojená.');
                return;
            }
            if (windyMapInitAttempts >= WINDY_MAP_INIT_MAX_ATTEMPTS) {
                clearInterval(windyMapInitRetryTimer);
                windyMapInitRetryTimer = null;
                return;
            }
            if (typeof windyInit === 'function' && !windyMapInitialized && !document.getElementById('windyMapWindow')?.hidden) {
                initWindyMap();
            }
        }, 500);
    }

    function initWindyMap() {
        if (windyAPI?.map) {
            refreshWindyMapSize();
            setWindyConnectionStatus('ready', 'Windy mapa je pripojená.');
            clearWindyMapLoadingMessage();
            return;
        }
        if (windyMapInitialized) return;
        if (windyMapInitAttempts >= WINDY_MAP_INIT_MAX_ATTEMPTS) {
            setWindyConnectionStatus('error', 'Vyčerpaný limit pokusov o pripojenie Windy mapy.');
            setWindyMapLoadingMessage(
                'Pripojenie Windy mapy zlyhalo po ' + WINDY_MAP_INIT_MAX_ATTEMPTS + ' pokusoch.\nSkontroluj doménový whitelist pre WINDY_MAP_KEY.',
                { error: true }
            );
            return;
        }
        if (!window.TERMIKA_WINDY_MAP_KEY) {
            logStatus('Windy Map kľúč nie je nakonfigurovaný.', 'error');
            setWindyConnectionStatus('missing_key', 'Chýba WINDY_MAP_KEY alebo nie je dostupný v konfigurácii.');
            setWindyMapLoadingMessage('Chyba: chýba WINDY_MAP_KEY v konfigurácii.\nOtvor setup.php a doplň WINDY_MAP_KEY.', { error: true });
            return;
        }
        if (typeof windyInit !== 'function') {
            logStatus('Windy libBoot.js sa nepodarilo načítať.', 'error');
            setWindyConnectionStatus('loading', 'Čakám na Windy libBoot.js.');
            setWindyMapLoadingMessage('Načítavam Windy knižnicu libBoot.js...\nZatiaľ nie je dostupná.');
            ensureWindyLibBootLoaded()
                .then(() => {
                    setWindyMapLoadingMessage('Windy knižnica bola načítaná, pokračujem inicializáciou mapy...');
                    initWindyMap();
                })
                .catch((error) => {
                    const reason = error?.message || 'Neznáma chyba načítania Windy knižnice.';
                    setWindyConnectionStatus('error', reason);
                    setWindyMapLoadingMessage('Chyba načítania Windy knižnice:\n' + reason, { error: true });
                    logStatus('Windy libBoot.js load error: ' + reason, 'error');
                    scheduleWindyMapInitRetry();
                });
            return;
        }

        setWindyConnectionStatus('loading', 'Windy mapa sa pripája.');
        windyMapInitAttempts += 1;
        setWindyMapLoadingMessage(
            'Knižnica pripravená. Pripájam Windy mapu...\nPokus ' + windyMapInitAttempts + ' z ' + WINDY_MAP_INIT_MAX_ATTEMPTS + '.',
            { append: false }
        );

        const center = selectedCenter || { lat: 46.43, lon: 11.85 };
        windyMapInitialized = true;

        if (windyMapInitFailTimer) {
            clearTimeout(windyMapInitFailTimer);
        }
        windyMapInitFailTimer = window.setTimeout(() => {
            if (readWindyUnauthorizedMessage()) {
                markWindyReadyFromDom();
                return;
            }
            if (markWindyReadyFromDom()) return;
            if (windyAPI?.map) return;
            windyMapInitialized = false;
            setWindyConnectionStatus('error', 'Windy embed neodpovedal v limite 8 sekúnd.');
            setWindyMapLoadingMessage(
                'Chyba: Windy embed neodpovedal do 8 sekúnd.\nSkontroluj WINDY_MAP_KEY a povolenú doménu pre túto URL.',
                { error: true }
            );
            logStatus('Windy mapa: inicializácia timeout. Skontroluj WINDY_MAP_KEY a povolenú doménu.', 'error');
            if (windyMapInitAttempts < WINDY_MAP_INIT_MAX_ATTEMPTS) {
                scheduleWindyMapInitRetry();
            }
        }, 8000);

        try {
            windyInit({
                key: window.TERMIKA_WINDY_MAP_KEY,
                lat: center.lat,
                lon: center.lon,
                zoom: 9,
            }, function (api) {
            windyAPI = api;
            if (windyMapInitFailTimer) {
                clearTimeout(windyMapInitFailTimer);
                windyMapInitFailTimer = null;
            }
            if (!api?.map) {
                windyMapInitialized = false;
                setWindyConnectionStatus('error', 'Windy callback prišiel bez map inštancie.');
                setWindyMapLoadingMessage('Windy callback prišiel, ale mapa nebola vytvorená.', { error: true });
                if (windyMapInitAttempts < WINDY_MAP_INIT_MAX_ATTEMPTS) {
                    scheduleWindyMapInitRetry();
                }
                return;
            }
            const label = document.getElementById('windyMapFocusLabel');

            if (api?.map?.on) {
                api.map.on('click', function (event) {
                    if (!windyMapFocusPickerEnabled) return;

                    const lat = Number(event?.latlng?.lat ?? event?.lat ?? event?.latitude);
                    const lon = Number(event?.latlng?.lng ?? event?.latlng?.lon ?? event?.lng ?? event?.longitude);
                    const zoom = Number(api.map.getZoom?.());
                    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

                    windyMapPickedFocus = { lat, lon, zoom };
                    if (label) {
                        label.textContent = 'Vybraný fokus: ' + formatWindyFocus(windyMapPickedFocus, zoom);
                    }
                    setWindyMapFocusMarker(api, lat, lon);
                });
            }

            // Priebežne ukazuj súradnice stredu mapy
            api.map.on('move', function () {
                const c = api.map.getCenter();
                if (label) {
                    if (!windyMapFocusPickerEnabled || !windyMapPickedFocus) {
                        label.textContent = c.lat.toFixed(5) + ', ' + c.lng.toFixed(5) + '  (zoom ' + api.map.getZoom() + ')';
                    }
                }
            });

            refreshWindyMapSize();
            scheduleWindyMapInitRetry();
            setWindyMapFocusPickerEnabled(false);
            setWindyConnectionStatus('ready', 'Windy mapa je pripojená.');
            clearWindyMapLoadingMessage();
            logStatus('Windy mapa načítaná.', 'success');
            });
        } catch (error) {
            windyMapInitialized = false;
            if (windyMapInitFailTimer) {
                clearTimeout(windyMapInitFailTimer);
                windyMapInitFailTimer = null;
            }
            const reason = error?.message || String(error);
            setWindyConnectionStatus('error', 'windyInit zlyhal: ' + reason);
            setWindyMapLoadingMessage('windyInit vyhodil chybu:\n' + reason, { error: true });
            logStatus('Windy mapa: windyInit zlyhal: ' + reason, 'error');
            if (windyMapInitAttempts < WINDY_MAP_INIT_MAX_ATTEMPTS) {
                scheduleWindyMapInitRetry();
            }
        }
    }

    // Inicializuj Windy mapu pri prvom otvorení okna
    const windyMapWindowEl = document.getElementById('windyMapWindow');
    if (windyMapWindowEl) {
        const observer = new MutationObserver(() => {
            if (!windyMapWindowEl.hidden) {
                if (markWindyReadyFromDom()) return;
                if (!windyAPI?.map) {
                    windyMapInitAttempts = 0;
                    windyMapInitialized = false;
                }
                setWindyConnectionStatus(windyAPI?.map ? 'ready' : 'loading', windyAPI?.map ? 'Windy mapa je pripojená.' : 'Windy mapa sa otvára.');
                if (!windyAPI?.map) {
                    setWindyMapLoadingMessage('Otváram Windy okno...\nInicializujem mapové spojenie.');
                }
                initWindyMap();
                refreshWindyMapSize();
            }
        });
        observer.observe(windyMapWindowEl, { attributes: true, attributeFilter: ['hidden'] });
    }

    // Tlačidlo "Použiť tento fokus"
    document.getElementById('windyUseFocusButton')?.addEventListener('click', async () => {
        if (!windyAPI) {
            logStatus('Windy mapa ešte nie je načítaná.', 'error');
            setWindyMapLoadingMessage('Mapa ešte nie je pripravená.\nPočkajte na stav "Windy: pripojené".', { error: true });
            return;
        }

        const c = windyMapPickedFocus || windyAPI.map.getCenter();
        const zoom = Number.isFinite(Number(c?.zoom)) ? Number(c.zoom) : Number(windyAPI.map.getZoom());
        const point = {
            lat: Number(Number(c.lat).toFixed(5)),
            lon: Number(Number(c.lon ?? c.lng).toFixed(5))
        };

        // Aktualizuj fokus v TermikaXC
        selectedCenter = point;
        previewCenter = { ...point };
        selectedPoint.position = Cesium.Cartesian3.fromDegrees(point.lon, point.lat);
        syncCenterUi(point);
        setTempFocusPoint(point, 'Windy fokus');

        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(point.lon, point.lat, zoomToAltitudeM(zoom))
        });

        logStatus('Fokus z Windy mapy prenesený: ' + formatCenter(point) + ' (zoom ' + zoom + ').', 'success');

        // Načítaj TEMP pre nový bod
        loadTempOnPointClick(point);

        windyMapPickedFocus = { lat: point.lat, lon: point.lon, zoom };
        setWindyMapFocusPickerEnabled(false);
        clearWindyMapFocusMarker();

        // Pošli aj cez komunikačný kanál
        if (window.TermikaCommunicationTool) {
            try {
                await window.TermikaCommunicationTool.send('windy-focus', {
                    lat: point.lat,
                    lon: point.lon,
                    zoom: zoom,
                    source: 'windy-map-embed',
                    timestampIso: new Date().toISOString()
                });
            } catch (_) { /* non-critical */ }
        }
    });

    document.getElementById('windyFocusPickerToggleButton')?.addEventListener('click', () => {
        setWindyMapFocusPickerEnabled(!windyMapFocusPickerEnabled);
        logStatus(
            windyMapFocusPickerEnabled
                ? 'Windy mapa: režim výberu fokusu je zapnutý.'
                : 'Windy mapa: režim výberu fokusu je vypnutý.',
            'info'
        );
    });

    function zoomToAltitudeM(zoom) {
        // Orientačný prepočet Leaflet zoom → výška kamery Cesium
        return Math.max(500, 40000000 / Math.pow(2, zoom));
    }

    function cleanupRuntimeResources() {
        if (runtimeCleanupDone) return;
        runtimeCleanupDone = true;

        while (communicationDisposers.length) {
            const dispose = communicationDisposers.pop();
            try {
                if (typeof dispose === 'function') dispose();
            } catch (_) {
                // Ignore listener cleanup errors.
            }
        }

        if (sceneInputHandler && typeof sceneInputHandler.destroy === 'function' && !sceneInputHandler.isDestroyed?.()) {
            try {
                sceneInputHandler.destroy();
            } catch (_) {
                // Ignore scene handler cleanup errors.
            }
        }
        sceneInputHandler = null;

        try {
            window.WindyMapAdapterTool?.destroy?.({ silent: true });
        } catch (_) {
            // Ignore adapter cleanup errors.
        }

        try {
            window.WindyMapBridgeBootstrap?.destroy?.();
        } catch (_) {
            // Ignore bridge bootstrap cleanup errors.
        }
    }

    window.addEventListener('beforeunload', cleanupRuntimeResources, { once: true });
    window.addEventListener('pagehide', cleanupRuntimeResources, { once: true });

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

    async function runWindLayer(center, radiusM, geometry, options = {}) {
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
        const generationCfg = options.generationConfigOverride || resolveWindGenerationConfig();
        const skipAutoRecord = options.skipAutoRecord === true;
        const windOverrides = options.windOverrides && typeof options.windOverrides === 'object'
            ? options.windOverrides
            : {};
        refreshWindFpsIndicator();

        const tempProfile = Array.isArray(options.tempProfileOverride)
            ? options.tempProfileOverride
            : null;

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
            preservePrevious: generationCfg.preservePrevious,
            clearMode: generationCfg.clearMode,
            maxVerticalMs: 4.0,
            maxVerticalRatio: 0.35,
            coolingZones: [],
            ...animationCfg,
            ...windOverrides,
            surfaceAltM,
            tempProfile,
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
            ' / vrstiev ' + (Number(windResult?.stats?.activeLayers) || 0) +
            ', režim ' + mode + ', ' + sampled +
            ', generácie: ' + generationCfg.label +
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

        if (!skipAutoRecord) {
            const tempMeta = {
                temp_profile: Array.isArray(tempProfile) ? tempProfile : null,
                temp_source: window.WindUI?.state?.lastTempSource || null
            };

            const rendered = Number(windResult?.stats?.rendered) || 0;
            const seeds = Number(windResult?.stats?.streamlines) || 0;
            const activeLayers = Number(windResult?.stats?.activeLayers) || 0;
            const generationId = Number(windResult?.stats?.generationId) || 0;

            const mapPayload = {
                reason: options.reason || 'terrain-analysis-test',
                generationMode: generationCfg.mode,
                generationId,
                rendered,
                activeLayers,
                focusCenter: center
            };

            const windPayload = {
                reason: options.reason || 'terrain-analysis-test',
                generationMode: generationCfg.mode,
                generationId,
                rendered,
                seeds,
                activeLayers,
                focusCenter: center,
                windSettings: {
                    radiusM,
                    spacingM: Number(windSpacingInput.value),
                    aglM: Number(windAglInput.value),
                    baseSpeedMs: Number(windSpeedInput.value),
                    baseDirDeg: Number(windDirInput.value),
                    preservePrevious: generationCfg.preservePrevious,
                    clearMode: generationCfg.clearMode,
                    colorMode: windColorMode.value,
                    colorTheme: windColorTheme.value,
                    animationEnabled: windAnimate.checked
                },
                tempProfile: Array.isArray(tempProfile) ? tempProfile : null
            };

            await persistGenerationAuto('map', center, mapPayload, tempMeta);
            await persistGenerationAuto('wind', center, windPayload, tempMeta);
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
                clearMode: 'last',
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

        try {
            const tempProfileBeforeCompute = await loadAndLogTempProfileFirst(selectedCenter);
            logInputSnapshot(enabledModules);
            logStatus('Spúšťam moduly: ' + enabledModules.join(', ') + '.');

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

            await runWindLayer(selectedCenter, Number(radiusInput.value), geometry || null, {
                tempProfileOverride: tempProfileBeforeCompute,
                reason: 'preload-temp-before-analysis'
            });
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
        clearGenAutoMapLayer();
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

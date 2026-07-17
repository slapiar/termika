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
$assetVersion = '20260717-02';
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
<?php require __DIR__ . '/../ux/workbench-shell/workspace-navigation/workspace-navigation.terrain.view.php'; ?>

<?php require __DIR__ . '/../ux/workbench-shell/quick-tool-dock/quick-tool-dock.view.php'; ?>

<?php require __DIR__ . '/../ux/terrain-legend/terrain-legend/terrain-legend.view.php'; ?>

<?php require __DIR__ . '/../ux/cell-diagnostics/cell-diagnostics/cell-diagnostics.view.php'; ?>

<?php require __DIR__ . '/../ux/windy-map/windy-map-window/windy-map-window.view.php'; ?>

<?php require __DIR__ . '/../ux/diagnostics-console/debug-console/debug-console.terrain.view.php'; ?>

<?php require __DIR__ . '/../ux/system-status-bar/release-footer/release-footer.view.php'; ?>

<script>
window.TERMIKA_CC_CONFIG = Object.freeze({
    cesiumAccessToken: <?php echo json_encode(CESIUM_ACCESS_TOKEN, JSON_UNESCAPED_SLASHES); ?>
});
</script>
<script src="js/cc-host-context.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
<script src="../infrastructure/window-core/window-manager/window-manager.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
<script src="js/three-d-object-loader.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
<script src="js/terrain-analysis-runtime.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
</body>
</html>

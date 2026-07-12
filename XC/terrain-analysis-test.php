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
$assetVersion = '20260712-01';
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
    <style>
        html,body,#cesiumContainer{width:100%;height:100%;margin:0;overflow:hidden;background:#071018}
        #panel{position:absolute;z-index:10;top:12px;left:12px;width:min(390px,calc(100vw - 24px));padding:12px;background:rgba(7,16,24,.92);color:#eef;font:14px/1.4 system-ui;border:1px solid #426277;border-radius:8px}
        #panel h1{font-size:15px;margin:0 0 8px;color:#70e8ff}
        #panel p{margin:5px 0}
        #panel button{margin:4px 4px 4px 0;padding:7px 10px;cursor:pointer}
        #status{max-height:180px;overflow:auto;white-space:pre-wrap;color:#d7e7ef}
        .ok{color:#8cff9d}.err{color:#ff8585}
    </style>
</head>
<body>
<div id="cesiumContainer"></div>
<section id="panel">
    <h1>TermikaXC v2.6 · geometria terénu</h1>
    <p>Klikni do terénu a potom spusti analýzu.</p>
    <p>Stred: <strong id="centerText">46.43000, 11.85000</strong></p>
    <button id="analyzeButton" type="button">Analyzovať terén</button>
    <button id="clearButton" type="button">Skryť diagnostiku</button>
    <div id="status"></div>
</section>
<script>
    const statusEl = document.getElementById('status');
    const centerText = document.getElementById('centerText');
    let selectedCenter = { lat: 46.43, lon: 11.85 };

    function logStatus(text, type = 'info') {
        const line = document.createElement('div');
        line.className = type === 'success' ? 'ok' : (type === 'error' ? 'err' : '');
        line.textContent = text;
        statusEl.appendChild(line);
        statusEl.scrollTop = statusEl.scrollHeight;
    }
    window.logStatus = logStatus;

    Cesium.Ion.defaultAccessToken = <?php echo json_encode(CESIUM_ACCESS_TOKEN, JSON_UNESCAPED_SLASHES); ?>;
    const viewer = new Cesium.Viewer('cesiumContainer', {
        terrain: Cesium.Terrain.fromWorldTerrain(),
        animation: false,
        timeline: false,
        infoBox: false,
        selectionIndicator: false,
        geocoder: false
    });

    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(selectedCenter.lon, selectedCenter.lat, 9000)
    });

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((event) => {
        const cartesian = viewer.scene.pickPosition(event.position) || viewer.camera.pickEllipsoid(event.position);
        if (!cartesian) return;
        const point = Cesium.Cartographic.fromCartesian(cartesian);
        selectedCenter = {
            lat: Cesium.Math.toDegrees(point.latitude),
            lon: Cesium.Math.toDegrees(point.longitude)
        };
        centerText.textContent = selectedCenter.lat.toFixed(5) + ', ' + selectedCenter.lon.toFixed(5);
        logStatus('Vybraný stred analýzy.');
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    document.getElementById('analyzeButton').addEventListener('click', async () => {
        const button = document.getElementById('analyzeButton');
        button.disabled = true;
        statusEl.replaceChildren();
        logStatus('Odoberám výšky terénu...');
        try {
            const result = await TerrainAnalysis.analyzujOblast(viewer, {
                center: selectedCenter,
                rows: 21,
                cols: 21,
                spacingM: 40
            });
            TerrainAnalysis.zobrazDiagnostiku(viewer, result);
            logStatus(
                'Hotovo: ' + result.summary.cellCount + ' buniek, reliéf ' +
                result.summary.reliefM.toFixed(1) + ' m, priemerný sklon ' +
                result.summary.meanSlopeDeg.toFixed(1) + '°.',
                'success'
            );
        } catch (error) {
            logStatus('Chyba: ' + error.message, 'error');
        } finally {
            button.disabled = false;
        }
    });

    document.getElementById('clearButton').addEventListener('click', () => {
        TerrainAnalysis.skryDiagnostiku(viewer);
        logStatus('Diagnostická vrstva bola skrytá.');
    });
</script>
</body>
</html>

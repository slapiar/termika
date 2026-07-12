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
$assetVersion = '20260712-02';
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
        #panel,#legend{position:absolute;z-index:10;padding:12px;background:rgba(7,16,24,.92);color:#eef;font:14px/1.4 system-ui;border:1px solid #426277;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.3)}
        #panel{top:12px;left:12px;width:min(390px,calc(100vw - 24px))}
        #legend{top:12px;right:12px;width:260px}
        #panel h1,#legend h2{font-size:15px;margin:0 0 8px;color:#70e8ff}
        #panel p{margin:5px 0}
        #panel button{margin:4px 4px 4px 0;padding:7px 10px;cursor:pointer}
        #status{max-height:180px;overflow:auto;white-space:pre-wrap;color:#d7e7ef}
        .ok{color:#8cff9d}.err{color:#ff8585}
        .legend-item{display:grid;grid-template-columns:18px 1fr;gap:9px;align-items:start;margin:8px 0}
        .legend-swatch{width:14px;height:14px;margin-top:2px;border:1px solid rgba(255,255,255,.65);border-radius:50%;box-shadow:0 0 8px rgba(255,255,255,.18)}
        .legend-item strong{display:block;font-size:13px;color:#fff}
        .legend-item span{display:block;font-size:12px;color:#b9cbd5}
        .legend-note{margin:10px 0 0;padding-top:9px;border-top:1px solid #35505f;font-size:11px;color:#8fa9b8}
        .flat{background:#d3d3d3}.slope{background:#ffd700}.ridge{background:#ff0000}.hill{background:#ff4500}.gully{background:#00bfff}.depression{background:#0000ff}.transition{background:#9370db}
        @media (max-width:760px){#legend{top:auto;right:12px;bottom:12px;left:12px;width:auto;max-height:38vh;overflow:auto}#panel{right:12px;width:auto}}
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
<aside id="legend" aria-label="Legenda geometrie terénu">
    <h2>Legenda geometrie</h2>
    <div class="legend-item"><i class="legend-swatch flat"></i><div><strong>Rovina</strong><span>Malý sklon a malý lokálny reliéf.</span></div></div>
    <div class="legend-item"><i class="legend-swatch slope"></i><div><strong>Svah</strong><span>Naklonená plocha bez výraznej hrany alebo žľabu.</span></div></div>
    <div class="legend-item"><i class="legend-swatch ridge"></i><div><strong>Rebro alebo hrana</strong><span>Konvexná línia, z ktorej terén klesá do strán.</span></div></div>
    <div class="legend-item"><i class="legend-swatch hill"></i><div><strong>Vyvýšenina</strong><span>Lokálne vypuklá časť terénu.</span></div></div>
    <div class="legend-item"><i class="legend-swatch gully"></i><div><strong>Žľab alebo zbernica</strong><span>Konkávna línia, do ktorej sa terén zbieha.</span></div></div>
    <div class="legend-item"><i class="legend-swatch depression"></i><div><strong>Depresia</strong><span>Lokálne prehĺbená časť terénu.</span></div></div>
    <div class="legend-item"><i class="legend-swatch transition"></i><div><strong>Prechodový terén</strong><span>Nejednoznačný alebo zmiešaný geometrický tvar.</span></div></div>
    <p class="legend-note">Farby zatiaľ vyjadrujú iba geometriu terénu, nie silu termiky ani pravdepodobnosť hotspotu.</p>
</aside>
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

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
$assetVersion = '20260712-05';
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
    <script src="js/terrain-analysis-core.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <script src="js/terrain-analysis-geometry.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
    <style>
        :root{color-scheme:dark}
        html,body,#cesiumContainer{width:100%;height:100%;margin:0;overflow:hidden;background:#071018}
        #cesiumContainer{cursor:crosshair}
        .floating-window{position:absolute;z-index:20;display:flex;flex-direction:column;min-width:250px;min-height:120px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);background:rgba(7,16,24,.94);color:#eef;font:14px/1.4 system-ui;border:1px solid #426277;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.38);resize:both;overflow:hidden}
        #panel{top:12px;left:12px;width:420px;height:560px}
        #legend{top:12px;right:12px;width:285px;height:500px}
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
        .legend-item strong{display:block;font-size:13px;color:#fff}
        .legend-item span{display:block;font-size:12px;color:#b9cbd5}
        .legend-note{margin:10px 0 0;padding-top:9px;border-top:1px solid #35505f;font-size:11px;color:#8fa9b8}
        .flat{background:#d3d3d3}.slope{background:#ffd700}.ridge{background:#8b0000}.hill{background:#ff4500}.gully{background:#00bfff}.depression{background:#0000ff}.transition{background:#9370db}
        #windowDock{position:absolute;left:50%;bottom:12px;z-index:30;display:flex;gap:7px;transform:translateX(-50%);padding:6px;background:rgba(7,16,24,.88);border:1px solid #426277;border-radius:8px;box-shadow:0 5px 18px rgba(0,0,0,.35)}
        #windowDock button{padding:6px 10px;border:1px solid #54778a;border-radius:5px;background:#10212b;color:#dff7ff;cursor:pointer}
        #windowDock button:hover{background:#1c3b4b}
        #aimHint{position:absolute;left:50%;top:12px;z-index:12;transform:translateX(-50%);padding:6px 10px;background:rgba(7,16,24,.78);color:#d8f8ff;border:1px solid #426277;border-radius:6px;font:12px/1.2 system-ui;pointer-events:none}
        @media (max-width:760px){#panel{width:calc(100vw - 24px);height:55vh}#legend{top:auto;right:12px;bottom:58px;left:12px;width:auto;height:34vh}.floating-window{max-width:calc(100vw - 24px)}#windowDock{bottom:6px}}
    </style>
</head>
<body>
<div id="cesiumContainer"></div>
<div id="aimHint">Pohybom kurzora vyber oblasť · kliknutím nastav stred</div>

<section id="panel" class="floating-window" data-window-name="Ovládanie">
    <header class="window-header">
        <div class="window-title">TermikaXC v2.6 · modulárna analýza terénu</div>
        <div class="window-actions"><button class="window-action close-window" type="button" title="Zavrieť okno">×</button></div>
    </header>
    <div class="window-body">
        <p>Kruhový zameriavač ukazuje oblasť prvotného pohľadu. Kliknutím zvolíš jej stred.</p>
        <p>Stred: <strong id="centerText">46.43000, 11.85000</strong></p>

        <fieldset>
            <legend>Rozsah analýzy</legend>
            <label>Polomer kruhu <input id="radiusInput" type="number" min="40" max="20000" step="40" value="400"> m</label>
            <label>Rozostup vzoriek <input id="spacingInput" type="number" min="5" max="1000" step="5" value="40"> m</label>
        </fieldset>

        <fieldset>
            <legend>Analytické vrstvy</legend>
            <label><input class="module-toggle" type="checkbox" value="geometry" checked> Geometria reliéfu</label>
            <label class="future"><input type="checkbox" disabled> Doliny a žľaby – pripravujeme</label>
            <label class="future"><input type="checkbox" disabled> Hydrológia – pripravujeme</label>
            <label class="future"><input type="checkbox" disabled> Povrchový kryt – pripravujeme</label>
            <label class="future"><input type="checkbox" disabled> Geológia – pripravujeme</label>
            <label class="future"><input type="checkbox" disabled> Oslnenie – pripravujeme</label>
        </fieldset>

        <button id="analyzeButton" type="button">Spustiť vybrané analýzy</button>
        <button id="clearButton" type="button">Skryť diagnostiku</button>
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
        <p class="legend-note">Farby zatiaľ vyjadrujú iba geometriu terénu. Zobrazené sú iba bunky vo vnútri prvotného kruhového pohľadu.</p>
    </div>
</aside>

<nav id="windowDock" aria-label="Ovládanie okien">
    <button type="button" data-show-window="panel">Ovládanie</button>
    <button type="button" data-show-window="legend">Legenda</button>
</nav>

<script>
    const statusEl = document.getElementById('status');
    const centerText = document.getElementById('centerText');
    const radiusInput = document.getElementById('radiusInput');
    let selectedCenter = { lat: 46.43, lon: 11.85 };
    let previewCenter = { ...selectedCenter };
    let highestWindowZ = 20;

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
        const point = pickTerrainPosition(event.position);
        if (!point) return;
        selectedCenter = point;
        previewCenter = { ...point };
        selectedPoint.position = Cesium.Cartesian3.fromDegrees(point.lon, point.lat);
        centerText.textContent = point.lat.toFixed(5) + ', ' + point.lon.toFixed(5);
        logStatus('Vybraný nový stred kruhovej analýzy.');
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    document.getElementById('analyzeButton').addEventListener('click', async () => {
        const button = document.getElementById('analyzeButton');
        const enabledModules = Array.from(document.querySelectorAll('.module-toggle:checked'))
            .map((input) => input.value);

        button.disabled = true;
        statusEl.replaceChildren();
        logStatus('Spúšťam moduly: ' + enabledModules.join(', ') + '.');

        try {
            const result = await TerrainAnalysisCore.analyze(viewer, {
                center: selectedCenter,
                radiusM: Number(radiusInput.value),
                spacingM: Number(document.getElementById('spacingInput').value),
                enabledModules
            });

            const geometry = result.layers.geometry;
            TerrainAnalysis.zobrazDiagnostiku(viewer, geometry);

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

    function keepWindowInViewport(windowEl) {
        const rect = windowEl.getBoundingClientRect();
        const maxLeft = Math.max(0, window.innerWidth - Math.min(rect.width, window.innerWidth));
        const maxTop = Math.max(0, window.innerHeight - 42);
        windowEl.style.left = Math.min(Math.max(0, rect.left), maxLeft) + 'px';
        windowEl.style.top = Math.min(Math.max(0, rect.top), maxTop) + 'px';
        windowEl.style.right = 'auto';
        windowEl.style.bottom = 'auto';
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

        windowEl.querySelector('.close-window').addEventListener('click', () => {
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
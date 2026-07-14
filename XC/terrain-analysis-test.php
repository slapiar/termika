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
    <script src="js/wind-field.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>
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
            <label><input id="contoursVisible" type="checkbox" checked> Zobraziť tmavošedé vrstevnice</label>
        </fieldset>

        <fieldset>
            <legend>WIND vrstva (MVP)</legend>
            <label><input id="windEnabled" type="checkbox"> Zobraziť veterné prúdnice</label>
            <label>Výška nad terénom <input id="windAglInput" type="number" min="20" max="5000" step="10" value="300"> m AGL</label>
            <label>Rozostup vetra <input id="windSpacingInput" type="number" min="30" max="1200" step="10" value="120"> m</label>
            <label>Základná rýchlosť <input id="windSpeedInput" type="number" min="0" max="40" step="0.1" value="4.5"> m/s</label>
            <label>Smer toku <input id="windDirInput" type="number" min="0" max="359" step="1" value="230"> °</label>
            <label><input id="windUseTempProfile" type="checkbox" checked> Použiť vietor z TEMP profilu (ak je dostupný)</label>
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
    const radiusInput = document.getElementById('radiusInput');
    const contoursVisible = document.getElementById('contoursVisible');
    const windEnabled = document.getElementById('windEnabled');
    const windAglInput = document.getElementById('windAglInput');
    const windSpacingInput = document.getElementById('windSpacingInput');
    const windSpeedInput = document.getElementById('windSpeedInput');
    const windDirInput = document.getElementById('windDirInput');
    const windUseTempProfile = document.getElementById('windUseTempProfile');
    const cellDiagnostics = document.getElementById('cellDiagnostics');
    const cellDiagnosticsBody = document.getElementById('cellDiagnosticsBody');
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

    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(selectedCenter.lon, selectedCenter.lat, 9000)
    });

    if (window.WindUI) {
        window.WindUI.init({
            aglM: Number(windAglInput.value),
            spacingM: Number(windSpacingInput.value),
            baseSpeedMs: Number(windSpeedInput.value),
            baseDirDeg: Number(windDirInput.value),
            useTempProfileWind: windUseTempProfile.checked,
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
        centerText.textContent = point.lat.toFixed(5) + ', ' + point.lon.toFixed(5);
        logStatus('Vybraný nový stred kruhovej analýzy.');
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

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

    async function runWindLayer(center, radiusM) {
        if (!window.WindUI || !window.WindRender || !window.WindField) {
            throw new Error('WIND moduly nie sú načítané.');
        }

        if (!windEnabled.checked) {
            window.WindUI?.clear?.(viewer);
            return;
        }

        const surfaceAltM = await resolveSurfaceAltitudeM(center);
        const windResult = await window.WindUI.runDemo(viewer, center, {
            aglM: Number(windAglInput.value),
            radiusM,
            spacingM: Number(windSpacingInput.value),
            baseSpeedMs: Number(windSpeedInput.value),
            baseDirDeg: Number(windDirInput.value),
            useTempProfileWind: windUseTempProfile.checked,
            surfaceAltM,
            seedEvery: 3,
            maxSteps: 42,
            stepMeters: 90
        });

        const weather = windResult.field.weatherTracking || {};
        const mode = weather.mode || 'FALLBACK_BASE_VECTOR';
        const sampled = Number.isFinite(Number(weather.sampledLevelZ_m))
            ? 'z=' + Number(weather.sampledLevelZ_m).toFixed(0) + ' m'
            : 'bez validnej hladiny';

        logStatus(
            'WIND: vykreslených prúdnic ' + windResult.stats.rendered +
            ' / seedov ' + windResult.stats.streamlines +
            ', režim ' + mode + ', ' + sampled + '.',
            'success'
        );
    }

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
            if (geometry) TerrainAnalysis.zobrazDiagnostiku(viewer, geometry);

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

            await runWindLayer(selectedCenter, Number(radiusInput.value));
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

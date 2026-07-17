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
$assetVersion = '20260717-01';

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
$jsFiles = array_values(array_unique(array_filter(
    $jsFiles,
    static fn(string $file): bool => $file !== 'terrain-analysis-runtime.js' && $file !== 'cc-host-context.js'
)));

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
    <script src="ux/igc-parser.js?v=<?php echo rawurlencode($assetVersion); ?>"></script>

<?php foreach ($jsFiles as $jsFile): ?>
    <script src="js/<?php echo rawurlencode($jsFile); ?>?v=<?php echo rawurlencode($assetVersion); ?>"></script>
<?php endforeach; ?>
</head>
<body>
    <div id="appShell">
        <?php require __DIR__ . '/../ux/pilot-physiology-panel/pilot-physiology-panel/pilot-physiology-panel.view.php'; ?>

        <main id="mapPanel" class="map-panel">
            <div class="map-toolbar">
                <div class="map-title-group">
                    <h1>TermikaXC</h1>
                    <p>3D Tactical Flight Control</p>
                </div>
            </div>
            <div id="cesiumContainer"></div>
        </main>

        <?php require __DIR__ . '/../ux/flight-meteo-panel/flight-meteo-panel/flight-meteo-panel.view.php'; ?>
        <?php require __DIR__ . '/../ux/skewt-instrument/skewt-panel/skewt-panel.view.php'; ?>
        <?php require __DIR__ . '/../ux/flight-playback/flight-playback/flight-playback-controls.view.php'; ?>
        <?php require __DIR__ . '/../ux/wind-video/wind-cache-preview/wind-cache-preview.view.php'; ?>
        <?php require __DIR__ . '/../ux/diagnostics-console/debug-console/debug-console.index.view.php'; ?>
    </div>
</body>
</html>

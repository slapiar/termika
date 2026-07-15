<?php
declare(strict_types=1);

ob_start();
require __DIR__ . '/terrain-analysis-test.php';
$html = (string)ob_get_clean();

$headAssets = '';
if (stripos($html, 'asset/workspace-cesium-toolbar-offset.css') === false) {
    $headAssets .= '    <link rel="stylesheet" href="asset/workspace-cesium-toolbar-offset.css?v=20260715-02" data-workspace-cesium-toolbar-offset="true">' . "\n";
}
if (stripos($html, 'asset/workspace-flight-simulator.css') === false) {
    $headAssets .= '    <link rel="stylesheet" href="asset/workspace-flight-simulator.css?v=20260715-02" data-workspace-flight-simulator="true">' . "\n";
}

if ($headAssets !== '') {
    $headEnd = stripos($html, '</head>');
    if ($headEnd !== false) {
        $html = substr_replace($html, $headAssets, $headEnd, 0);
    }
}

$bodyScripts = '';
if (stripos($html, 'js/workspace-cesium-toolbar-offset.js') === false) {
    $bodyScripts .= '    <script src="js/workspace-cesium-toolbar-offset.js?v=20260715-02" data-workspace-cesium-toolbar-offset="true"></script>' . "\n";
}
if (stripos($html, 'js/terrain-camera-hud-coordinates.js') === false) {
    $bodyScripts .= '    <script src="js/terrain-camera-hud-coordinates.js?v=20260715-01" data-terrain-camera-hud-coordinates="true"></script>' . "\n";
}
if (stripos($html, 'js/flight-simulator.js') === false) {
    $bodyScripts .= '    <script src="js/flight-simulator.js?v=20260715-02" data-flight-simulator="true"></script>' . "\n";
}
if (stripos($html, 'js/workspace-flight-toggle.js') === false) {
    $bodyScripts .= '    <script src="js/workspace-flight-toggle.js?v=20260715-02" data-workspace-flight-toggle="true"></script>' . "\n";
}
if (stripos($html, 'js/explorer-analysis-bridge.js') === false) {
    $bodyScripts .= '    <script src="js/explorer-analysis-bridge.js?v=20260715-02" data-explorer-analysis-bridge="true"></script>' . "\n";
}
if (stripos($html, 'js/explorer-analysis-arrival.js') === false) {
    $bodyScripts .= '    <script src="js/explorer-analysis-arrival.js?v=20260715-01" data-explorer-analysis-arrival="true"></script>' . "\n";
}

if ($bodyScripts !== '') {
    $bodyEnd = stripos($html, '</body>');
    if ($bodyEnd !== false) {
        $html = substr_replace($html, $bodyScripts, $bodyEnd, 0);
    }
}

echo $html;

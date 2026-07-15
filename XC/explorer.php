<?php
declare(strict_types=1);

ob_start();
require __DIR__ . '/explorer-core.php';
$html = (string)ob_get_clean();

$headAssets = '';
if (stripos($html, 'asset/explorer.css') === false) {
    $headAssets .= '    <link rel="stylesheet" href="asset/explorer.css?v=20260715-02">' . "\n";
}
if (stripos($html, 'asset/explorer-nav.css') === false) {
    $headAssets .= '    <link rel="stylesheet" href="asset/explorer-nav.css?v=20260715-01">' . "\n";
}
if (stripos($html, 'asset/explorer-theme.css') === false) {
    $headAssets .= '    <link rel="stylesheet" href="asset/explorer-theme.css?v=20260715-01">' . "\n";
}
if (stripos($html, 'asset/explorer-theme-runtime.css') === false) {
    $headAssets .= '    <link rel="stylesheet" href="asset/explorer-theme-runtime.css?v=20260715-01">' . "\n";
}
if (stripos($html, 'asset/explorer-import.css') === false) {
    $headAssets .= '    <link rel="stylesheet" href="asset/explorer-import.css?v=20260715-01">' . "\n";
}
if (stripos($html, 'asset/explorer-profile.css') === false) {
    $headAssets .= '    <link rel="stylesheet" href="asset/explorer-profile.css?v=20260715-01">' . "\n";
}
if (stripos($html, 'asset/explorer-profile-dock.css') === false) {
    $headAssets .= '    <link rel="stylesheet" href="asset/explorer-profile-dock.css?v=20260715-01">' . "\n";
}
if (stripos($html, 'asset/explorer-profile-follow.css') === false) {
    $headAssets .= '    <link rel="stylesheet" href="asset/explorer-profile-follow.css?v=20260715-01">' . "\n";
}
if (stripos($html, 'asset/workspace-polish.css') === false) {
    $headAssets .= '    <link rel="stylesheet" href="asset/workspace-polish.css?v=20260715-02">' . "\n";
}
if (stripos($html, 'asset/workspace-flight-simulator.css') === false) {
    $headAssets .= '    <link rel="stylesheet" href="asset/workspace-flight-simulator.css?v=20260715-02">' . "\n";
}

if ($headAssets !== '') {
    $headEnd = stripos($html, '</head>');
    if ($headEnd !== false) {
        $html = substr_replace($html, $headAssets, $headEnd, 0);
    }
}

$bodyScripts = '';
if (stripos($html, 'js/explorer-nav.js') === false) {
    $bodyScripts .= '    <script src="js/explorer-nav.js?v=20260715-02"></script>' . "\n";
}
if (stripos($html, 'js/explorer-theme.js') === false) {
    $bodyScripts .= '    <script src="js/explorer-theme.js?v=20260715-01"></script>' . "\n";
}
if (stripos($html, 'js/explorer-import.js') === false) {
    $bodyScripts .= '    <script src="js/explorer-import.js?v=20260715-01"></script>' . "\n";
}
if (stripos($html, 'js/explorer-profile.js') === false) {
    $bodyScripts .= '    <script src="js/explorer-profile.js?v=20260715-01"></script>' . "\n";
}
if (stripos($html, 'js/explorer-profile-dock.js') === false) {
    $bodyScripts .= '    <script src="js/explorer-profile-dock.js?v=20260715-01"></script>' . "\n";
}
if (stripos($html, 'js/explorer-profile-follow.js') === false) {
    $bodyScripts .= '    <script src="js/explorer-profile-follow.js?v=20260715-01"></script>' . "\n";
}
if (stripos($html, 'js/workspace-crosshair.js') === false) {
    $bodyScripts .= '    <script src="js/workspace-crosshair.js?v=20260715-01"></script>' . "\n";
}
if (stripos($html, 'js/workspace-hud-toggle.js') === false) {
    $bodyScripts .= '    <script src="js/workspace-hud-toggle.js?v=20260715-01"></script>' . "\n";
}
if (stripos($html, 'js/terrain-camera-hud-coordinates.js') === false) {
    $bodyScripts .= '    <script src="js/terrain-camera-hud-coordinates.js?v=20260715-01"></script>' . "\n";
}
if (stripos($html, 'js/flight-simulator.js') === false) {
    $bodyScripts .= '    <script src="js/flight-simulator.js?v=20260715-03"></script>' . "\n";
}
if (stripos($html, 'js/workspace-flight-toggle.js') === false) {
    $bodyScripts .= '    <script src="js/workspace-flight-toggle.js?v=20260715-02"></script>' . "\n";
}
if (stripos($html, 'js/flight-emergency-disengage.js') === false) {
    $bodyScripts .= '    <script src="js/flight-emergency-disengage.js?v=20260715-01"></script>' . "\n";
}
if (stripos($html, 'js/explorer-analysis-bridge.js') === false) {
    $bodyScripts .= '    <script src="js/explorer-analysis-bridge.js?v=20260715-02"></script>' . "\n";
}

if ($bodyScripts !== '') {
    $bodyEnd = stripos($html, '</body>');
    if ($bodyEnd !== false) {
        $html = substr_replace($html, $bodyScripts, $bodyEnd, 0);
    }
}

echo $html;

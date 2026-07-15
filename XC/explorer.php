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

if ($headAssets !== '') {
    $headEnd = stripos($html, '</head>');
    if ($headEnd !== false) {
        $html = substr_replace($html, $headAssets, $headEnd, 0);
    }
}

$bodyScripts = '';
if (stripos($html, 'js/explorer-nav.js') === false) {
    $bodyScripts .= '    <script src="js/explorer-nav.js?v=20260715-01"></script>' . "\n";
}
if (stripos($html, 'js/explorer-theme.js') === false) {
    $bodyScripts .= '    <script src="js/explorer-theme.js?v=20260715-01"></script>' . "\n";
}
if (stripos($html, 'js/explorer-import.js') === false) {
    $bodyScripts .= '    <script src="js/explorer-import.js?v=20260715-01"></script>' . "\n";
}

if ($bodyScripts !== '') {
    $bodyEnd = stripos($html, '</body>');
    if ($bodyEnd !== false) {
        $html = substr_replace($html, $bodyScripts, $bodyEnd, 0);
    }
}

echo $html;

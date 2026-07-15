<?php
declare(strict_types=1);

ob_start();
require __DIR__ . '/explorer-core.php';
$html = (string)ob_get_clean();

if (stripos($html, 'asset/explorer.css') === false) {
    $stylesheet = '    <link rel="stylesheet" href="asset/explorer.css?v=20260715-02">' . "\n";
    $headEnd = stripos($html, '</head>');

    if ($headEnd !== false) {
        $html = substr_replace($html, $stylesheet, $headEnd, 0);
    }
}

echo $html;

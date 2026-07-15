<?php
declare(strict_types=1);

ob_start();
require __DIR__ . '/terrain-analysis-test.php';
$html = (string)ob_get_clean();

if (stripos($html, 'js/explorer-analysis-bridge.js') === false) {
    $script = '    <script src="js/explorer-analysis-bridge.js?v=20260715-02"></script>' . "\n";
    $bodyEnd = stripos($html, '</body>');
    if ($bodyEnd !== false) {
        $html = substr_replace($html, $script, $bodyEnd, 0);
    }
}

echo $html;

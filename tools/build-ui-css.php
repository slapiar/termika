<?php
declare(strict_types=1);

/**
 * TermikaXC UI bundle builder.
 *
 * Usage:
 *   php tools/build-ui-css.php
 *   php tools/build-ui-css.php workbench
 */

$root = dirname(__DIR__);
$uiRoot = $root . '/XC/asset/ui';
$requestedFamily = $argv[1] ?? 'workbench';

$families = [
    'workbench' => [
        'version' => '1.0.0',
        'sources' => [
            'foundations/tokens.css',
            'foundations/typography-focus.css',
            'components/controls.css',
            'components/window-base.css',
            'families/workbench.css',
        ],
        'output' => 'bundles/workbench.bundle.css',
    ],
];

if (!isset($families[$requestedFamily])) {
    fwrite(STDERR, "Neznáma UI rodina: {$requestedFamily}\n");
    exit(2);
}

$config = $families[$requestedFamily];
$parts = [];

foreach ($config['sources'] as $relativePath) {
    $absolutePath = $uiRoot . '/' . $relativePath;
    if (!is_file($absolutePath)) {
        fwrite(STDERR, "Chýba zdrojový CSS súbor: {$absolutePath}\n");
        exit(3);
    }

    $content = file_get_contents($absolutePath);
    if ($content === false) {
        fwrite(STDERR, "CSS súbor sa nepodarilo načítať: {$absolutePath}\n");
        exit(4);
    }

    $parts[] = "/* source: {$relativePath} */\n" . trim($content) . "\n";
}

$generatedAt = gmdate('Y-m-d\TH:i:s\Z');
$header = "/* TermikaXC UI – generated {$requestedFamily} bundle {$config['version']} | {$generatedAt} */\n";
$layerOrder = "@layer tx-lock, tx-reset, tx-foundations, tx-components, tx-family, tx-page, tx-windows, tx-utilities;\n\n";
$bundle = $header . $layerOrder . implode("\n", $parts);

$openBraces = substr_count($bundle, '{');
$closeBraces = substr_count($bundle, '}');
if ($openBraces !== $closeBraces) {
    fwrite(STDERR, "Neplatný výsledok: počet { ({$openBraces}) sa nerovná počtu } ({$closeBraces}).\n");
    exit(5);
}

$outputPath = $uiRoot . '/' . $config['output'];
$outputDirectory = dirname($outputPath);
if (!is_dir($outputDirectory) && !mkdir($outputDirectory, 0775, true) && !is_dir($outputDirectory)) {
    fwrite(STDERR, "Nepodarilo sa vytvoriť adresár: {$outputDirectory}\n");
    exit(6);
}

if (file_put_contents($outputPath, $bundle) === false) {
    fwrite(STDERR, "Nepodarilo sa zapísať bundle: {$outputPath}\n");
    exit(7);
}

$relativeOutput = str_replace($root . '/', '', $outputPath);
$size = filesize($outputPath);
$hash = hash_file('sha256', $outputPath);

fwrite(STDOUT, "Vytvorený {$relativeOutput}\n");
fwrite(STDOUT, "Veľkosť: {$size} B\n");
fwrite(STDOUT, "SHA-256: {$hash}\n");

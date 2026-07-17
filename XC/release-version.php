<?php
declare(strict_types=1);

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$releasePath = __DIR__ . '/asset/RELEASE_VERSION.txt';
if (!is_readable($releasePath)) {
    http_response_code(404);
    exit('RELEASE_VERSION_NOT_FOUND');
}

$release = trim((string) file_get_contents($releasePath));
if (!preg_match('/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/', $release)) {
    http_response_code(500);
    exit('INVALID_RELEASE_VERSION');
}

echo $release;

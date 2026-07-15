<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

function respond(int $statusCode, array $payload): void {
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function sanitize_kind(string $kind): ?string {
    $normalized = strtolower(trim($kind));
    if ($normalized === "map" || $normalized === "wind") return $normalized;
    return null;
}

function safe_float($value): ?float {
    if ($value === null || $value === "") return null;
    if (!is_numeric($value)) return null;
    $number = (float) $value;
    return is_finite($number) ? $number : null;
}

function ensure_dir(string $path): void {
    if (is_dir($path)) return;
    if (!@mkdir($path, 0775, true) && !is_dir($path)) {
        respond(500, ["status" => "error", "message" => "Nepodarilo sa vytvoriť adresár: " . basename($path)]);
    }
}

function load_payload(): array {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        respond(200, ["status" => "success", "message" => "OK"]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(405, ["status" => "error", "message" => "Povolená je iba metóda POST."]);
    }

    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        respond(400, ["status" => "error", "message" => "Prázdna požiadavka."]);
    }

    try {
        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        respond(400, ["status" => "error", "message" => "Neplatný JSON."]);
    }

    if (!is_array($data)) {
        respond(400, ["status" => "error", "message" => "Neplatný payload."]);
    }

    return $data;
}

function resolve_webm_path(string $root, string $kind, string $jsonFile): ?string {
    $kind = sanitize_kind($kind);
    if ($kind !== 'wind') return null;

    $baseName = basename($jsonFile, '.json');
    if ($baseName === '' || $baseName === basename($jsonFile)) return null;

    $path = $root . '/' . $kind . '/' . $baseName . '.webm';
    if (!is_file($path)) return null;
    return $path;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = isset($_GET['action']) ? (string)$_GET['action'] : '';
    if ($action === 'getWebm') {
        $kind = isset($_GET['kind']) ? (string)$_GET['kind'] : 'wind';
        $jsonFile = isset($_GET['json_file']) ? (string)$_GET['json_file'] : '';
        $root = dirname(__DIR__) . '/GENauto';
        $path = resolve_webm_path($root, $kind, $jsonFile);
        if ($path === null) {
            respond(404, ["status" => "error", "message" => "WebM cache nebola nájdená."]);
        }

        header('Content-Type: video/webm');
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: no-store, max-age=0');
        readfile($path);
        exit;
    }

    respond(400, ["status" => "error", "message" => "Neznáma GET akcia."]);
}

function generation_filename(string $kind, float $lat, float $lon, string $timestamp): string {
    $latTag = str_replace(['+', '-'], ['p', 'm'], sprintf('%.5f', $lat));
    $lonTag = str_replace(['+', '-'], ['p', 'm'], sprintf('%.5f', $lon));
    $latTag = str_replace('.', '_', $latTag);
    $lonTag = str_replace('.', '_', $lonTag);
    return $timestamp . '__' . $kind . '__lat' . $latTag . '__lon' . $lonTag . '.json';
}

function today_prefix(): string {
    return gmdate('Y-m-d');
}

function list_files_for_kind_today(string $root, string $kind): array {
    $dir = $root . '/' . $kind;
    if (!is_dir($dir)) return [];

    $prefix = today_prefix() . 'T';
    $entries = @scandir($dir);
    if (!is_array($entries)) return [];

    $files = [];
    foreach ($entries as $entry) {
        if ($entry === '.' || $entry === '..') continue;
        if (strpos($entry, $prefix) !== 0) continue;
        if (substr($entry, -5) !== '.json') continue;
        $path = $dir . '/' . $entry;
        if (!is_file($path)) continue;
        $files[] = $path;
    }

    sort($files, SORT_STRING);
    return $files;
}

function list_records_for_kind_today(string $root, string $kind, int $limit): array {
    $files = list_files_for_kind_today($root, $kind);
    if (count($files) > $limit) {
        $files = array_slice($files, -$limit);
    }

    $records = [];
    foreach ($files as $path) {
        $raw = @file_get_contents($path);
        if ($raw === false) continue;
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) continue;

        $baseName = basename($path, '.json');
        $webmFile = 'GENauto/' . $kind . '/' . $baseName . '.webm';

        $records[] = [
            'file' => 'GENauto/' . $kind . '/' . basename($path),
            'generated_at_utc' => (string)($decoded['generated_at_utc'] ?? ''),
            'center' => is_array($decoded['center'] ?? null) ? $decoded['center'] : null,
            'payload' => is_array($decoded['payload'] ?? null) ? $decoded['payload'] : null,
            'webm_file' => $webmFile,
            'webm_exists' => is_file($root . '/' . $kind . '/' . $baseName . '.webm')
        ];
    }

    return $records;
}

$payload = load_payload();
$action = isset($payload['action']) ? (string)$payload['action'] : '';

$root = dirname(__DIR__) . '/GENauto';
ensure_dir($root);
ensure_dir($root . '/map');
ensure_dir($root . '/wind');

if ($action === 'saveGeneration') {
    $kindRaw = isset($payload['kind']) ? (string)$payload['kind'] : '';
    $kind = sanitize_kind($kindRaw);
    if ($kind === null) {
        respond(400, ["status" => "error", "message" => "Neplatný typ generácie. Očakáva sa map alebo wind."]);
    }

    $center = isset($payload['center']) && is_array($payload['center']) ? $payload['center'] : [];
    $lat = safe_float($center['lat'] ?? null);
    $lon = safe_float($center['lon'] ?? null);
    if ($lat === null || $lon === null) {
        respond(400, ["status" => "error", "message" => "Chýbajú alebo sú neplatné súradnice stredu."]);
    }

    $timestamp = gmdate('Y-m-d\\TH-i-s\\Z');
    $filename = generation_filename($kind, $lat, $lon, $timestamp);
    $filePath = $root . '/' . $kind . '/' . $filename;

    $record = [
        'version' => '1.0',
        'kind' => $kind,
        'generated_at_utc' => gmdate('c'),
        'center' => [
            'lat' => $lat,
            'lon' => $lon
        ],
        'payload' => isset($payload['payload']) ? $payload['payload'] : null
    ];

    $encoded = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        respond(500, ["status" => "error", "message" => "Nepodarilo sa serializovať generáciu."]);
    }

    $ok = @file_put_contents($filePath, $encoded, LOCK_EX);
    if ($ok === false) {
        respond(500, ["status" => "error", "message" => "Nepodarilo sa uložiť generáciu do súboru."]);
    }

    respond(200, [
        "status" => "success",
        "message" => "Generácia bola uložená.",
        "file" => 'GENauto/' . $kind . '/' . $filename,
        "webm_file" => $kind === 'wind' ? ('GENauto/' . $kind . '/' . basename($filename, '.json') . '.webm') : null
    ]);
}

if ($action === 'saveWebm') {
    $kindRaw = isset($payload['kind']) ? (string)$payload['kind'] : 'wind';
    $kind = sanitize_kind($kindRaw);
    if ($kind !== 'wind') {
        respond(400, ["status" => "error", "message" => "WebM cache sa ukladá iba pre wind generácie."]);
    }

    $jsonFile = isset($payload['json_file']) ? (string)$payload['json_file'] : '';
    $baseName = basename($jsonFile, '.json');
    if ($baseName === '' || $baseName === basename($jsonFile)) {
        respond(400, ["status" => "error", "message" => "Neplatný názov JSON súboru."]);
    }

    $base64 = isset($payload['webm_base64']) ? (string)$payload['webm_base64'] : '';
    if (trim($base64) === '') {
        respond(400, ["status" => "error", "message" => "Chýba base64 obsah WebM."]);
    }

    $binary = base64_decode($base64, true);
    if ($binary === false || $binary === '') {
        respond(400, ["status" => "error", "message" => "Nepodarilo sa dekódovať WebM obsah."]);
    }

    $filePath = $root . '/wind/' . $baseName . '.webm';
    $bytes = @file_put_contents($filePath, $binary, LOCK_EX);
    if ($bytes === false) {
        respond(500, ["status" => "error", "message" => "Nepodarilo sa uložiť WebM cache."]);
    }

    respond(200, [
        "status" => "success",
        "message" => "WebM cache bola uložená.",
        "file" => 'GENauto/wind/' . $baseName . '.webm'
    ]);
}

if ($action === 'listWindToday') {
    $limitRaw = isset($payload['limit']) ? (int)$payload['limit'] : 200;
    $limit = max(1, min(1000, $limitRaw));

    $records = list_records_for_kind_today($root, 'wind', $limit);

    respond(200, [
        "status" => "success",
        "records" => $records,
        "count" => count($records)
    ]);
}

if ($action === 'listMapToday') {
    $limitRaw = isset($payload['limit']) ? (int)$payload['limit'] : 500;
    $limit = max(1, min(2000, $limitRaw));

    $records = list_records_for_kind_today($root, 'map', $limit);

    respond(200, [
        "status" => "success",
        "records" => $records,
        "count" => count($records)
    ]);
}

if ($action === 'clearToday') {
    $kindsRaw = isset($payload['kinds']) && is_array($payload['kinds']) ? $payload['kinds'] : ['map', 'wind'];
    $kinds = [];
    foreach ($kindsRaw as $kindValue) {
        $kind = sanitize_kind((string)$kindValue);
        if ($kind !== null) $kinds[$kind] = true;
    }
    if (!$kinds) {
        $kinds = ['map' => true, 'wind' => true];
    }

    $deleted = ['map' => 0, 'wind' => 0];
    foreach (array_keys($kinds) as $kind) {
        $files = list_files_for_kind_today($root, $kind);
        foreach ($files as $path) {
            if (@unlink($path)) {
                $deleted[$kind] += 1;
            }
            if ($kind === 'wind') {
                $webmPath = preg_replace('/\.json$/', '.webm', $path);
                if (is_string($webmPath) && is_file($webmPath)) {
                    @unlink($webmPath);
                }
            }
        }
    }

    respond(200, [
        "status" => "success",
        "message" => "Dnešné generácie boli vymazané.",
        "deleted" => $deleted
    ]);
}

respond(400, ["status" => "error", "message" => "Neznáma akcia."]);

<?php
// Súbor: update.php (Nahrať do public_html/termika/)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once __DIR__ . '/asset/config.php';

function respond(int $statusCode, array $payload): void {
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function getHeaderValue(string $name): ?string {
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    if (!empty($_SERVER[$key])) return (string) $_SERVER[$key];
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $headerName => $headerValue) {
            if (strcasecmp($headerName, $name) === 0) {
                return (string) $headerValue;
            }
        }
    }
    return null;
}

function toFiniteNumber($value): ?float {
    if ($value === null || $value === '') return null;
    if (!is_numeric($value)) return null;
    $number = (float) $value;
    return is_finite($number) ? $number : null;
}

function writeJsonAtomically(string $path, array $data): bool {
    $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) return false;

    $tmpPath = $path . '.tmp';
    $bytes = @file_put_contents($tmpPath, $encoded, LOCK_EX);
    if ($bytes === false) return false;

    return @rename($tmpPath, $path);
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ["status" => "error", "message" => "Povolená je iba metóda POST."]);
}

if (defined('UPDATE_SHARED_KEY') && UPDATE_SHARED_KEY !== '') {
    $requestKey = getHeaderValue('X-Termika-Key');
    if (!is_string($requestKey) || !hash_equals(UPDATE_SHARED_KEY, $requestKey)) {
        respond(401, ["status" => "error", "message" => "Neplatný podpis požiadavky."]);
    }
}

$raw_data = file_get_contents('php://input');

if ($raw_data === false || trim($raw_data) === '') {
    respond(400, ["status" => "error", "message" => "Prázdna požiadavka."]);
}

try {
    $json_test = json_decode($raw_data, true, 512, JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    respond(400, ["status" => "error", "message" => "Neplatný JSON formát."]);
}

if (!is_array($json_test)) {
    respond(400, ["status" => "error", "message" => "Neplatný JSON payload."]);
}

$json_test['server_timestamp'] = time();

if (!writeJsonAtomically(__DIR__ . '/data.json', $json_test)) {
    respond(500, ["status" => "error", "message" => "Nepodarilo sa zapísať dáta."]);
}

$spo2 = toFiniteNumber($json_test['blood_oxygen_spo2'] ?? null);
$hydration = toFiniteNumber($json_test['hydration_index_pct'] ?? null);
$distanceCtr = toFiniteNumber($json_test['vzdialenost_k_ctr_m'] ?? null);

$alerts = [];

// 1. Lekársky alert - Hypoxia a zlé dýchanie
if ($spo2 !== null && $spo2 < 90) {
    $alerts[] = "KRITICKA HYPOXIA! Kyslik v krvi pilota klesol na " . round($spo2, 1) . "%. Hrozi mikrospanok a strata kontroly.";
}

// 2. Lekársky alert - Extrémna dehydratácia
if ($hydration !== null && $hydration < 65) {
    $alerts[] = "DEHYDRATACIA organizmu! Pokles na " . round($hydration, 1) . "%. Pilot moze robit skratove rozhodnutia.";
}

// 3. Taktický alert - Blízkosť zakázaného vzdušného priestoru CTR/TMA
if ($distanceCtr !== null && $distanceCtr < 500) {
    $alerts[] = "NARUSENIE PRIESTORU! Pilot je len " . round($distanceCtr) . " metrov od riadenej zony CTR/TMA.";
}

if (!empty($alerts)) {
    $pilotIdRaw = (string)($json_test['pilot_id'] ?? 'X-Alps');
    $pilotId = trim(preg_replace('/[^\p{L}\p{N}_\- ]/u', '', $pilotIdRaw)) ?: 'X-Alps';
    sendTelegramAlert("ALARM KOKPITU - PILOT: " . $pilotId . "\n\n" . implode("\n", $alerts));
}

echo json_encode(["status" => "success", "message" => "Live dáta spracované."], JSON_UNESCAPED_UNICODE);
?>

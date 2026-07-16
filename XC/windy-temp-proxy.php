<?php
// XC/windy-temp-proxy.php
// TermikaXC – server-side proxy pre Windy Point Forecast API.
// Skrýva API kľúč na serveri. Vracia normalizovaný TEMP profil pre zadanú polohu.
//
// Použitie: GET windy-temp-proxy.php?lat=46.43&lon=11.85
// Výstup:   JSON pole TEMP hladín (rovnaký formát ako temptest.json)

require_once __DIR__ . '/asset/config.php';

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

// --- Validácia API kľúča ---
if (!defined('WINDY_API_KEY') || WINDY_API_KEY === '') {
    http_response_code(503);
    echo json_encode([
        'error' => 'WINDY_API_KEY nie je nakonfigurovaný.',
        'hint'  => 'Pridaj windy_api_key do .local-config.php (nad domains/) alebo nastav TERMIKA_LOCAL_CONFIG_PATH / env WINDY_API_KEY. Kľúč vygeneruj na https://api.windy.com/keys'
    ]);
    exit;
}

// --- Validácia vstupu ---
$lat = filter_input(INPUT_GET, 'lat', FILTER_VALIDATE_FLOAT);
$lon = filter_input(INPUT_GET, 'lon', FILTER_VALIDATE_FLOAT);

if ($lat === false || $lat === null || $lon === false || $lon === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Chýbajúce alebo neplatné parametre lat/lon.']);
    exit;
}

if ($lat < -90.0 || $lat > 90.0 || $lon < -180.0 || $lon > 180.0) {
    http_response_code(400);
    echo json_encode(['error' => 'Parametre lat/lon sú mimo rozsahu.']);
    exit;
}

// --- Windy Point Forecast API – požiadavka ---
$windyEndpoint = 'https://api.windy.com/api/point-forecast/v2';

$levels = ['surface', '1000h', '950h', '925h', '900h', '850h', '800h', '700h', '600h', '500h', '400h', '300h', '200h', '150h'];

$requestBody = json_encode([
    'lat'        => $lat,
    'lon'        => $lon,
    'model'      => 'gfs',
    'parameters' => ['temp', 'dewpoint', 'wind', 'gh'],
    'levels'     => $levels,
    'key'        => WINDY_API_KEY,
]);

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => 'Na serveri nie je dostupný cURL.']);
    exit;
}

$ch = curl_init($windyEndpoint);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $requestBody,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response  = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError !== '') {
    http_response_code(502);
    echo json_encode(['error' => 'cURL chyba pri volaní Windy API: ' . $curlError]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code(502);
    $parsed = json_decode($response, true);
    $detail = is_array($parsed) ? ($parsed['message'] ?? $parsed['error'] ?? $response) : $response;
    echo json_encode(['error' => 'Windy API vrátilo HTTP ' . $httpCode . ': ' . $detail]);
    exit;
}

$data = json_decode($response, true);
if (!is_array($data)) {
    http_response_code(502);
    echo json_encode(['error' => 'Windy API nevrátilo platný JSON.']);
    exit;
}

if (isset($data['message'])) {
    http_response_code(502);
    echo json_encode(['error' => 'Windy API chyba: ' . $data['message']]);
    exit;
}

// --- Konverzia Windy odpovede na štandardný TEMP profil ---
// Windy vracia polia hodnôt po timestampoch; berieme index 0 (aktuálny čas).

$levelPressures = [
    'surface' => null,
    '1000h' => 1000, '950h' => 950, '925h' => 925, '900h' => 900, '850h' => 850,
    '800h' => 800, '700h' => 700, '600h' => 600, '500h' => 500,
    '400h' => 400, '300h' => 300, '200h' => 200, '150h' => 150,
];

$profile = [];

foreach ($levelPressures as $levelKey => $p_hpa) {
    $tempK = $data['temp-'     . $levelKey][0] ?? null;
    $dpK   = $data['dewpoint-' . $levelKey][0] ?? null;
    $ghM   = $data['gh-'       . $levelKey][0] ?? null;
    $uMs   = $data['wind_u-'   . $levelKey][0] ?? null;
    $vMs   = $data['wind_v-'   . $levelKey][0] ?? null;

    if ($tempK === null || !is_numeric($tempK)) {
        continue;
    }

    $T_c  = round((float)$tempK - 273.15, 2);
    $Td_c = (is_numeric($dpK)) ? round((float)$dpK - 273.15, 2) : null;
    $z_m  = (is_numeric($ghM)) ? (int)round((float)$ghM) : null;

    $speedMs  = (is_numeric($uMs) && is_numeric($vMs)) ? hypot((float)$uMs, (float)$vMs) : null;
    $speedKts = ($speedMs !== null) ? round($speedMs * 1.9438444924406, 2) : null;
    $dirDeg   = (is_numeric($uMs) && is_numeric($vMs))
        ? fmod(rad2deg(atan2(-(float)$uMs, -(float)$vMs)) + 360.0, 360.0)
        : null;

    // Pre surface hladinu, ak chýba tlak, odhadneme zo štandardnej atmosféry podľa výšky
    if ($p_hpa === null && is_numeric($ghM)) {
        $p_hpa = round(1013.25 * pow(1.0 - (float)$ghM / 44330.0, 5.255), 1);
    }

    if ($z_m === null) {
        continue;
    }

    $profile[] = [
        'p_hpa'       => $p_hpa,
        'z_m'         => $z_m,
        'T_c'         => $T_c,
        'Td_c'        => $Td_c,
        'w_dir_deg'   => ($dirDeg !== null) ? (int)round($dirDeg) : null,
        'w_speed_kts' => $speedKts,
    ];
}

// Zoradiť podľa výšky
usort($profile, static function (array $a, array $b): int {
    return ($a['z_m'] ?? 0) <=> ($b['z_m'] ?? 0);
});

echo json_encode(array_values($profile), JSON_UNESCAPED_UNICODE);

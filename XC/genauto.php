<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

function respond(int $statusCode, array $payload): void {
    http_response_code($statusCode);
    header("Content-Type: application/json; charset=UTF-8");
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
    $requestMethod = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? ''));

    if ($requestMethod === 'OPTIONS') {
        respond(200, ["status" => "success", "message" => "OK"]);
    }

    if ($requestMethod !== 'POST') {
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

function runtime_root(): string {
    return dirname(__DIR__) . '/.termika-runtime';
}

function db_path(): string {
    return runtime_root() . '/genauto.sqlite';
}

function table_has_column(PDO $pdo, string $table, string $column): bool {
    $stmt = $pdo->query("PRAGMA table_info(" . $table . ")");
    if (!$stmt) return false;
    $rows = $stmt->fetchAll();
    foreach ($rows as $row) {
        if (isset($row['name']) && (string)$row['name'] === $column) return true;
    }
    return false;
}

function normalize_temp_profile_rows($rawProfile): array {
    if (!is_array($rawProfile) || count($rawProfile) < 2) return [];

    $rows = [];
    foreach ($rawProfile as $row) {
        if (!is_array($row)) continue;

        $z = isset($row['z_m']) && is_numeric($row['z_m']) ? (float)$row['z_m'] : null;
        $p = isset($row['p_hpa']) && is_numeric($row['p_hpa']) ? (float)$row['p_hpa'] : null;
        $t = isset($row['T_c']) && is_numeric($row['T_c']) ? (float)$row['T_c'] : null;
        $td = isset($row['Td_c']) && is_numeric($row['Td_c']) ? (float)$row['Td_c'] : null;
        $dir = isset($row['w_dir_deg']) && is_numeric($row['w_dir_deg']) ? (float)$row['w_dir_deg'] : null;
        $speed = isset($row['w_speed_kts']) && is_numeric($row['w_speed_kts']) ? (float)$row['w_speed_kts'] : null;

        if (!is_finite((float)$z) || !is_finite((float)$dir) || !is_finite((float)$speed)) continue;

        $rows[] = [
            'z_m' => round((float)$z, 3),
            'p_hpa' => is_finite((float)$p) ? round((float)$p, 3) : null,
            'T_c' => is_finite((float)$t) ? round((float)$t, 4) : null,
            'Td_c' => is_finite((float)$td) ? round((float)$td, 4) : null,
            'w_dir_deg' => fmod((fmod((float)$dir, 360.0) + 360.0), 360.0),
            'w_speed_kts' => round((float)$speed, 4)
        ];
    }

    usort($rows, function ($a, $b) {
        return $a['z_m'] <=> $b['z_m'];
    });

    return count($rows) >= 2 ? $rows : [];
}

function extract_temp_profile_from_request(array $requestPayload): array {
    $rawProfile = null;
    if (isset($requestPayload['temp_profile']) && is_array($requestPayload['temp_profile'])) {
        $rawProfile = $requestPayload['temp_profile'];
    } elseif (isset($requestPayload['tempProfile']) && is_array($requestPayload['tempProfile'])) {
        $rawProfile = $requestPayload['tempProfile'];
    } elseif (isset($requestPayload['payload']) && is_array($requestPayload['payload'])) {
        $payload = $requestPayload['payload'];
        if (isset($payload['tempProfile']) && is_array($payload['tempProfile'])) {
            $rawProfile = $payload['tempProfile'];
        } elseif (isset($payload['temp_profile']) && is_array($payload['temp_profile'])) {
            $rawProfile = $payload['temp_profile'];
        }
    }

    $normalized = normalize_temp_profile_rows($rawProfile);

    $source = null;
    if (array_key_exists('temp_source', $requestPayload)) {
        $source = $requestPayload['temp_source'];
    } elseif (array_key_exists('tempSource', $requestPayload)) {
        $source = $requestPayload['tempSource'];
    } elseif (isset($requestPayload['payload']) && is_array($requestPayload['payload'])) {
        $payload = $requestPayload['payload'];
        if (array_key_exists('tempSource', $payload)) {
            $source = $payload['tempSource'];
        } elseif (array_key_exists('temp_source', $payload)) {
            $source = $payload['temp_source'];
        }
    }

    return [
        'profile' => $normalized,
        'source' => $source
    ];
}

function persist_temp_profile(PDO $pdo, array $profile, $source): ?array {
    if (!is_array($profile) || count($profile) < 2) return null;

    $profileJson = json_encode($profile, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($profileJson === false) return null;

    $sourceJson = null;
    if ($source !== null) {
        $sourceJson = json_encode($source, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($sourceJson === false) $sourceJson = null;
    }

    $hash = hash('sha256', $profileJson);
    $levelsCount = count($profile);
    $zMin = isset($profile[0]['z_m']) ? (float)$profile[0]['z_m'] : null;
    $zMax = isset($profile[$levelsCount - 1]['z_m']) ? (float)$profile[$levelsCount - 1]['z_m'] : null;
    $nowUtc = gmdate('c');

    $stmt = $pdo->prepare(
        'INSERT INTO temp_profiles (temp_hash, levels_count, z_min_m, z_max_m, profile_json, source_json, created_at_utc, last_seen_at_utc)
         VALUES (:temp_hash, :levels_count, :z_min_m, :z_max_m, :profile_json, :source_json, :created_at_utc, :last_seen_at_utc)
         ON CONFLICT(temp_hash)
         DO UPDATE SET
             levels_count = excluded.levels_count,
             z_min_m = excluded.z_min_m,
             z_max_m = excluded.z_max_m,
             source_json = COALESCE(excluded.source_json, temp_profiles.source_json),
             last_seen_at_utc = excluded.last_seen_at_utc'
    );

    $stmt->execute([
        ':temp_hash' => $hash,
        ':levels_count' => $levelsCount,
        ':z_min_m' => $zMin,
        ':z_max_m' => $zMax,
        ':profile_json' => $profileJson,
        ':source_json' => $sourceJson,
        ':created_at_utc' => $nowUtc,
        ':last_seen_at_utc' => $nowUtc
    ]);

    return [
        'temp_hash' => $hash,
        'levels_count' => $levelsCount,
        'z_min_m' => $zMin,
        'z_max_m' => $zMax,
        'source_json' => $sourceJson
    ];
}

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    if (!extension_loaded('pdo_sqlite')) {
        respond(500, ["status" => "error", "message" => "Chýba PHP rozšírenie pdo_sqlite."]);
    }

    $root = runtime_root();
    ensure_dir($root);

    try {
        $pdo = new PDO('sqlite:' . db_path());
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA journal_mode = WAL');

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS generations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL,
                file_identifier TEXT NOT NULL UNIQUE,
                generated_at_utc TEXT NOT NULL,
                day_utc TEXT NOT NULL,
                center_lat REAL NOT NULL,
                center_lon REAL NOT NULL,
                payload_json TEXT,
                created_at_utc TEXT NOT NULL
            )'
        );

        if (!table_has_column($pdo, 'generations', 'temp_profile_hash')) {
            $pdo->exec('ALTER TABLE generations ADD COLUMN temp_profile_hash TEXT NULL');
        }
        if (!table_has_column($pdo, 'generations', 'temp_source_json')) {
            $pdo->exec('ALTER TABLE generations ADD COLUMN temp_source_json TEXT NULL');
        }

        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_generations_kind_day_time ON generations(kind, day_utc, generated_at_utc)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_generations_file_identifier ON generations(file_identifier)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_generations_temp_profile_hash ON generations(temp_profile_hash)');

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS temp_profiles (
                temp_hash TEXT PRIMARY KEY,
                levels_count INTEGER NOT NULL,
                z_min_m REAL,
                z_max_m REAL,
                profile_json TEXT NOT NULL,
                source_json TEXT,
                created_at_utc TEXT NOT NULL,
                last_seen_at_utc TEXT NOT NULL
            )'
        );

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS webm_cache (
                generation_id INTEGER PRIMARY KEY,
                mime_type TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                blob_data BLOB NOT NULL,
                created_at_utc TEXT NOT NULL,
                FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE CASCADE
            )'
        );
    } catch (Throwable $error) {
        respond(500, ["status" => "error", "message" => "Nepodarilo sa inicializovať databázu GENauto."]);
    }

    return $pdo;
}

function generation_filename(string $kind, float $lat, float $lon, string $timestamp): string {
    $latTag = str_replace(['+', '-'], ['p', 'm'], sprintf('%.5f', $lat));
    $lonTag = str_replace(['+', '-'], ['p', 'm'], sprintf('%.5f', $lon));
    $latTag = str_replace('.', '_', $latTag);
    $lonTag = str_replace('.', '_', $lonTag);
    return $timestamp . '__' . $kind . '__lat' . $latTag . '__lon' . $lonTag . '.json';
}

function generation_identifier(string $kind, string $filename): string {
    return 'GENauto/' . $kind . '/' . $filename;
}

function today_utc(): string {
    return gmdate('Y-m-d');
}

function normalize_json_identifier(string $kind, string $jsonFile): ?string {
    $kind = sanitize_kind($kind);
    if ($kind === null) return null;

    $jsonFile = trim($jsonFile);
    if ($jsonFile === '') return null;

    if (strpos($jsonFile, 'GENauto/' . $kind . '/') === 0) {
        $baseName = basename($jsonFile);
    } else {
        $baseName = basename($jsonFile);
    }

    if (!str_ends_with($baseName, '.json')) return null;
    return generation_identifier($kind, $baseName);
}

function webm_identifier_from_json_file(string $jsonIdentifier): string {
    $baseName = basename($jsonIdentifier, '.json');
    return 'GENauto/wind/' . $baseName . '.webm';
}

function decode_payload_json(?string $payloadJson) {
    if ($payloadJson === null || trim($payloadJson) === '') return null;
    $decoded = json_decode($payloadJson, true);
    return is_array($decoded) ? $decoded : null;
}

function decode_json_mixed(?string $jsonText) {
    if ($jsonText === null || trim($jsonText) === '') return null;
    $decoded = json_decode($jsonText, true);
    return json_last_error() === JSON_ERROR_NONE ? $decoded : null;
}

function list_records_for_kind_today(PDO $pdo, string $kind, int $limit): array {
    $stmt = $pdo->prepare(
    'SELECT g.id, g.file_identifier, g.generated_at_utc, g.center_lat, g.center_lon, g.payload_json,
        g.temp_profile_hash, g.temp_source_json,
                CASE WHEN w.generation_id IS NULL THEN 0 ELSE 1 END AS webm_exists
         FROM generations g
         LEFT JOIN webm_cache w ON w.generation_id = g.id
         WHERE g.kind = :kind AND g.day_utc = :day_utc
         ORDER BY g.generated_at_utc ASC, g.id ASC
         LIMIT :limit'
    );
    $stmt->bindValue(':kind', $kind, PDO::PARAM_STR);
    $stmt->bindValue(':day_utc', today_utc(), PDO::PARAM_STR);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll();
    $records = [];
    foreach ($rows as $row) {
        $file = (string)($row['file_identifier'] ?? '');
        $payload = decode_payload_json(isset($row['payload_json']) ? (string)$row['payload_json'] : null);
        $records[] = [
            'file' => $file,
            'generated_at_utc' => (string)($row['generated_at_utc'] ?? ''),
            'center' => [
                'lat' => isset($row['center_lat']) ? (float)$row['center_lat'] : null,
                'lon' => isset($row['center_lon']) ? (float)$row['center_lon'] : null
            ],
            'payload' => $payload,
            'temp_profile_ref' => isset($row['temp_profile_hash']) ? (string)$row['temp_profile_hash'] : null,
            'temp_source' => decode_json_mixed(isset($row['temp_source_json']) ? (string)$row['temp_source_json'] : null),
            'webm_file' => $kind === 'wind' ? webm_identifier_from_json_file($file) : null,
            'webm_exists' => $kind === 'wind' ? ((int)($row['webm_exists'] ?? 0) === 1) : false
        ];
    }

    return $records;
}

$requestMethod = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? ''));

if ($requestMethod === 'GET') {
    $action = isset($_GET['action']) ? (string)$_GET['action'] : '';
    if ($action === 'getTempProfile') {
        $tempHash = isset($_GET['temp_hash']) ? (string)$_GET['temp_hash'] : '';
        if (!preg_match('/^[a-f0-9]{64}$/', $tempHash)) {
            respond(400, ["status" => "error", "message" => "Neplatný temp_hash."]);
        }

        try {
            $pdo = db();
            $stmt = $pdo->prepare('SELECT temp_hash, levels_count, z_min_m, z_max_m, profile_json, source_json FROM temp_profiles WHERE temp_hash = :temp_hash LIMIT 1');
            $stmt->execute([':temp_hash' => $tempHash]);
            $row = $stmt->fetch();
        } catch (Throwable $error) {
            respond(500, ["status" => "error", "message" => "Nepodarilo sa načítať TEMP profil."]);
        }

        if (!$row) {
            respond(404, ["status" => "error", "message" => "TEMP profil nebol nájdený."]);
        }

        respond(200, [
            'status' => 'success',
            'temp_hash' => (string)$row['temp_hash'],
            'levels_count' => (int)$row['levels_count'],
            'z_min_m' => isset($row['z_min_m']) ? (float)$row['z_min_m'] : null,
            'z_max_m' => isset($row['z_max_m']) ? (float)$row['z_max_m'] : null,
            'profile' => decode_payload_json((string)$row['profile_json']),
            'source' => decode_json_mixed(isset($row['source_json']) ? (string)$row['source_json'] : null)
        ]);
    }

    if ($action === 'getWebm') {
        $kind = isset($_GET['kind']) ? (string)$_GET['kind'] : 'wind';
        $jsonFile = isset($_GET['json_file']) ? (string)$_GET['json_file'] : '';
        if (sanitize_kind($kind) !== 'wind') {
            respond(400, ["status" => "error", "message" => "WebM cache je dostupná iba pre wind."]);
        }

        $identifier = normalize_json_identifier('wind', $jsonFile);
        if ($identifier === null) {
            respond(400, ["status" => "error", "message" => "Neplatný názov JSON súboru."]);
        }

        try {
            $pdo = db();
            $stmt = $pdo->prepare(
                'SELECT w.mime_type, w.size_bytes, w.blob_data
                 FROM generations g
                 INNER JOIN webm_cache w ON w.generation_id = g.id
                 WHERE g.kind = :kind AND g.file_identifier = :file_identifier
                 LIMIT 1'
            );
            $stmt->execute([
                ':kind' => 'wind',
                ':file_identifier' => $identifier
            ]);
            $row = $stmt->fetch();
        } catch (Throwable $error) {
            respond(500, ["status" => "error", "message" => "Nepodarilo sa načítať WebM cache."]);
        }

        if (!$row || !isset($row['blob_data'])) {
            respond(404, ["status" => "error", "message" => "WebM cache nebola nájdená."]);
        }

        $mime = isset($row['mime_type']) && trim((string)$row['mime_type']) !== ''
            ? (string)$row['mime_type']
            : 'video/webm';
        $blob = $row['blob_data'];
        $size = isset($row['size_bytes']) ? (int)$row['size_bytes'] : strlen((string)$blob);

        http_response_code(200);
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . $size);
        header('Cache-Control: no-store, max-age=0');
        echo $blob;
        exit;
    }

    respond(400, ["status" => "error", "message" => "Neznáma GET akcia."]);
}

$payload = load_payload();
$action = isset($payload['action']) ? (string)$payload['action'] : '';

try {
    $pdo = db();
} catch (Throwable $error) {
    respond(500, ["status" => "error", "message" => "Databáza GENauto nie je dostupná."]);
}

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

    $generatedAtUtc = gmdate('c');
    $timestamp = gmdate('Y-m-d\\TH-i-s\\Z');
    $baseFilename = generation_filename($kind, $lat, $lon, $timestamp);
    $filename = $baseFilename;
    $identifier = generation_identifier($kind, $filename);
    $dayUtc = today_utc();
    $payloadJson = isset($payload['payload'])
        ? json_encode($payload['payload'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        : null;
    if ($payloadJson === false) {
        respond(500, ["status" => "error", "message" => "Nepodarilo sa serializovať payload generácie."]);
    }

    $tempInfo = extract_temp_profile_from_request($payload);
    $tempProfileRef = null;
    $tempSourceJson = null;
    try {
        $storedTemp = persist_temp_profile($pdo, $tempInfo['profile'], $tempInfo['source']);
        if (is_array($storedTemp)) {
            $tempProfileRef = (string)$storedTemp['temp_hash'];
            $tempSourceJson = isset($storedTemp['source_json']) ? $storedTemp['source_json'] : null;
        } elseif ($tempInfo['source'] !== null) {
            $tempSourceJson = json_encode($tempInfo['source'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($tempSourceJson === false) $tempSourceJson = null;
        }
    } catch (Throwable $error) {
        respond(500, ["status" => "error", "message" => "Nepodarilo sa uložiť TEMP profil."]);
    }

    try {
        $insert = $pdo->prepare(
            'INSERT INTO generations (kind, file_identifier, generated_at_utc, day_utc, center_lat, center_lon, payload_json, temp_profile_hash, temp_source_json, created_at_utc)
             VALUES (:kind, :file_identifier, :generated_at_utc, :day_utc, :center_lat, :center_lon, :payload_json, :temp_profile_hash, :temp_source_json, :created_at_utc)'
        );

        $suffix = 0;
        while (true) {
            try {
                $insert->execute([
                    ':kind' => $kind,
                    ':file_identifier' => $identifier,
                    ':generated_at_utc' => $generatedAtUtc,
                    ':day_utc' => $dayUtc,
                    ':center_lat' => $lat,
                    ':center_lon' => $lon,
                    ':payload_json' => $payloadJson,
                    ':temp_profile_hash' => $tempProfileRef,
                    ':temp_source_json' => $tempSourceJson,
                    ':created_at_utc' => $generatedAtUtc
                ]);
                break;
            } catch (PDOException $error) {
                if ((int)$error->getCode() !== 23000) {
                    throw $error;
                }

                $suffix += 1;
                $filename = preg_replace('/\.json$/', '__n' . $suffix . '.json', $baseFilename);
                if (!is_string($filename)) {
                    $filename = $baseFilename . '__n' . $suffix . '.json';
                }
                $identifier = generation_identifier($kind, $filename);
            }
        }
    } catch (Throwable $error) {
        respond(500, ["status" => "error", "message" => "Nepodarilo sa uložiť generáciu do databázy."]);
    }

    respond(200, [
        "status" => "success",
        "message" => "Generácia bola uložená.",
        "file" => $identifier,
        "temp_profile_ref" => $tempProfileRef,
        "webm_file" => $kind === 'wind' ? webm_identifier_from_json_file($identifier) : null
    ]);
}

if ($action === 'saveWebm') {
    $kindRaw = isset($payload['kind']) ? (string)$payload['kind'] : 'wind';
    $kind = sanitize_kind($kindRaw);
    if ($kind !== 'wind') {
        respond(400, ["status" => "error", "message" => "WebM cache sa ukladá iba pre wind generácie."]);
    }

    $jsonFile = isset($payload['json_file']) ? (string)$payload['json_file'] : '';
    $identifier = normalize_json_identifier('wind', $jsonFile);
    if ($identifier === null) {
        respond(400, ["status" => "error", "message" => "Neplatný názov JSON súboru."]);
    }

    $base64 = isset($payload['webm_base64']) ? (string)$payload['webm_base64'] : '';
    if (trim($base64) === '') {
        respond(400, ["status" => "error", "message" => "Chýba base64 obsah WebM."]);
    }

    if (str_starts_with($base64, 'data:')) {
        $parts = explode(',', $base64, 2);
        $base64 = count($parts) === 2 ? $parts[1] : $base64;
    }

    $binary = base64_decode($base64, true);
    if ($binary === false || $binary === '') {
        respond(400, ["status" => "error", "message" => "Nepodarilo sa dekódovať WebM obsah."]);
    }

    try {
        $find = $pdo->prepare('SELECT id FROM generations WHERE kind = :kind AND file_identifier = :file_identifier LIMIT 1');
        $find->execute([
            ':kind' => 'wind',
            ':file_identifier' => $identifier
        ]);
        $row = $find->fetch();
        if (!$row || !isset($row['id'])) {
            respond(404, ["status" => "error", "message" => "Cieľová wind generácia neexistuje."]);
        }

        $generationId = (int)$row['id'];
        $mimeType = 'video/webm';
        $sizeBytes = strlen($binary);

        $save = $pdo->prepare(
            'INSERT INTO webm_cache (generation_id, mime_type, size_bytes, blob_data, created_at_utc)
             VALUES (:generation_id, :mime_type, :size_bytes, :blob_data, :created_at_utc)
             ON CONFLICT(generation_id)
             DO UPDATE SET
                 mime_type = excluded.mime_type,
                 size_bytes = excluded.size_bytes,
                 blob_data = excluded.blob_data,
                 created_at_utc = excluded.created_at_utc'
        );

        $save->bindValue(':generation_id', $generationId, PDO::PARAM_INT);
        $save->bindValue(':mime_type', $mimeType, PDO::PARAM_STR);
        $save->bindValue(':size_bytes', $sizeBytes, PDO::PARAM_INT);
        $save->bindValue(':blob_data', $binary, PDO::PARAM_LOB);
        $save->bindValue(':created_at_utc', gmdate('c'), PDO::PARAM_STR);
        $save->execute();
    } catch (Throwable $error) {
        respond(500, ["status" => "error", "message" => "Nepodarilo sa uložiť WebM cache."]);
    }

    respond(200, [
        "status" => "success",
        "message" => "WebM cache bola uložená.",
        "file" => webm_identifier_from_json_file($identifier)
    ]);
}

if ($action === 'listWindToday') {
    $limitRaw = isset($payload['limit']) ? (int)$payload['limit'] : 200;
    $limit = max(1, min(1000, $limitRaw));

    try {
        $records = list_records_for_kind_today($pdo, 'wind', $limit);
    } catch (Throwable $error) {
        respond(500, ["status" => "error", "message" => "Nepodarilo sa načítať zoznam wind generácií."]);
    }

    respond(200, [
        "status" => "success",
        "records" => $records,
        "count" => count($records)
    ]);
}

if ($action === 'listMapToday') {
    $limitRaw = isset($payload['limit']) ? (int)$payload['limit'] : 500;
    $limit = max(1, min(2000, $limitRaw));

    try {
        $records = list_records_for_kind_today($pdo, 'map', $limit);
    } catch (Throwable $error) {
        respond(500, ["status" => "error", "message" => "Nepodarilo sa načítať zoznam map generácií."]);
    }

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
    try {
        $countStmt = $pdo->prepare(
            'SELECT kind, COUNT(*) AS cnt
             FROM generations
             WHERE day_utc = :day_utc AND kind = :kind
             GROUP BY kind'
        );
        $deleteStmt = $pdo->prepare(
            'DELETE FROM generations
             WHERE day_utc = :day_utc AND kind = :kind'
        );

        foreach (array_keys($kinds) as $kind) {
            $countStmt->execute([
                ':day_utc' => today_utc(),
                ':kind' => $kind
            ]);
            $row = $countStmt->fetch();
            $deleted[$kind] = $row && isset($row['cnt']) ? (int)$row['cnt'] : 0;

            $deleteStmt->execute([
                ':day_utc' => today_utc(),
                ':kind' => $kind
            ]);
        }
    } catch (Throwable $error) {
        respond(500, ["status" => "error", "message" => "Dnešné generácie sa nepodarilo vymazať."]);
    }

    respond(200, [
        "status" => "success",
        "message" => "Dnešné generácie boli vymazané.",
        "deleted" => $deleted
    ]);
}

respond(400, ["status" => "error", "message" => "Neznáma akcia."]);

<?php
// asset/config.php

function termikaResolveLocalConfigPath(string $fallbackPath): string {
    $envPath = termikaEnv('TERMIKA_LOCAL_CONFIG_PATH', '');
    if ($envPath !== '') {
        return $envPath;
    }

    $candidates = [];

    $docRoot = isset($_SERVER['DOCUMENT_ROOT']) ? realpath((string)$_SERVER['DOCUMENT_ROOT']) : false;
    if (is_string($docRoot) && $docRoot !== '') {
        $candidates[] = $docRoot;
    }

    $selfPath = realpath(__DIR__);
    if (is_string($selfPath) && $selfPath !== '') {
        $candidates[] = $selfPath;
    }

    foreach ($candidates as $path) {
        if (preg_match('~^(.*?)/domains(?:/|$)~', $path, $m) === 1 && !empty($m[1])) {
            return rtrim($m[1], '/') . '/.local-config.php';
        }
    }

    return $fallbackPath;
}

function termikaLoadLocalConfig(): array {
    $path = termikaResolveLocalConfigPath(__DIR__ . '/local-config.php');
    if (!is_file($path)) return [];

    $data = require $path;
    return is_array($data) ? $data : [];
}

function termikaEnv(string $name, string $default = ''): string {
    $value = getenv($name);
    if ($value === false || $value === null || $value === '') return $default;
    return $value;
}

function termikaConfigValue(array $localConfig, string $envName, string $localKey, string $default = ''): string {
    $envValue = termikaEnv($envName, '');
    if ($envValue !== '') return $envValue;

    $localValue = $localConfig[$localKey] ?? '';
    if (is_string($localValue) && trim($localValue) !== '') {
        return trim($localValue);
    }

    return $default;
}

$termikaLocalConfig = termikaLoadLocalConfig();

// 1. TELEGRAM KONFIGURÁCIA
define('TELEGRAM_BOT_TOKEN', termikaConfigValue($termikaLocalConfig, 'TELEGRAM_BOT_TOKEN', 'telegram_bot_token', 'TVOJ_TELEGRAM_BOT_TOKEN'));
define('TELEGRAM_CHAT_ID', termikaConfigValue($termikaLocalConfig, 'TELEGRAM_CHAT_ID', 'telegram_chat_id', 'TVOJE_CHAT_ID'));

// Voliteľný podpis pre ingest endpoint update.php.
define('UPDATE_SHARED_KEY', termikaConfigValue($termikaLocalConfig, 'UPDATE_SHARED_KEY', 'update_shared_key', ''));

// 2. CESIUM KONFIGURÁCIA
// Pilot-friendly default: aplikácia funguje aj bez serverových env premenných.
// Ak je na serveri nastavený CESIUM_ACCESS_TOKEN, má prednosť pred týmto fallbackom.
define(
    'CESIUM_ACCESS_TOKEN',
    termikaConfigValue(
        $termikaLocalConfig,
        'CESIUM_ACCESS_TOKEN',
        'cesium_access_token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0YTU2YmQ1Zi05MzUwLTQyNDAtYWFjNi1hMDIyMjFjNGEzMDgiLCJpZCI6ODI3MzksImlhdCI6MTY0NTA1MzA4Mn0.v8Fx3OjfiQSpyo-qfPZ3-tf1qaYMswkeDbwUzJcDaxw'
    )
);

// 3. DATABÁZOVÁ KONFIGURÁCIA (Hostinger WordPress)
define('DB_NAME', termikaConfigValue($termikaLocalConfig, 'DB_NAME', 'db_name', 'u205009856_GUDWm'));
define('DB_USER', termikaConfigValue($termikaLocalConfig, 'DB_USER', 'db_user', 'u205009856_admin'));
define('DB_PASSWORD', termikaConfigValue($termikaLocalConfig, 'DB_PASSWORD', 'db_password', ''));
define('DB_HOST', termikaConfigValue($termikaLocalConfig, 'DB_HOST', 'db_host', '127.0.0.1'));
define('DB_CHARSET', termikaConfigValue($termikaLocalConfig, 'DB_CHARSET', 'db_charset', 'utf8'));

// 4. WINDY KONFIGURÁCIA
// API kľúč pre Windy Point Forecast API (https://api.windy.com/).
// Vygeneruj na: https://api.windy.com/keys
define('WINDY_API_KEY', termikaConfigValue($termikaLocalConfig, 'WINDY_API_KEY', 'windy_api_key', ''));

// API kľúč pre Windy Map Forecast API (frontend embed).
// Kľúč je viazaný na doménu v Windy dashboarde – nie je tajný ako Point Forecast.
define('WINDY_MAP_KEY', termikaConfigValue($termikaLocalConfig, 'WINDY_MAP_KEY', 'windy_map_key', ''));

// Rezervované kľúče pre ďalšie Windy služby.
define('WINDY_WEBCAMS_KEY', termikaConfigValue($termikaLocalConfig, 'WINDY_WEBCAMS_KEY', 'windy_webcams_key', ''));
define('WINDY_PLUGINS_KEY', termikaConfigValue($termikaLocalConfig, 'WINDY_PLUGINS_KEY', 'windy_plugins_key', ''));

// Funkcia na vytvorenie bezpečného PDO spojenia s databázou
function getDbConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        return new PDO($dsn, DB_USER, DB_PASSWORD, $options);
    } catch (PDOException $e) {
        // V produkcii zapísať do logu, nevypisovať citlivé dáta
        die("Chyba pripojenia k plachtárskej databáze.");
    }
}

// Pomocná funkcia na odosielanie správ na Telegram
function sendTelegramAlert($message) {
    if (
        empty($message) ||
        TELEGRAM_BOT_TOKEN === 'TVOJ_TELEGRAM_BOT_TOKEN' ||
        TELEGRAM_CHAT_ID === 'TVOJE_CHAT_ID'
    ) {
        return false;
    }

    $url = 'https://api.telegram.org/bot' . TELEGRAM_BOT_TOKEN . '/sendMessage';
    $query = http_build_query([
        'chat_id' => TELEGRAM_CHAT_ID,
        'parse_mode' => 'Markdown',
        'text' => $message,
    ]);

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 3,
        ],
    ]);

    return @file_get_contents($url . '?' . $query, false, $context);
}
?>

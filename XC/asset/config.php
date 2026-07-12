<?php
// asset/config.php

function termikaEnv(string $name, string $default = ''): string {
    $value = getenv($name);
    if ($value === false || $value === null || $value === '') return $default;
    return $value;
}

// 1. TELEGRAM KONFIGURÁCIA
define('TELEGRAM_BOT_TOKEN', termikaEnv('TELEGRAM_BOT_TOKEN', 'TVOJ_TELEGRAM_BOT_TOKEN'));
define('TELEGRAM_CHAT_ID', termikaEnv('TELEGRAM_CHAT_ID', 'TVOJE_CHAT_ID'));

// Voliteľný podpis pre ingest endpoint update.php.
define('UPDATE_SHARED_KEY', termikaEnv('UPDATE_SHARED_KEY', ''));

// 2. CESIUM KONFIGURÁCIA
define('CESIUM_ACCESS_TOKEN', termikaEnv('CESIUM_ACCESS_TOKEN', ''));

// 3. DATABÁZOVÁ KONFIGURÁCIA (Hostinger WordPress)
define('DB_NAME', termikaEnv('DB_NAME', 'u205009856_GUDWm'));
define('DB_USER', termikaEnv('DB_USER', 'u205009856_admin'));
define('DB_PASSWORD', termikaEnv('DB_PASSWORD', ''));
define('DB_HOST', termikaEnv('DB_HOST', '127.0.0.1'));
define('DB_CHARSET', termikaEnv('DB_CHARSET', 'utf8'));

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

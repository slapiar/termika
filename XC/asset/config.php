<?php
// asset/config.php

// 1. TELEGRAM KONFIGURÁCIA
define('TELEGRAM_BOT_TOKEN', 'TVOJ_TELEGRAM_BOT_TOKEN');
define('TELEGRAM_CHAT_ID', 'TVOJE_CHAT_ID');

// 2. CESIUM KONFIGURÁCIA
define('CESIUM_ACCESS_TOKEN', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI0YTU2YmQ1Zi05MzUwLTQyNDAtYWFjNi1hMDIyMjFjNGEzMDgiLCJpZCI6ODI3MzksImlhdCI6MTY0NTA1MzA4Mn0.v8Fx3OjfiQSpyo-qfPZ3-tf1qaYMswkeDbwUzJcDaxw');

// 3. DATABÁZOVÁ KONFIGURÁCIA (Hostinger WordPress)
define('DB_NAME', 'u205009856_GUDWm');
define('DB_USER', 'u205009856_admin');
define('DB_PASSWORD', 'Sp610223/7174');
define('DB_HOST', '127.0.0.1');
define('DB_CHARSET', 'utf8');

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
    if (TELEGRAM_BOT_TOKEN === 'TVOJ_TELEGRAM_BOT_TOKEN' || empty($message)) {
        return false;
    }
    $urlMsg = urlencode($message);
    $url = "https://telegram.org" . TELEGRAM_BOT_TOKEN . "/sendMessage?chat_id=" . TELEGRAM_CHAT_ID . "&parse_mode=Markdown&text=" . $urlMsg;
    return @file_get_contents($url);
}
?>

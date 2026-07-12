<?php
// Súbor: update.php (Nahrať do public_html/termika/)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$raw_data = file_get_contents('php://input');

if (!empty($raw_data)) {
    $json_test = json_decode($raw_data, true);
    
    if ($json_test !== null) {
        // Pridáme časovú pečiatku servera pre overenie čerstvosti dát
        $json_test['server_timestamp'] = time();
        
        // Zápis do textovej databázy (Extrémne rýchle I/O)
        file_put_contents('data.json', json_encode($json_test));
        
        // AUTOMATICKÝ TELEGRAM REPORTING (Bezpečnostný Geofencing a Lekársky alarm)
        $bot_token = "TVOJ_TELEGRAM_BOT_TOKEN"; // Sem vlož token od @BotFather
        $chat_id = "TVOJE_CHAT_ID";             // Sem vlož ID skupiny pozemného tímu
        
        $alerts = [];
        
        // 1. Lekársky alert - Hypoxia a zlé dýchanie
        if (isset($json_test['blood_oxygen_spo2']) && $json_test['blood_oxygen_spo2'] < 90) {
            $alerts[] = "🚨 *KRITICKÁ HYPOXIA!* Kyslík v krvi pilota klesol na " . $json_test['blood_oxygen_spo2'] . "%. Hrozí mikrospánok a strata kontroly!";
        }
        
        // 2. Lekársky alert - Extrémna dehydratácia
        if (isset($json_test['hydration_index_pct']) && $json_test['hydration_index_pct'] < 65) {
            $alerts[] = "⚠️ *DEHYDRATÁCIA organizmu!* Pokles na " . $json_test['hydration_index_pct'] . "%. Pilot môže robiť skratové rozhodnutia.";
        }
        
        // 3. Taktický alert - Blízkosť zakázaného vzdušného priestoru CTR/TMA
        if (isset($json_test['vzdialenost_k_ctr_m']) && $json_test['vzdialenost_k_ctr_m'] < 500) {
            $alerts[] = "🛑 *NARUŠENIE PRIESTORU!* Pilot je len " . $json_test['vzdialenost_k_ctr_m'] . " metrov od riadenej zóny CTR/TMA!";
        }

        // Ak sa aktivoval akýkoľvek alarm, okamžite odoslať správu na Telegram tímu
        if (!empty($alerts) && $bot_token !== "TVOJ_TELEGRAM_BOT_TOKEN") {
            $msg = urlencode("🔔 *ALARM KOKPITU - PILOT: " . ($json_test['pilot_id'] ?? "X-Alps") . "*\n\n" . implode("\n", $alerts));
            @file_get_contents("https://telegram.org{$bot_token}/sendMessage?chat_id={$chat_id}&parse_mode=Markdown&text={$msg}");
        }

        echo json_encode(["status" => "success", "message" => "Live dáta spracované."]);
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Neplatný JSON formát."]);
    }
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Prázdna požiadavka."]);
}
?>

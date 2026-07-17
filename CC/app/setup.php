<?php
session_start();

$configPath = '';
$examplePath = __DIR__ . '/asset/local-config.php.example';

if (!isset($_SESSION['termika_setup_csrf'])) {
    $_SESSION['termika_setup_csrf'] = bin2hex(random_bytes(16));
}
$csrf = $_SESSION['termika_setup_csrf'];

function readLocalConfig(string $path): array {
    if (!is_file($path)) return [];
    $data = require $path;
    return is_array($data) ? $data : [];
}

function resolveTermikaLocalConfigPath(): string {
    $envPath = getenv('TERMIKA_LOCAL_CONFIG_PATH');
    if (is_string($envPath) && trim($envPath) !== '') {
        return trim($envPath);
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

    return __DIR__ . '/asset/local-config.php';
}

function sanitizeInput(?string $value): string {
    return trim((string)$value);
}

function buildConfigFromPost(array $post): array {
    return [
        'cesium_access_token' => sanitizeInput($post['cesium_access_token'] ?? ''),
        'windy_api_key' => sanitizeInput($post['windy_api_key'] ?? ''),
        'windy_map_key' => sanitizeInput($post['windy_map_key'] ?? ''),
        'windy_webcams_key' => sanitizeInput($post['windy_webcams_key'] ?? ''),
        'windy_plugins_key' => sanitizeInput($post['windy_plugins_key'] ?? ''),
        'telegram_bot_token' => sanitizeInput($post['telegram_bot_token'] ?? ''),
        'telegram_chat_id' => sanitizeInput($post['telegram_chat_id'] ?? ''),
        'update_shared_key' => sanitizeInput($post['update_shared_key'] ?? ''),
        'db_name' => sanitizeInput($post['db_name'] ?? ''),
        'db_user' => sanitizeInput($post['db_user'] ?? ''),
        'db_password' => sanitizeInput($post['db_password'] ?? ''),
        'db_host' => sanitizeInput($post['db_host'] ?? '127.0.0.1'),
        'db_charset' => sanitizeInput($post['db_charset'] ?? 'utf8'),
    ];
}

function writeLocalConfig(string $path, array $config): bool {
    $content = "<?php\nreturn " . var_export($config, true) . ";\n";
    $tmpPath = $path . '.tmp';
    $bytes = @file_put_contents($tmpPath, $content, LOCK_EX);
    if ($bytes === false) return false;
    return @rename($tmpPath, $path);
}

$configPath = resolveTermikaLocalConfigPath();

$current = readLocalConfig($configPath);
$message = '';
$messageType = 'info';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = (string)($_POST['csrf'] ?? '');
    if (!hash_equals($csrf, $token)) {
        $message = 'Neplatny CSRF token. Obnov stranku a skus znova.';
        $messageType = 'error';
    } else {
        $newConfig = buildConfigFromPost($_POST);
        if (writeLocalConfig($configPath, $newConfig)) {
            $current = $newConfig;
            $message = 'Nastavenie ulozene. Aplikacia bude pouzivat ' . basename($configPath) . '.';
            $messageType = 'success';
        } else {
            $message = 'Nepodarilo sa zapisat ' . basename($configPath) . '. Skontroluj prava zapisu na cielovy adresar.';
            $messageType = 'error';
        }
    }
}

function e(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

$configDir = dirname($configPath);
$assetWritable = is_dir($configDir) && is_writable($configDir);
$configExists = is_file($configPath);
$exampleExists = is_file($examplePath);
?>
<!doctype html>
<html lang="sk">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>TermikaXC Setup</title>
    <style>
        body { margin:0; font-family: system-ui, sans-serif; background:#0b1218; color:#e9f4ff; }
        .wrap { max-width: 860px; margin: 20px auto; padding: 16px; }
        .card { background:#12202a; border:1px solid #2f4c5f; border-radius:12px; padding:16px; margin-bottom:12px; }
        h1 { margin:0 0 10px; font-size: 26px; }
        p { margin:8px 0; color:#c8d8e5; }
        .grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
        label { display:block; font-size:13px; color:#9bc6e0; margin-bottom:4px; }
        input { width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #34586d; background:#0d1a23; color:#fff; }
        .full { grid-column: 1 / -1; }
        button { padding:10px 14px; border-radius:8px; border:1px solid #4e7a93; background:#153446; color:#fff; cursor:pointer; }
        .status { padding:10px; border-radius:8px; margin:8px 0; }
        .ok { background:#133924; border:1px solid #2f9f56; }
        .err { background:#401b1b; border:1px solid #c35a5a; }
        .info { background:#1f2e3a; border:1px solid #4a6b82; }
        .meta { font-size:13px; color:#a4bfd1; }
        .cc-page-nav { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
        .cc-page-nav a { padding:8px 10px; border:1px solid #4e7a93; border-radius:8px; background:#0d1a23; color:#dff8ff; text-decoration:none; }
        .cc-page-nav a:hover { border-color:#35d8ff; }
        @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
<div class="wrap">
    <div class="card">
        <nav class="cc-page-nav" aria-label="Navigácia TermikaXC">
            <a href="index.php">3D pracovisko</a>
            <a href="terrain-analysis-test.php">Test terénu</a>
            <a href="explorer-core.php">Prieskumník</a>
        </nav>
        <h1>TermikaXC setup bez terminalu</h1>
        <p>Vypln hodnoty a uloz. Toto je urcene pre hostovanie, kde nechces riesit serverove env premenne.</p>
        <p class="meta">Subor: <?php echo e($configPath); ?> | Existuje: <?php echo $configExists ? 'ano' : 'nie'; ?> | Priecinok zapisovatelny: <?php echo $assetWritable ? 'ano' : 'nie'; ?> | Example subor: <?php echo $exampleExists ? 'ano' : 'nie'; ?></p>
        <?php if ($message !== ''): ?>
            <div class="status <?php echo $messageType === 'success' ? 'ok' : ($messageType === 'error' ? 'err' : 'info'); ?>"><?php echo e($message); ?></div>
        <?php endif; ?>
    </div>

    <form method="post" class="card">
        <input type="hidden" name="csrf" value="<?php echo e($csrf); ?>">
        <div class="grid">
            <div class="full">
                <label>CESIUM_ACCESS_TOKEN</label>
                <input type="text" name="cesium_access_token" value="<?php echo e((string)($current['cesium_access_token'] ?? '')); ?>" placeholder="Cesium token">
            </div>
            <div class="full">
                <label>WINDY_API_KEY</label>
                <input type="text" name="windy_api_key" value="<?php echo e((string)($current['windy_api_key'] ?? '')); ?>" placeholder="Windy Point Forecast key">
            </div>
            <div class="full">
                <label>WINDY_MAP_KEY</label>
                <input type="text" name="windy_map_key" value="<?php echo e((string)($current['windy_map_key'] ?? '')); ?>" placeholder="Windy Map Forecast key">
            </div>
            <div>
                <label>WINDY_WEBCAMS_KEY</label>
                <input type="text" name="windy_webcams_key" value="<?php echo e((string)($current['windy_webcams_key'] ?? '')); ?>" placeholder="Volitelne">
            </div>
            <div>
                <label>WINDY_PLUGINS_KEY</label>
                <input type="text" name="windy_plugins_key" value="<?php echo e((string)($current['windy_plugins_key'] ?? '')); ?>" placeholder="Volitelne">
            </div>
            <div>
                <label>TELEGRAM_BOT_TOKEN</label>
                <input type="text" name="telegram_bot_token" value="<?php echo e((string)($current['telegram_bot_token'] ?? '')); ?>" placeholder="Volitelne">
            </div>
            <div>
                <label>TELEGRAM_CHAT_ID</label>
                <input type="text" name="telegram_chat_id" value="<?php echo e((string)($current['telegram_chat_id'] ?? '')); ?>" placeholder="Volitelne">
            </div>
            <div class="full">
                <label>UPDATE_SHARED_KEY</label>
                <input type="text" name="update_shared_key" value="<?php echo e((string)($current['update_shared_key'] ?? '')); ?>" placeholder="Volitelne, odporucane pre update.php">
            </div>
            <div>
                <label>DB_NAME</label>
                <input type="text" name="db_name" value="<?php echo e((string)($current['db_name'] ?? '')); ?>" placeholder="Volitelne">
            </div>
            <div>
                <label>DB_USER</label>
                <input type="text" name="db_user" value="<?php echo e((string)($current['db_user'] ?? '')); ?>" placeholder="Volitelne">
            </div>
            <div>
                <label>DB_PASSWORD</label>
                <input type="text" name="db_password" value="<?php echo e((string)($current['db_password'] ?? '')); ?>" placeholder="Volitelne">
            </div>
            <div>
                <label>DB_HOST</label>
                <input type="text" name="db_host" value="<?php echo e((string)($current['db_host'] ?? '127.0.0.1')); ?>">
            </div>
            <div>
                <label>DB_CHARSET</label>
                <input type="text" name="db_charset" value="<?php echo e((string)($current['db_charset'] ?? 'utf8')); ?>">
            </div>
        </div>
        <p style="margin-top:12px;"><button type="submit">Ulozit nastavenie</button></p>
    </form>

    <div class="card">
        <p><strong>Ďalej:</strong> po uložení sa vráť do 3D pracoviska, testu terénu alebo Prieskumníka cez navigáciu vyššie.</p>
        <p>Ak pouzijes UPDATE_SHARED_KEY, klient musi posielat HTTP header <code>X-Termika-Key</code>.</p>
    </div>
</div>
<?php if ($messageType === 'success'): ?>
<script>
(function () {
    const fallbackUrl = 'index.php';
    let targetUrl = fallbackUrl;

    try {
        const openerHref = window.opener && !window.opener.closed
            ? String(window.opener.location.href || '')
            : '';
        const referrerHref = String(document.referrer || '');

        const pick = (href) => {
            if (!href) return '';
            const u = new URL(href, window.location.href);
            if (u.origin !== window.location.origin) return '';
            if (/\/setup\.php$/i.test(u.pathname)) return '';
            return u.href;
        };

        targetUrl = pick(openerHref) || pick(referrerHref) || fallbackUrl;
    } catch (_) {
        targetUrl = fallbackUrl;
    }

    if (window.opener && !window.opener.closed) {
        try {
            window.opener.location.href = targetUrl;
        } catch (_) {
            // Ignore cross-window navigation errors.
        }
        window.close();

        // If the browser blocks window.close(), fallback to redirect in current tab.
        window.setTimeout(function () {
            if (!window.closed) {
                window.location.href = targetUrl;
            }
        }, 180);
        return;
    }

    window.location.href = targetUrl;
})();
</script>
<?php endif; ?>
</body>
</html>

<?php
declare(strict_types=1);

function termika_release_version(): string
{
    static $version = null;
    if (is_string($version)) {
        return $version;
    }

    $versionPath = __DIR__ . '/asset/RELEASE_VERSION.txt';
    $rawVersion = is_readable($versionPath) ? @file_get_contents($versionPath) : false;
    $candidate = is_string($rawVersion) ? trim($rawVersion) : '';

    if (preg_match('/^[0-9]+(?:\.[0-9]+){1,2}(?:[.-][A-Za-z0-9]+)?$/', $candidate) === 1) {
        $version = $candidate;
        return $version;
    }

    $mtime = is_file($versionPath) ? (int)@filemtime($versionPath) : time();
    $version = 'dev-' . $mtime;
    return $version;
}

function termika_asset_version(): string
{
    return termika_release_version();
}

function termika_send_no_store_headers(): void
{
    if (headers_sent()) {
        return;
    }

    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
}

function termika_browser_cache_reset_tag(): string
{
    $versionJson = json_encode(termika_release_version(), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    return <<<HTML
    <script>
    (function () {
        "use strict";
        var releaseVersion = {$versionJson};
        var storageKey = "termikaXC.release.version.v1";
        var previousVersion = null;

        try {
            previousVersion = window.localStorage.getItem(storageKey);
            window.localStorage.setItem(storageKey, releaseVersion);
        } catch (error) {
            previousVersion = null;
        }

        if (!previousVersion || previousVersion === releaseVersion) {
            return;
        }

        var jobs = [];
        if (window.caches && typeof window.caches.keys === "function") {
            jobs.push(window.caches.keys().then(function (keys) {
                return Promise.all(keys.map(function (key) {
                    return window.caches.delete(key);
                }));
            }));
        }

        if (navigator.serviceWorker && typeof navigator.serviceWorker.getRegistrations === "function") {
            jobs.push(navigator.serviceWorker.getRegistrations().then(function (registrations) {
                return Promise.all(registrations.map(function (registration) {
                    return registration.unregister();
                }));
            }));
        }

        Promise.allSettled(jobs).finally(function () {
            var reloadKey = "termikaXC.release.reload." + releaseVersion;
            try {
                if (window.sessionStorage.getItem(reloadKey) === "1") {
                    return;
                }
                window.sessionStorage.setItem(reloadKey, "1");
            } catch (error) {}

            var url = new URL(window.location.href);
            url.searchParams.set("termika_cache_bust", releaseVersion + "-" + Date.now());
            window.location.replace(url.toString());
        });
    }());
    </script>
HTML;
}

function termika_inject_browser_cache_reset(string $html): string
{
    if (strpos($html, 'termikaXC.release.version.v1') !== false) {
        return $html;
    }

    $tag = termika_browser_cache_reset_tag() . "\n";
    $headEnd = stripos($html, '</head>');
    if ($headEnd === false) {
        return $tag . $html;
    }

    return substr_replace($html, $tag, $headEnd, 0);
}

function termika_rewrite_local_asset_versions(string $html): string
{
    $assetVersion = rawurlencode(termika_asset_version());

    return (string)preg_replace_callback(
        '~\b(src|href)=("|\')((?:asset|js|ux)/[^"\'?]+\.(?:css|js))(?:\?v=[^"\']*)?(\2)~i',
        static function (array $matches) use ($assetVersion): string {
            return $matches[1] . '=' . $matches[2] . $matches[3] . '?v=' . $assetVersion . $matches[4];
        },
        $html
    );
}
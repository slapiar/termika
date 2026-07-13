// js/terrain-release-badge.js
// TermikaXC – zobrazenie aktuálnej release verzie v hlavičke testovacieho panela.

(function () {
    if (window.TermikaReleaseBadge) return;

    const VERSION = "1.0.1";
    const RELEASE_URL = "release-version.php";
    const RELEASE_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
    let currentRelease = null;

    const normalizeRelease = function (value) {
        const normalized = String(value || "").trim().replace(/^v/i, "");
        return RELEASE_PATTERN.test(normalized) ? normalized : null;
    };

    const applyRelease = function (release) {
        const normalized = normalizeRelease(release);
        if (!normalized) {
            throw new Error("Neplatný formát release verzie.");
        }

        currentRelease = normalized;
        const panelTitle = document.querySelector("#panel .window-title");
        if (panelTitle) {
            panelTitle.textContent = "TermikaXC v" + normalized + " · modulárna analýza terénu";
            panelTitle.title = "Načítaný release TermikaXC v" + normalized;
            panelTitle.dataset.releaseVersion = normalized;
        }

        document.title = "TermikaXC v" + normalized + " – Terrain Analysis";
        document.documentElement.dataset.termikaRelease = normalized;
        return true;
    };

    const load = async function () {
        try {
            const response = await fetch(RELEASE_URL + "?t=" + Date.now(), {
                cache: "no-store",
                headers: { "Accept": "text/plain" }
            });
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }

            const contentType = String(response.headers.get("content-type") || "").toLowerCase();
            if (contentType && !contentType.includes("text/plain")) {
                throw new Error("Očakávaný text/plain, prijaté " + contentType + ".");
            }

            const release = await response.text();
            return applyRelease(release);
        } catch (error) {
            console.warn("TermikaXC: nepodarilo sa načítať platný RELEASE_VERSION.", error);
            return false;
        }
    };

    window.TermikaReleaseBadge = {
        VERSION,
        RELEASE_URL,
        load,
        applyRelease,
        normalizeRelease,
        get release() { return currentRelease; }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", load, { once: true });
    } else {
        load();
    }
})();

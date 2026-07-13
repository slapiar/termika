// js/terrain-release-badge.js
// TermikaXC – zobrazenie aktuálnej release verzie v hlavičke testovacieho panela.

(function () {
    if (window.TermikaReleaseBadge) return;

    const VERSION = "1.0.0";
    const RELEASE_URL = "../RELEASE_VERSION";
    let currentRelease = null;

    const normalizeRelease = function (value) {
        return String(value || "")
            .trim()
            .replace(/^v/i, "")
            .replace(/[^0-9A-Za-z._-]/g, "");
    };

    const applyRelease = function (release) {
        const normalized = normalizeRelease(release);
        if (!normalized) return false;

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
            const response = await fetch(RELEASE_URL, {
                cache: "no-store",
                headers: { "Accept": "text/plain" }
            });
            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }
            const release = await response.text();
            return applyRelease(release);
        } catch (error) {
            console.warn("TermikaXC: nepodarilo sa načítať RELEASE_VERSION.", error);
            return false;
        }
    };

    window.TermikaReleaseBadge = {
        VERSION,
        RELEASE_URL,
        load,
        applyRelease,
        get release() { return currentRelease; }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", load, { once: true });
    } else {
        load();
    }
})();
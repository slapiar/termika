// TermikaXC UI – idempotent family/window stylesheet loader.
(function installTermikaStyleLoader(global) {
    "use strict";

    if (global.TermikaStyleLoader) return;

    const loaded = new Map();
    const familyAssets = Object.freeze({
        workbench: "asset/ui/bundles/workbench.bundle.css?v=1.0.0"
    });

    function ensureBodyFamily(family, defaultTheme) {
        const apply = function () {
            const body = document.body;
            if (!body) return;

            body.dataset.txFamily = String(family || "");
            if (!body.dataset.theme && defaultTheme) {
                body.dataset.theme = String(defaultTheme);
            }
        };

        if (document.body) {
            apply();
        } else {
            document.addEventListener("DOMContentLoaded", apply, { once: true });
        }
    }

    function load(id, href) {
        const styleId = String(id || "").trim();
        const styleHref = String(href || "").trim();
        if (!styleId || !styleHref) {
            return Promise.reject(new Error("TermikaStyleLoader: chýba id alebo href."));
        }

        if (loaded.has(styleId)) {
            return loaded.get(styleId);
        }

        const existing = document.querySelector(`link[data-tx-style="${CSS.escape(styleId)}"]`);
        if (existing) {
            const ready = Promise.resolve(existing);
            loaded.set(styleId, ready);
            return ready;
        }

        const ready = new Promise(function (resolve, reject) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = styleHref;
            link.dataset.txStyle = styleId;
            link.onload = function () { resolve(link); };
            link.onerror = function () {
                loaded.delete(styleId);
                link.remove();
                reject(new Error(`TermikaStyleLoader: CSS sa nepodarilo načítať: ${styleHref}`));
            };
            document.head.appendChild(link);
        });

        loaded.set(styleId, ready);
        return ready;
    }

    function loadFamily(family, options) {
        const familyId = String(family || "").trim();
        const asset = familyAssets[familyId];
        if (!asset) {
            return Promise.reject(new Error(`TermikaStyleLoader: neznáma rodina ${familyId}.`));
        }

        const settings = options || {};
        ensureBodyFamily(familyId, settings.defaultTheme || "");
        return load(`family:${familyId}`, asset);
    }

    function loadWindow(windowId, href) {
        return load(`window:${String(windowId || "").trim()}`, href);
    }

    global.TermikaStyleLoader = Object.freeze({
        VERSION: "1.0.0",
        load,
        loadFamily,
        loadWindow,
        ensureBodyFamily,
        isLoaded: function (id) { return loaded.has(String(id)); }
    });
})(window);

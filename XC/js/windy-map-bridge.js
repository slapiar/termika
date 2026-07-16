// js/windy-map-bridge.js
// TermikaXC - bootstrap helper that exposes a unified WindyMapBridge facade.

(function bootstrapTerrainWorkbenchUi() {
    function appendStylesheet(id, href, styleKey) {
        const existing = document.getElementById(id)
            || document.querySelector(`link[data-tx-style="${styleKey}"]`);
        if (existing) return existing;

        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = href;
        link.dataset.txStyle = styleKey;
        document.head.appendChild(link);
        return link;
    }

    function appendLoaderScript() {
        if (window.TermikaStyleLoader || document.getElementById("termika-style-loader")) return;

        const script = document.createElement("script");
        script.id = "termika-style-loader";
        script.src = "js/termika-style-loader.js?v=1.0.0";
        script.async = false;
        document.head.appendChild(script);
    }

    function activateWorkbench() {
        if (document.body) {
            document.body.dataset.txFamily = "workbench";
            if (!document.body.dataset.theme) {
                document.body.dataset.theme = "light";
            }
        }

        appendStylesheet(
            "termika-workbench-bundle",
            "asset/ui/bundles/workbench.bundle.css?v=1.0.0",
            "family:workbench"
        );

        appendStylesheet(
            "termika-terrain-analysis-compat",
            "asset/ui/pages/terrain-analysis.compat.css?v=1.0.0",
            "page:terrain-analysis-compat"
        );
    }

    appendLoaderScript();

    // terrain-analysis-test.php obsahuje starší vnútorný <style>.
    // Workbench a dočasnú kompatibilnú vrstvu preto pripájame po vytvorení HTML,
    // aby spoločný dizajnový kontrakt vyhral v kaskáde bez zásahu do geometrie.
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", activateWorkbench, { once: true });
    } else {
        activateWorkbench();
    }
})();

window.WindyMapBridgeBootstrap = {
    VERSION: "0.2.0-bootstrap",
    detectIntervalMs: 1500,
    timerId: null,
    activeBridgeName: "",
    installedBridgeRef: null,

    createLeafletBridge: function (map, name) {
        return {
            name: String(name || "leaflet-map"),
            getFocus: function () {
                const center = map.getCenter();
                return {
                    lat: Number(center?.lat),
                    lon: Number(center?.lng),
                    zoom: Number(map.getZoom()),
                    source: String(name || "leaflet-map")
                };
            },
            setFocus: function (focusPayload) {
                const lat = Number(focusPayload?.lat ?? focusPayload?.center?.lat);
                const lon = Number(focusPayload?.lon ?? focusPayload?.lng ?? focusPayload?.center?.lon ?? focusPayload?.center?.lng);
                const zoom = Number(focusPayload?.zoom);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;

                if (Number.isFinite(zoom)) {
                    map.setView([lat, lon], zoom);
                    return true;
                }

                map.panTo([lat, lon]);
                return true;
            },
            subscribeFocus: function (onFocus) {
                if (typeof map.on !== "function" || typeof map.off !== "function") {
                    return function () {};
                }

                const handler = function () {
                    const center = map.getCenter();
                    onFocus({
                        lat: Number(center?.lat),
                        lon: Number(center?.lng),
                        zoom: Number(map.getZoom()),
                        source: String(name || "leaflet-map") + "-moveend"
                    });
                };

                map.on("moveend", handler);
                return function () {
                    map.off("moveend", handler);
                };
            }
        };
    },

    detectBridge: function () {
        if (window.WindyMapBridge && typeof window.WindyMapBridge.getFocus === "function") {
            return {
                bridge: window.WindyMapBridge,
                name: String(window.WindyMapBridge.name || "window.WindyMapBridge")
            };
        }

        if (window.windyAPI?.map && typeof window.windyAPI.map.getCenter === "function") {
            return {
                bridge: this.createLeafletBridge(window.windyAPI.map, "windyAPI.map"),
                name: "windyAPI.map"
            };
        }

        if (window.windyMap && typeof window.windyMap.getCenter === "function") {
            return {
                bridge: this.createLeafletBridge(window.windyMap, "windyMap"),
                name: "windyMap"
            };
        }

        return null;
    },

    publishReady: function (name) {
        const payload = {
            name: String(name || "unknown"),
            timestampIso: new Date().toISOString()
        };

        if (window.TermikaCommunicationTool?.emit) {
            window.TermikaCommunicationTool.emit("windy-map-bridge:ready", payload);
        }

        if (typeof window.dispatchEvent === "function" && typeof window.CustomEvent === "function") {
            window.dispatchEvent(new CustomEvent("windy-map-bridge:ready", { detail: payload }));
        }
    },

    installDetectedBridge: function () {
        const detected = this.detectBridge();
        if (!detected || !detected.bridge) return false;

        window.WindyMapBridge = detected.bridge;
        this.installedBridgeRef = detected.bridge;
        if (this.activeBridgeName !== detected.name) {
            this.activeBridgeName = detected.name;
            this.publishReady(detected.name);
        }
        return true;
    },

    stopAutoDetect: function () {
        if (!this.timerId) return false;
        clearInterval(this.timerId);
        this.timerId = null;
        return true;
    },

    startAutoDetect: function () {
        if (this.installDetectedBridge()) {
            return true;
        }

        if (this.timerId) return false;
        const self = this;
        this.timerId = setInterval(function () {
            if (self.installDetectedBridge()) {
                clearInterval(self.timerId);
                self.timerId = null;
            }
        }, this.detectIntervalMs);
        return false;
    },

    destroy: function () {
        this.stopAutoDetect();
        if (window.WindyMapBridge && this.installedBridgeRef && window.WindyMapBridge === this.installedBridgeRef) {
            try {
                delete window.WindyMapBridge;
            } catch (_) {
                window.WindyMapBridge = null;
            }
        }
        this.installedBridgeRef = null;
        this.activeBridgeName = "";
        return true;
    }
};

window.WindyMapBridgeBootstrap.startAutoDetect();

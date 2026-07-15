// js/windy-map-bridge.js
// TermikaXC - bootstrap helper that exposes a unified WindyMapBridge facade.

window.WindyMapBridgeBootstrap = {
    VERSION: "0.1.0-bootstrap",
    detectIntervalMs: 1500,
    timerId: null,
    activeBridgeName: "",

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
        if (this.activeBridgeName !== detected.name) {
            this.activeBridgeName = detected.name;
            this.publishReady(detected.name);
        }
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
    }
};

window.WindyMapBridgeBootstrap.startAutoDetect();

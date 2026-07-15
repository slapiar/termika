// js/windy-map-adapter.js
// TermikaXC - adapter skeleton for Windy Map integration through TermikaCommunicationTool.

window.WindyMapAdapterTool = {
    VERSION: "0.2.0-bridge-status",

    heartbeatIntervalMs: 8000,

    state: {
        enabled: false,
        lastFocus: null,
        registered: false,
        bridgeName: "",
        status: "offline",
        statusMessage: "Windy bridge is not connected.",
        lastStatusAtIso: null,
        unsubscribeFocus: null,
        heartbeatTimerId: null,
        lastError: null
    },

    bridge: null,

    publishStatus: function (status, message, extra = {}) {
        const nowIso = new Date().toISOString();
        this.state.status = String(status || "offline");
        this.state.statusMessage = String(message || "");
        this.state.lastStatusAtIso = nowIso;
        if (extra.error) {
            this.state.lastError = String(extra.error?.message || extra.error);
        }

        if (window.TermikaCommunicationTool?.emit) {
            window.TermikaCommunicationTool.emit("windy-map-adapter:status", {
                status: this.state.status,
                message: this.state.statusMessage,
                bridgeName: this.state.bridgeName,
                enabled: this.state.enabled,
                updatedAtIso: nowIso,
                lastError: this.state.lastError,
                ...extra
            });
        }
    },

    normalizeFocusPayload: function (focusPayload) {
        if (!focusPayload || typeof focusPayload !== "object") {
            return null;
        }

        const rawLat = focusPayload.lat ?? focusPayload.latitude ?? focusPayload?.center?.lat;
        const rawLon = focusPayload.lon ?? focusPayload.lng ?? focusPayload.longitude ?? focusPayload?.center?.lon ?? focusPayload?.center?.lng;
        const rawZoom = focusPayload.zoom ?? focusPayload?.view?.zoom ?? focusPayload?.camera?.zoom;

        const lat = Number(rawLat);
        const lon = Number(rawLon);
        const zoom = Number(rawZoom);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return null;
        }

        return {
            lat,
            lon,
            zoom: Number.isFinite(zoom) ? zoom : 9,
            source: String(focusPayload.source || "windy-map-adapter"),
            timestampIso: new Date().toISOString()
        };
    },

    setFocus: function (focusPayload) {
        const normalized = this.normalizeFocusPayload(focusPayload);
        if (!normalized) {
            throw new Error("WindyMapAdapterTool.setFocus expects numeric lat/lon.");
        }

        this.state.lastFocus = normalized;

        if (window.TermikaCommunicationTool?.emit) {
            window.TermikaCommunicationTool.emit("windy-map-adapter:focus", {
                focus: { ...this.state.lastFocus },
                bridgeName: this.state.bridgeName,
                updatedAtIso: this.state.lastFocus.timestampIso
            });
        }

        return this.state.lastFocus;
    },

    getFocus: function () {
        return this.state.lastFocus ? { ...this.state.lastFocus } : null;
    },

    isAvailable: function () {
        return this.state.enabled === true && this.state.status === "ready";
    },

    getStatus: function () {
        return {
            enabled: this.state.enabled,
            status: this.state.status,
            message: this.state.statusMessage,
            bridgeName: this.state.bridgeName,
            lastStatusAtIso: this.state.lastStatusAtIso,
            heartbeatIntervalMs: this.heartbeatIntervalMs,
            lastError: this.state.lastError
        };
    },

    stopHeartbeat: function () {
        if (!this.state.heartbeatTimerId) return;
        clearInterval(this.state.heartbeatTimerId);
        this.state.heartbeatTimerId = null;
    },

    startHeartbeat: function () {
        this.stopHeartbeat();
        const self = this;
        this.state.heartbeatTimerId = setInterval(function () {
            if (!self.state.enabled || self.state.status !== "ready") return;

            if (self.bridge && typeof self.bridge.getFocus === "function") {
                try {
                    const fromBridge = self.normalizeFocusPayload(self.bridge.getFocus());
                    if (fromBridge) {
                        self.state.lastFocus = fromBridge;
                    }
                } catch (_) {
                    // Ignore heartbeat focus refresh errors.
                }
            }

            self.publishStatus("ready", "Windy bridge heartbeat.", {
                bridgeName: self.state.bridgeName,
                heartbeat: true
            });
        }, this.heartbeatIntervalMs);
    },

    disconnectBridge: function () {
        this.stopHeartbeat();
        if (typeof this.state.unsubscribeFocus === "function") {
            try {
                this.state.unsubscribeFocus();
            } catch (_) {
                // ignore bridge unsubscribe errors
            }
        }
        this.state.unsubscribeFocus = null;
        this.bridge = null;
        this.state.bridgeName = "";
    },

    buildLeafletBridge: function (map, name = "leaflet-map") {
        if (!map || typeof map.getCenter !== "function" || typeof map.getZoom !== "function") {
            return null;
        }

        return {
            name: name,
            getFocus: function () {
                const center = map.getCenter();
                return {
                    lat: Number(center?.lat),
                    lon: Number(center?.lng),
                    zoom: Number(map.getZoom())
                };
            },
            setFocus: function (focus) {
                const normalized = window.WindyMapAdapterTool.normalizeFocusPayload(focus);
                if (!normalized) return false;
                map.setView([normalized.lat, normalized.lon], normalized.zoom);
                return true;
            },
            subscribeFocus: function (onFocus) {
                if (typeof map.on !== "function" || typeof map.off !== "function") {
                    return function () {};
                }

                const handler = function () {
                    onFocus({
                        lat: Number(map.getCenter()?.lat),
                        lon: Number(map.getCenter()?.lng),
                        zoom: Number(map.getZoom()),
                        source: "leaflet-moveend"
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
        if (window.WindyMapBridge && typeof window.WindyMapBridge === "object") {
            const candidate = window.WindyMapBridge;
            if (typeof candidate.getFocus === "function") {
                return {
                    name: String(candidate.name || "windy-map-bridge"),
                    getFocus: candidate.getFocus.bind(candidate),
                    setFocus: typeof candidate.setFocus === "function" ? candidate.setFocus.bind(candidate) : null,
                    subscribeFocus: typeof candidate.subscribeFocus === "function" ? candidate.subscribeFocus.bind(candidate) : null
                };
            }
        }

        if (window.windyAPI?.map) {
            const bridge = this.buildLeafletBridge(window.windyAPI.map, "windyAPI.map");
            if (bridge) return bridge;
        }

        if (window.windyMap && typeof window.windyMap.getCenter === "function") {
            const bridge = this.buildLeafletBridge(window.windyMap, "windyMap");
            if (bridge) return bridge;
        }

        return null;
    },

    connectBridge: function (bridge) {
        if (!bridge || typeof bridge.getFocus !== "function") {
            throw new Error("Windy bridge is invalid or missing getFocus().");
        }

        this.disconnectBridge();
        this.bridge = bridge;
        this.state.bridgeName = String(bridge.name || "windy-bridge");

        const self = this;
        if (typeof bridge.subscribeFocus === "function") {
            this.state.unsubscribeFocus = bridge.subscribeFocus(function (focusPayload) {
                try {
                    const focus = self.setFocus({ ...focusPayload, source: focusPayload?.source || self.state.bridgeName });
                    window.TermikaCommunicationTool?.send("windy-focus", focus, {
                        adapterId: "local-event-bus",
                        meta: { origin: self.state.bridgeName }
                    }).catch(function () {
                        // Ignore dispatch errors from async send.
                    });
                } catch (error) {
                    self.publishStatus("error", "Windy focus callback failed.", { error: error });
                }
            });
        }

        try {
            const focus = this.normalizeFocusPayload(bridge.getFocus());
            if (focus) {
                this.state.lastFocus = focus;
            }
        } catch (_) {
            // initial focus is optional
        }

        this.startHeartbeat();
        this.publishStatus("ready", "Windy bridge connected.", { bridgeName: this.state.bridgeName });
        return true;
    },

    tryAutoConnect: function () {
        const bridge = this.detectBridge();
        if (!bridge) {
            this.publishStatus("offline", "Windy bridge not found.");
            return false;
        }

        try {
            this.connectBridge(bridge);
            return true;
        } catch (error) {
            this.publishStatus("error", "Windy bridge connection failed.", { error: error });
            return false;
        }
    },

    register: function () {
        if (this.state.registered) return true;
        if (!window.TermikaCommunicationTool) return false;

        const self = this;
        window.TermikaCommunicationTool.registerAdapter({
            id: "windy-map",
            title: "Windy Map Adapter",
            isAvailable: function () {
                return self.isAvailable();
            },
            send: function (channel, payload) {
                if (channel === "windy-focus") {
                    const focus = self.setFocus(payload);
                    if (self.bridge && typeof self.bridge.setFocus === "function") {
                        try {
                            self.bridge.setFocus(focus);
                        } catch (error) {
                            self.publishStatus("error", "Failed to apply focus to Windy bridge.", { error: error });
                        }
                    }
                    return focus;
                }
                return {
                    ignored: true,
                    reason: "Unsupported channel",
                    channel: channel
                };
            },
            request: function (channel) {
                if (channel === "windy-focus:get") {
                    if (self.bridge && typeof self.bridge.getFocus === "function") {
                        try {
                            const fromBridge = self.normalizeFocusPayload(self.bridge.getFocus());
                            if (fromBridge) {
                                self.state.lastFocus = fromBridge;
                            }
                        } catch (_) {
                            // keep last cached focus
                        }
                    }
                    return self.getFocus();
                }
                if (channel === "windy-map:status") {
                    return self.getStatus();
                }
                return {
                    ignored: true,
                    reason: "Unsupported request channel",
                    channel: channel
                };
            }
        });

        this.state.registered = true;
        return true;
    },

    enable: function () {
        this.state.enabled = true;
        this.register();
        this.tryAutoConnect();
        if (this.state.status !== "ready") {
            this.publishStatus("offline", "Adapter enabled, waiting for Windy bridge.");
        }
        return this.state.enabled;
    },

    disable: function () {
        this.state.enabled = false;
        this.disconnectBridge();
        this.publishStatus("offline", "Adapter disabled.");
        return this.state.enabled;
    }
};

window.WindyMapAdapterTool.register();
window.WindyMapAdapterTool.publishStatus("offline", "Adapter initialized (disabled).");

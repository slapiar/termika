// js/tool-communication.js
// TermikaXC - universal communication tool for integrations and tool-to-tool messaging.

window.TermikaCommunicationTool = {
    VERSION: "1.0.0",

    adapters: new Map(),
    handlers: new Map(),
    channelValidators: new Map(),
    defaultTimeoutMs: 10000,
    correlationCounter: 0,

    registerAdapter: function (definition) {
        if (!definition || typeof definition !== "object") {
            throw new Error("Adapter definition must be an object.");
        }

        const id = String(definition.id || "").trim();
        if (!id) {
            throw new Error("Adapter must have a non-empty id.");
        }
        if (typeof definition.send !== "function") {
            throw new Error("Adapter " + id + " must provide send(channel, payload, context).");
        }

        this.adapters.set(id, {
            id,
            title: String(definition.title || id),
            send: definition.send,
            request: typeof definition.request === "function" ? definition.request : null,
            isAvailable: typeof definition.isAvailable === "function"
                ? definition.isAvailable
                : function () { return true; }
        });

        this.emit("adapter:registered", { id: id });
        return this.adapters.get(id);
    },

    unregisterAdapter: function (id) {
        const normalized = String(id || "").trim();
        if (!normalized) return false;
        const removed = this.adapters.delete(normalized);
        if (removed) {
            this.emit("adapter:unregistered", { id: normalized });
        }
        return removed;
    },

    listAdapters: function () {
        return Array.from(this.adapters.values()).map((adapter) => ({
            id: adapter.id,
            title: adapter.title,
            available: Boolean(adapter.isAvailable())
        }));
    },

    nextCorrelationId: function (prefix = "comm") {
        this.correlationCounter += 1;
        return prefix + "-" + Date.now().toString(36) + "-" + this.correlationCounter.toString(36);
    },

    registerChannelValidator: function (channel, validator) {
        const normalizedChannel = String(channel || "").trim();
        if (!normalizedChannel) {
            throw new Error("Channel validator requires a non-empty channel.");
        }
        if (typeof validator !== "function") {
            throw new Error("Channel validator must be a function.");
        }

        this.channelValidators.set(normalizedChannel, validator);
        this.emit("validator:registered", { channel: normalizedChannel });
        return true;
    },

    unregisterChannelValidator: function (channel) {
        const normalizedChannel = String(channel || "").trim();
        if (!normalizedChannel) return false;
        const removed = this.channelValidators.delete(normalizedChannel);
        if (removed) {
            this.emit("validator:unregistered", { channel: normalizedChannel });
        }
        return removed;
    },

    validateChannelPayload: function (channel, payload) {
        const normalizedChannel = String(channel || "").trim();
        const validator = this.channelValidators.get(normalizedChannel);
        if (typeof validator !== "function") {
            return payload;
        }

        const result = validator(payload);
        if (result === true || result === undefined || result === null) {
            return payload;
        }
        if (result === false) {
            throw new Error("Payload validation failed for channel: " + normalizedChannel);
        }
        if (typeof result === "object") {
            if (result.ok === false) {
                throw new Error(String(result.reason || ("Payload validation failed for channel: " + normalizedChannel)));
            }
            if (result.payload !== undefined) {
                return result.payload;
            }
            return payload;
        }

        throw new Error("Invalid validator return for channel: " + normalizedChannel);
    },

    on: function (eventName, handler) {
        const name = String(eventName || "").trim();
        if (!name) {
            throw new Error("Event name must not be empty.");
        }
        if (typeof handler !== "function") {
            throw new Error("Event handler must be a function.");
        }

        if (!this.handlers.has(name)) {
            this.handlers.set(name, new Set());
        }
        this.handlers.get(name).add(handler);

        return () => this.off(name, handler);
    },

    off: function (eventName, handler) {
        const name = String(eventName || "").trim();
        if (!name || !this.handlers.has(name)) return false;
        const bucket = this.handlers.get(name);
        const removed = bucket.delete(handler);
        if (!bucket.size) {
            this.handlers.delete(name);
        }
        return removed;
    },

    emit: function (eventName, payload) {
        const name = String(eventName || "").trim();
        if (!name) return;
        const bucket = this.handlers.get(name);
        if (!bucket || !bucket.size) return;

        bucket.forEach((handler) => {
            try {
                handler(payload);
            } catch (error) {
                console.error("[TermikaCommunicationTool] Event handler failed:", name, error);
            }
        });
    },

    pickAdapter: function (adapterId) {
        const requested = String(adapterId || "").trim();
        if (requested) {
            const explicit = this.adapters.get(requested);
            if (!explicit) {
                throw new Error("Adapter not found: " + requested);
            }
            if (!explicit.isAvailable()) {
                throw new Error("Adapter is not available: " + requested);
            }
            return explicit;
        }

        const firstAvailable = Array.from(this.adapters.values()).find((adapter) => {
            try {
                return adapter.isAvailable();
            } catch (_) {
                return false;
            }
        });

        if (!firstAvailable) {
            throw new Error("No available communication adapter.");
        }
        return firstAvailable;
    },

    timeoutPromise: function (timeoutMs, label) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Timeout after " + timeoutMs + " ms: " + label)), timeoutMs);
        });
    },

    send: async function (channel, payload, options = {}) {
        const normalizedChannel = String(channel || "").trim();
        if (!normalizedChannel) {
            throw new Error("Channel must not be empty.");
        }

        const safePayload = this.validateChannelPayload(normalizedChannel, payload);

        const adapter = this.pickAdapter(options.adapterId);
        const timeoutMs = Number.isFinite(Number(options.timeoutMs))
            ? Math.max(1, Number(options.timeoutMs))
            : this.defaultTimeoutMs;

        const context = {
            channel: normalizedChannel,
            adapterId: adapter.id,
            sentAt: new Date().toISOString(),
            correlationId: String(options.correlationId || this.nextCorrelationId("send")),
            meta: options.meta && typeof options.meta === "object" ? options.meta : {}
        };

        this.emit("send:start", { context: context, payload: safePayload });

        const operation = Promise.resolve(adapter.send(normalizedChannel, safePayload, context));
        const result = await Promise.race([
            operation,
            this.timeoutPromise(timeoutMs, "send:" + normalizedChannel)
        ]);

        const response = {
            ok: true,
            adapterId: adapter.id,
            channel: normalizedChannel,
            data: result,
            receivedAt: new Date().toISOString()
        };

        this.emit("send:success", response);
        return response;
    },

    request: async function (channel, payload, options = {}) {
        const normalizedChannel = String(channel || "").trim();
        if (!normalizedChannel) {
            throw new Error("Channel must not be empty.");
        }

        const safePayload = this.validateChannelPayload(normalizedChannel, payload);

        const adapter = this.pickAdapter(options.adapterId);
        if (typeof adapter.request !== "function") {
            throw new Error("Adapter " + adapter.id + " does not support request().");
        }

        const timeoutMs = Number.isFinite(Number(options.timeoutMs))
            ? Math.max(1, Number(options.timeoutMs))
            : this.defaultTimeoutMs;

        const context = {
            channel: normalizedChannel,
            adapterId: adapter.id,
            sentAt: new Date().toISOString(),
            correlationId: String(options.correlationId || this.nextCorrelationId("request")),
            meta: options.meta && typeof options.meta === "object" ? options.meta : {}
        };

        this.emit("request:start", { context: context, payload: safePayload });

        const operation = Promise.resolve(adapter.request(normalizedChannel, safePayload, context));
        const result = await Promise.race([
            operation,
            this.timeoutPromise(timeoutMs, "request:" + normalizedChannel)
        ]);

        const response = {
            ok: true,
            adapterId: adapter.id,
            channel: normalizedChannel,
            data: result,
            receivedAt: new Date().toISOString()
        };

        this.emit("request:success", response);
        return response;
    },

    runSmokeTest: async function (options = {}) {
        const nowIso = new Date().toISOString();
        const sampleFocus = {
            lat: Number(options.lat ?? 48.7342),
            lon: Number(options.lon ?? 19.1481),
            zoom: Number(options.zoom ?? 9),
            source: String(options.source || "smoke-test"),
            timestampIso: nowIso
        };

        const report = {
            startedAtIso: nowIso,
            adapters: this.listAdapters(),
            send: null,
            request: null,
            windyStatus: null,
            ok: false,
            errors: []
        };

        try {
            report.send = await this.send("windy-focus", sampleFocus, {
                adapterId: String(options.sendAdapterId || "local-event-bus"),
                timeoutMs: Number(options.timeoutMs || 2000),
                meta: { smoke: true }
            });
        } catch (error) {
            report.errors.push("send failed: " + String(error?.message || error));
        }

        try {
            report.request = await this.request("windy-focus:get", {}, {
                adapterId: String(options.requestAdapterId || "windy-map"),
                timeoutMs: Number(options.timeoutMs || 2000),
                meta: { smoke: true }
            });
        } catch (error) {
            report.errors.push("request failed: " + String(error?.message || error));
        }

        try {
            report.windyStatus = await this.request("windy-map:status", {}, {
                adapterId: "windy-map",
                timeoutMs: Number(options.timeoutMs || 2000),
                meta: { smoke: true }
            });
        } catch (error) {
            report.errors.push("windy status failed: " + String(error?.message || error));
        }

        report.ok = report.errors.length === 0;
        report.finishedAtIso = new Date().toISOString();
        this.emit("smoke:finished", report);
        return report;
    }
};

window.TermikaCommunicationTool.registerChannelValidator("windy-focus", function (payload) {
    if (!payload || typeof payload !== "object") {
        return { ok: false, reason: "windy-focus payload must be an object." };
    }

    const lat = Number(payload.lat ?? payload.latitude ?? payload?.center?.lat);
    const lon = Number(payload.lon ?? payload.lng ?? payload.longitude ?? payload?.center?.lon ?? payload?.center?.lng);
    const zoomRaw = payload.zoom ?? payload?.view?.zoom ?? payload?.camera?.zoom;
    const zoom = Number(zoomRaw);
    const source = String(payload.source || "unknown").trim();
    const timestampIso = String(payload.timestampIso || new Date().toISOString());
    const timestampMs = Date.parse(timestampIso);

    if (!Number.isFinite(lat) || Math.abs(lat) > 90) {
        return { ok: false, reason: "windy-focus.lat must be finite in range <-90,90>." };
    }
    if (!Number.isFinite(lon) || Math.abs(lon) > 180) {
        return { ok: false, reason: "windy-focus.lon must be finite in range <-180,180>." };
    }
    if (zoomRaw !== undefined && (!Number.isFinite(zoom) || zoom < 1 || zoom > 24)) {
        return { ok: false, reason: "windy-focus.zoom must be finite in range <1,24>." };
    }
    if (!source) {
        return { ok: false, reason: "windy-focus.source must not be empty." };
    }

    return {
        ok: true,
        payload: {
            ...payload,
            lat: Number(lat.toFixed(6)),
            lon: Number(lon.toFixed(6)),
            zoom: Number.isFinite(zoom) ? zoom : 9,
            source,
            timestampIso: Number.isNaN(timestampMs) ? new Date().toISOString() : new Date(timestampMs).toISOString()
        }
    };
});

// Built-in local adapter for internal tool-to-tool messaging.
window.TermikaCommunicationTool.registerAdapter({
    id: "local-event-bus",
    title: "Local Event Bus",
    send: function (channel, payload, context) {
        window.TermikaCommunicationTool.emit("channel:" + channel, {
            payload: payload,
            context: context
        });
        return { delivered: true };
    },
    request: function (channel, payload, context) {
        window.TermikaCommunicationTool.emit("channel:request:" + channel, {
            payload: payload,
            context: context
        });
        return { accepted: true };
    }
});

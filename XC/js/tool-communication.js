// js/tool-communication.js
// TermikaXC - universal communication tool for integrations and tool-to-tool messaging.

window.TermikaCommunicationTool = {
    VERSION: "1.0.0",

    adapters: new Map(),
    handlers: new Map(),
    defaultTimeoutMs: 10000,

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

        const adapter = this.pickAdapter(options.adapterId);
        const timeoutMs = Number.isFinite(Number(options.timeoutMs))
            ? Math.max(1, Number(options.timeoutMs))
            : this.defaultTimeoutMs;

        const context = {
            channel: normalizedChannel,
            adapterId: adapter.id,
            sentAt: new Date().toISOString(),
            meta: options.meta && typeof options.meta === "object" ? options.meta : {}
        };

        this.emit("send:start", { context: context, payload: payload });

        const operation = Promise.resolve(adapter.send(normalizedChannel, payload, context));
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
            meta: options.meta && typeof options.meta === "object" ? options.meta : {}
        };

        this.emit("request:start", { context: context, payload: payload });

        const operation = Promise.resolve(adapter.request(normalizedChannel, payload, context));
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
    }
};

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

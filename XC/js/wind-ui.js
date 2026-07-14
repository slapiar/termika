// js/wind-ui.js
// TermikaXC v2.6 - WIND MVP UI helper.
// No automatic integration with existing pages; call init() manually when needed.

window.WindUI = {
    VERSION: "2.6.9-wind-mvp.1",

    state: {
        enabled: false,
        lastField: null,
        lastRenderStats: null
    },

    defaultSettings: {
        aglM: 30,
        radiusM: 1200,
        spacingM: 120,
        baseSpeedMs: 4.5,
        baseDirDeg: 230,
        useTempProfileWind: true,
        tempSourceMode: "auto",
        tempSourceUrl: "XCtrack/temp.json",
        windyTempUrl: "",
        windyTempUrlTemplate: "",
        stationTempUrl: "",
        stationIndexUrl: "",
        stationProfileUrlTemplate: "",
        colorMode: "tempDeltaK",
        colorTheme: "dark",
        animationEnabled: false,
        activeEffects: null,
        source: "ODVODENE"
    },

    init: function (options = {}) {
        this.settings = { ...this.defaultSettings, ...options };
        this.state.enabled = true;
        return this.settings;
    },

    buildDefaultCoolingZones: function (center) {
        if (!center) return [];

        return [
            {
                id: "cooling-glacier-demo",
                lat: center.lat + 0.004,
                lon: center.lon - 0.003,
                radiusM: 450,
                strengthK: -2.4,
                steerDeg: 195,
                steerMs: 0.7
            }
        ];
    },

    extractTempProfilePayload: function (payload) {
        if (Array.isArray(payload)) return payload;
        if (!payload || typeof payload !== "object") return null;
        if (Array.isArray(payload.profile)) return payload.profile;
        if (Array.isArray(payload.levels)) return payload.levels;
        if (Array.isArray(payload.data)) return payload.data;
        return null;
    },

    loadTempProfileFromUrl: async function (url) {
        if (typeof url !== "string" || url.trim() === "") {
            throw new Error("Chýba adresa TEMP profilu.");
        }

        const response = await fetch(url + "?v=" + Date.now(), { cache: "no-store" });
        if (!response.ok) {
            throw new Error("TEMP profil sa nepodarilo načítať: HTTP " + response.status);
        }

        const payload = await response.json();
        const profile = this.extractTempProfilePayload(payload);
        if (!Array.isArray(profile) || profile.length < 2) {
            throw new Error("TEMP profil je prázdny alebo nemá očakávaný formát poľa.");
        }

        return profile;
    },

    runDemo: async function (viewer, center, options = {}) {
        if (!window.WindField || !window.WindRender || !window.WindTempLoader) {
            throw new Error("WindField and WindRender modules must be loaded first.");
        }

        const settings = { ...this.settings, ...options };
        let profile = Array.isArray(settings.tempProfile) && settings.tempProfile.length >= 2
            ? settings.tempProfile
            : (Array.isArray(window.PilotNetwork?.liveAtmosferaTEMP) && window.PilotNetwork.liveAtmosferaTEMP.length >= 2
                ? window.PilotNetwork.liveAtmosferaTEMP
                : null);

        if (!Array.isArray(profile) || profile.length < 2) {
            const sourceMode = String(settings.tempSourceMode || this.defaultSettings.tempSourceMode || "auto");
            if (typeof window.logStatus === "function") {
                window.logStatus("TEMP profil chýba. Načítavam zdroj v režime „" + sourceMode + "“...", "info");
            }
            profile = await window.WindTempLoader.loadProfile(center, {
                sourceMode,
                tempSourceUrl: settings.tempSourceUrl,
                windyTempUrl: settings.windyTempUrl,
                windyTempUrlTemplate: settings.windyTempUrlTemplate,
                stationTempUrl: settings.stationTempUrl,
                stationIndexUrl: settings.stationIndexUrl,
                stationProfileUrlTemplate: settings.stationProfileUrlTemplate
            });
        }

        const sourceLabel = profile && profile.length
            ? "ODVODENE_Z_TEMP"
            : settings.source;

        const coolingZones = Array.isArray(settings.coolingZones)
            ? settings.coolingZones
            : this.buildDefaultCoolingZones(center);

        const field = window.WindField.createField({
            center,
            aglM: settings.aglM,
            radiusM: settings.radiusM,
            spacingM: settings.spacingM,
            baseSpeedMs: settings.baseSpeedMs,
            baseDirDeg: settings.baseDirDeg,
            tempProfile: profile,
            surfaceAltM: Number.isFinite(Number(settings.surfaceAltM)) ? Number(settings.surfaceAltM) : null,
            terrainGeometry: settings.terrainGeometry,
            activeEffects: settings.activeEffects,
            useTempProfileWind: true,
            source: sourceLabel,
            coolingZones
        });

        const stats = await window.WindRender.renderField(viewer, field, {
            seedEvery: settings.seedEvery,
            maxSteps: settings.maxSteps,
            stepMeters: settings.stepMeters,
            colorMode: settings.colorMode,
            colorTheme: settings.colorTheme,
            animationEnabled: settings.animationEnabled
        });

        this.state.lastField = field;
        this.state.lastRenderStats = stats;

        return {
            field,
            stats
        };
    },

    clear: function (viewer) {
        window.WindRender?.clear?.(viewer);
        this.state.lastRenderStats = null;
    },

    summarizeCell: function (cell) {
        if (!cell) return "WIND cell is not available.";

        return [
            "Speed: " + (Number(cell.speed_ms) || 0).toFixed(2) + " m/s",
            "Dir: " + Math.round(Number(cell.dir_deg) || 0) + " deg",
            "Temp delta: " + (Number(cell.tempDeltaK) || 0).toFixed(2) + " K",
            "Convergence: " + (Number(cell.convergence) || 0).toFixed(4) + " 1/s",
            "Source: " + String(cell.source || "-")
        ].join(" | ");
    }
};

// js/wind-temp-loader.js
// TermikaXC v2.6 - TEMP profile loader for WIND.
// Supports configurable sources: Windy, nearest station, or file/URL.

window.WindTempLoader = {
    VERSION: "2.6.14-wind-temp-loader-fm94.1",

    lastResolvedSource: null,

    defaultSettings: {
        sourceMode: "auto",
        tempSourceUrl: "XCtrack/temp.json",
        windyTempUrl: "",
        windyTempUrlTemplate: "",
        stationTempUrl: "",
        stationIndexUrl: "",
        stationProfileUrlTemplate: "",
        stationProfileUrlKey: "profileUrl"
    },

    configure: function (settings = {}) {
        this.settings = { ...this.defaultSettings, ...settings };
        return this.settings;
    },

    extractPayloadProfile: function (payload) {
        if (Array.isArray(payload)) return payload;
        if (!payload || typeof payload !== "object") return null;
        if (String(payload.type || "") === "FeatureCollection" && Array.isArray(payload.features)) {
            return this.convertWindyFeatureCollection(payload);
        }
        if (Array.isArray(payload.profile)) return payload.profile;
        if (Array.isArray(payload.levels)) return payload.levels;
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.tempProfile)) return payload.tempProfile;
        return null;
    },

    kelvinToCelsiusSafe: function (value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return null;
        return n > 170 ? (n - 273.15) : n;
    },

    convertWindyFeatureCollection: function (payload) {
        if (!payload || String(payload.type || "") !== "FeatureCollection") return [];
        if (!Array.isArray(payload.features) || payload.features.length < 2) return [];

        const rows = [];

        payload.features.forEach((feature) => {
            const props = feature?.properties && typeof feature.properties === "object"
                ? feature.properties
                : {};
            const coords = Array.isArray(feature?.geometry?.coordinates)
                ? feature.geometry.coordinates
                : [];

            const z_m = Number(props.gpheight ?? props.height ?? coords[2]);
            const p_hpa = Number(props.pressure ?? props.p_hpa);
            const T_c = this.kelvinToCelsiusSafe(props.temp ?? props.temperature ?? props.t);
            const Td_c = this.kelvinToCelsiusSafe(props.dewpoint ?? props.td ?? props.dewpoint_c);
            const u_ms = Number(props.wind_u ?? props.u_ms ?? props.u);
            const v_ms = Number(props.wind_v ?? props.v_ms ?? props.v);

            const speedMs = Number.isFinite(u_ms) && Number.isFinite(v_ms)
                ? Math.hypot(u_ms, v_ms)
                : null;
            const w_speed_kts = Number.isFinite(speedMs) ? (speedMs * 1.9438444924406) : null;
            const w_dir_deg = Number.isFinite(u_ms) && Number.isFinite(v_ms)
                ? this.wrapDegrees((Math.atan2(-u_ms, -v_ms) * 180) / Math.PI)
                : null;

            rows.push({
                z_m: Number.isFinite(z_m) ? z_m : null,
                p_hpa: Number.isFinite(p_hpa) ? p_hpa : null,
                T_c: Number.isFinite(T_c) ? T_c : null,
                Td_c: Number.isFinite(Td_c) ? Td_c : null,
                w_dir_deg: Number.isFinite(w_dir_deg) ? w_dir_deg : null,
                w_speed_kts: Number.isFinite(w_speed_kts) ? w_speed_kts : null
            });
        });

        return rows;
    },

    wrapDegrees: function (value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return 0;
        return ((n % 360) + 360) % 360;
    },

    pickValue: function (row, keys) {
        for (const key of keys) {
            if (row && row[key] !== undefined && row[key] !== null && row[key] !== "") {
                return row[key];
            }
        }
        return null;
    },

    normalizeProfile: function (raw) {
        const source = Array.isArray(raw) ? raw : this.extractPayloadProfile(raw);
        if (!Array.isArray(source) || source.length < 2) return [];

        return source.map((row) => {
            const z_m = Number(this.pickValue(row, ["z_m", "height_msl", "alt_m", "height", "pressure_alt_m"]));
            const p_hpa = Number(this.pickValue(row, ["p_hpa", "pressure_hpa", "pressure", "p"]));
            const T_c = Number(this.pickValue(row, ["T_c", "temperature_c", "temp_c", "temperature", "t"]));
            const Td_c = Number(this.pickValue(row, ["Td_c", "dewpoint_c", "dewpoint", "td"]));
            const w_dir_deg = Number(this.pickValue(row, ["w_dir_deg", "wind_dir_deg", "wind_dir", "dir_deg", "dir"]));
            const w_speed_kts = Number(this.pickValue(row, ["w_speed_kts", "wind_speed_kts", "wind_speed", "speed_kts", "speed"]));

            return {
                p_hpa: Number.isFinite(p_hpa) ? p_hpa : null,
                z_m: Number.isFinite(z_m) ? z_m : null,
                T_c: Number.isFinite(T_c) ? T_c : null,
                Td_c: Number.isFinite(Td_c) ? Td_c : null,
                w_dir_deg: Number.isFinite(w_dir_deg) ? ((w_dir_deg % 360) + 360) % 360 : null,
                w_speed_kts: Number.isFinite(w_speed_kts) ? w_speed_kts : null
            };
        }).filter((row) =>
            Number.isFinite(row.p_hpa) &&
            Number.isFinite(row.z_m) &&
            Number.isFinite(row.T_c) &&
            Number.isFinite(row.Td_c) &&
            Number.isFinite(row.w_dir_deg) &&
            Number.isFinite(row.w_speed_kts)
        ).sort((a, b) => a.z_m - b.z_m);
    },

    fetchJson: async function (url) {
        const response = await fetch(url + (url.includes("?") ? "&" : "?") + "v=" + Date.now(), { cache: "no-store" });
        if (!response.ok) {
            throw new Error("TEMP profil sa nepodarilo načítať: HTTP " + response.status);
        }
        return await response.json();
    },

    loadFromUrl: async function (url) {
        if (typeof url !== "string" || url.trim() === "") {
            throw new Error("Chýba adresa TEMP profilu.");
        }
        const payload = await this.fetchJson(url);
        const profile = this.normalizeProfile(payload);
        if (!Array.isArray(profile) || profile.length < 2) {
            throw new Error("TEMP profil je prázdny alebo nemá očakávaný formát poľa.");
        }
        return profile;
    },

    buildUrlFromTemplate: function (template, center, extra = {}) {
        if (typeof template !== "string" || template.trim() === "") return "";
        const lat = Number(center?.lat ?? center?.latitude);
        const lon = Number(center?.lon ?? center?.lng ?? center?.longitude);
        let url = template
            .replaceAll("${lat}", Number.isFinite(lat) ? String(lat.toFixed(5)) : "")
            .replaceAll("${lon}", Number.isFinite(lon) ? String(lon.toFixed(5)) : "")
            .replaceAll("{lat}", Number.isFinite(lat) ? String(lat.toFixed(5)) : "")
            .replaceAll("{lon}", Number.isFinite(lon) ? String(lon.toFixed(5)) : "");

        Object.keys(extra || {}).forEach((key) => {
            const value = extra[key];
            if (value === undefined || value === null) return;
            url = url
                .replaceAll("${" + key + "}", String(value))
                .replaceAll("{" + key + "}", String(value));
        });

        return url;
    },

    haversineKm: function (lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    loadNearestStationProfile: async function (center, settings) {
        const indexUrl = this.buildUrlFromTemplate(settings.stationIndexUrl, center);
        const directUrl = this.buildUrlFromTemplate(settings.stationTempUrl, center);
        const profileUrlTemplate = String(settings.stationProfileUrlTemplate || "");

        if (indexUrl) {
            const indexPayload = await this.fetchJson(indexUrl);
            const stations = this.extractPayloadProfile(indexPayload) || (Array.isArray(indexPayload) ? indexPayload : []);
            if (Array.isArray(stations) && stations.length) {
                let best = null;
                let bestDist = Number.POSITIVE_INFINITY;
                const lat = Number(center?.lat);
                const lon = Number(center?.lon);

                stations.forEach((station) => {
                    const sLat = Number(station.lat ?? station.latitude);
                    const sLon = Number(station.lon ?? station.lng ?? station.longitude);
                    if (!Number.isFinite(sLat) || !Number.isFinite(sLon) || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
                    const dist = this.haversineKm(lat, lon, sLat, sLon);
                    if (dist < bestDist) {
                        bestDist = dist;
                        best = station;
                    }
                });

                if (best) {
                    const profileUrl = this.buildUrlFromTemplate(
                        String(best[settings.stationProfileUrlKey || "profileUrl"] || best.profileUrl || best.url || profileUrlTemplate),
                        center,
                        {
                            stationId: best.stationId ?? best.station_id ?? best.id ?? best.name ?? ""
                        }
                    );
                    if (profileUrl) {
                        return await this.loadFromUrl(profileUrl);
                    }
                }
            }
        }

        if (directUrl) {
            return await this.loadFromUrl(directUrl);
        }

        throw new Error("Režim meteo stanice nemá nakonfigurovaný zdroj profilu.");
    },

    loadWindyProfile: async function (center, settings) {
        const windyUrl = this.buildUrlFromTemplate(
            settings.windyTempUrl || settings.windyTempUrlTemplate,
            center
        );

        if (!windyUrl) {
            throw new Error("Režim Windy nemá nakonfigurovaný zdroj profilu.");
        }

        return await this.loadFromUrl(windyUrl);
    },

    loadProfile: async function (center, options = {}) {
        const settings = { ...this.defaultSettings, ...(this.settings || {}), ...options };
        const mode = String(settings.sourceMode || "auto").toLowerCase();

        const tryModes = mode === "auto"
            ? ["windy", "station", "file"]
            : [mode];

        let lastError = null;
        for (const currentMode of tryModes) {
            try {
                if (currentMode === "windy") {
                    const profile = await this.loadWindyProfile(center, settings);
                    this.lastResolvedSource = {
                        requestedMode: mode,
                        resolvedMode: currentMode,
                        detail: "windy",
                        timestamp: new Date().toISOString()
                    };
                    return profile;
                }
                if (currentMode === "station") {
                    const profile = await this.loadNearestStationProfile(center, settings);
                    this.lastResolvedSource = {
                        requestedMode: mode,
                        resolvedMode: currentMode,
                        detail: "nearest-station",
                        timestamp: new Date().toISOString()
                    };
                    return profile;
                }
                if (currentMode === "file") {
                    const url = settings.tempSourceUrl || this.defaultSettings.tempSourceUrl;
                    const profile = await this.loadFromUrl(url);
                    this.lastResolvedSource = {
                        requestedMode: mode,
                        resolvedMode: currentMode,
                        detail: String(url || ""),
                        timestamp: new Date().toISOString()
                    };
                    return profile;
                }
                throw new Error("Neznámy TEMP source mode: " + currentMode);
            } catch (error) {
                lastError = error;
                if (mode !== "auto") {
                    throw error;
                }
            }
        }

        throw lastError || new Error("TEMP profil sa nepodarilo načítať.");
    }
};
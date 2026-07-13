// js/wind-field.js
// TermikaXC v2.6 - WIND MVP data model and field computation.
// This module is standalone and does not mutate existing terrain modules.

window.WindField = {
    VERSION: "2.6.9-wind-mvp.1",

    lastField: null,

    defaultOptions: {
        center: null,
        radiusM: 1200,
        spacingM: 120,
        aglM: 30,
        baseSpeedMs: 4.5,
        baseDirDeg: 230,
        tempProfile: null,
        surfaceAltM: null,
        useTempProfileWind: true,
        tempDeltaKBase: 0,
        coolingZones: [],
        source: "ODVODENE"
    },

    createField: function (options = {}) {
        const cfg = this.normalizeOptions(options);
        const grid = this.buildGrid(cfg.center, cfg.radiusM, cfg.spacingM);
        const cells = this.computeCells(grid, cfg);
        const withMetrics = this.computeConvergence(cells, grid);

        const result = {
            createdAt: new Date().toISOString(),
            source: cfg.source,
            level: { agl_m: cfg.aglM },
            center: cfg.center,
            radiusM: cfg.radiusM,
            spacingM: cfg.spacingM,
            rowCount: grid.rowCount,
            colCount: grid.colCount,
            cells: withMetrics,
            weatherTracking: {
                mode: cfg.profileWind ? "TEMP_PROFILE" : "FALLBACK_BASE_VECTOR",
                targetAltMsl: cfg.profileWind?.targetAltMsl ?? null,
                sampledLevelP_hpa: cfg.profileWind?.p_hpa ?? null,
                sampledLevelZ_m: cfg.profileWind?.z_m ?? null,
                sampledTempC: cfg.profileWind?.T_c ?? null,
                sampledDewpointC: cfg.profileWind?.Td_c ?? null
            },
            diagnostics: {
                note: "WIND MVP field generated. Cooling zones and convergence are model estimates."
            }
        };

        this.lastField = result;
        return result;
    },

    normalizeOptions: function (options) {
        const cfg = { ...this.defaultOptions, ...options };

        if (!cfg.center) {
            throw new Error("WindField.createField: center is required.");
        }

        const lat = Number(cfg.center.lat ?? cfg.center.latitude);
        const lon = Number(cfg.center.lon ?? cfg.center.lng ?? cfg.center.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            throw new Error("WindField.createField: center lat/lon are invalid.");
        }

        cfg.center = { lat, lon };
        cfg.radiusM = this.clampNumber(cfg.radiusM, 150, 30000, "radiusM");
        cfg.spacingM = this.clampNumber(cfg.spacingM, 25, 2000, "spacingM");
        cfg.aglM = this.clampNumber(cfg.aglM, 1, 5000, "aglM");
        cfg.baseSpeedMs = this.clampNumber(cfg.baseSpeedMs, 0, 80, "baseSpeedMs");
        cfg.baseDirDeg = this.wrapDegrees(cfg.baseDirDeg);
        cfg.surfaceAltM = Number.isFinite(Number(cfg.surfaceAltM)) ? Number(cfg.surfaceAltM) : null;
        cfg.useTempProfileWind = cfg.useTempProfileWind !== false;
        cfg.tempProfile = Array.isArray(cfg.tempProfile)
            ? cfg.tempProfile
            : (Array.isArray(window.PilotNetwork?.liveAtmosferaTEMP)
                ? window.PilotNetwork.liveAtmosferaTEMP
                : null);
        cfg.profileWind = this.resolveProfileWind(cfg);
        cfg.tempDeltaKBase = Number(cfg.tempDeltaKBase) || 0;
        cfg.coolingZones = Array.isArray(cfg.coolingZones) ? cfg.coolingZones : [];

        return cfg;
    },

    resolveProfileWind: function (cfg) {
        if (!cfg.useTempProfileWind || !Array.isArray(cfg.tempProfile) || cfg.tempProfile.length < 2) {
            return null;
        }

        const levels = cfg.tempProfile
            .filter((row) =>
                Number.isFinite(Number(row.z_m)) &&
                Number.isFinite(Number(row.w_dir_deg)) &&
                Number.isFinite(Number(row.w_speed_kts))
            )
            .map((row) => ({
                z_m: Number(row.z_m),
                p_hpa: Number(row.p_hpa),
                T_c: Number(row.T_c),
                Td_c: Number(row.Td_c),
                w_dir_deg: this.wrapDegrees(Number(row.w_dir_deg)),
                w_speed_kts: Number(row.w_speed_kts)
            }))
            .sort((a, b) => a.z_m - b.z_m);

        if (levels.length < 2) return null;

        const surfaceAlt = Number.isFinite(cfg.surfaceAltM)
            ? cfg.surfaceAltM
            : Number(levels[0].z_m);
        const targetAltMsl = surfaceAlt + cfg.aglM;

        const low = levels[0];
        const high = levels[levels.length - 1];
        if (targetAltMsl <= low.z_m) {
            return this.levelToWindSample(low, targetAltMsl);
        }
        if (targetAltMsl >= high.z_m) {
            return this.levelToWindSample(high, targetAltMsl);
        }

        for (let i = 0; i < levels.length - 1; i += 1) {
            const a = levels[i];
            const b = levels[i + 1];
            if (targetAltMsl < a.z_m || targetAltMsl > b.z_m) continue;

            const t = (targetAltMsl - a.z_m) / Math.max(1e-6, (b.z_m - a.z_m));
            const dirA = (a.w_dir_deg * Math.PI) / 180;
            const dirB = (b.w_dir_deg * Math.PI) / 180;
            const spdA = a.w_speed_kts * 0.514444;
            const spdB = b.w_speed_kts * 0.514444;

            const uA = -Math.sin(dirA) * spdA;
            const vA = -Math.cos(dirA) * spdA;
            const uB = -Math.sin(dirB) * spdB;
            const vB = -Math.cos(dirB) * spdB;

            const u = uA + (uB - uA) * t;
            const v = vA + (vB - vA) * t;
            const speedMs = Math.hypot(u, v);
            const dirToDeg = this.wrapDegrees((Math.atan2(u, v) * 180) / Math.PI);

            return {
                targetAltMsl,
                z_m: targetAltMsl,
                p_hpa: Number.isFinite(a.p_hpa) && Number.isFinite(b.p_hpa)
                    ? a.p_hpa + (b.p_hpa - a.p_hpa) * t
                    : null,
                T_c: Number.isFinite(a.T_c) && Number.isFinite(b.T_c)
                    ? a.T_c + (b.T_c - a.T_c) * t
                    : null,
                Td_c: Number.isFinite(a.Td_c) && Number.isFinite(b.Td_c)
                    ? a.Td_c + (b.Td_c - a.Td_c) * t
                    : null,
                u_ms: u,
                v_ms: v,
                speed_ms: speedMs,
                dir_deg: dirToDeg
            };
        }

        return null;
    },

    levelToWindSample: function (level, targetAltMsl) {
        const speedMs = level.w_speed_kts * 0.514444;
        const rad = (level.w_dir_deg * Math.PI) / 180;
        const u = -Math.sin(rad) * speedMs;
        const v = -Math.cos(rad) * speedMs;

        return {
            targetAltMsl,
            z_m: level.z_m,
            p_hpa: Number.isFinite(level.p_hpa) ? level.p_hpa : null,
            T_c: Number.isFinite(level.T_c) ? level.T_c : null,
            Td_c: Number.isFinite(level.Td_c) ? level.Td_c : null,
            u_ms: u,
            v_ms: v,
            speed_ms: speedMs,
            dir_deg: this.wrapDegrees((Math.atan2(u, v) * 180) / Math.PI)
        };
    },

    clampNumber: function (value, min, max, name) {
        const n = Number(value);
        if (!Number.isFinite(n) || n < min || n > max) {
            throw new Error("WindField: invalid " + name + ", expected " + min + ".." + max);
        }
        return n;
    },

    wrapDegrees: function (value) {
        const v = Number(value);
        if (!Number.isFinite(v)) return 0;
        return ((v % 360) + 360) % 360;
    },

    buildGrid: function (center, radiusM, spacingM) {
        const halfSteps = Math.ceil(radiusM / spacingM);
        const rowCount = halfSteps * 2 + 1;
        const colCount = rowCount;

        return {
            center,
            spacingM,
            halfSteps,
            rowCount,
            colCount,
            metersPerDegLat: 111320,
            metersPerDegLon: 111320 * Math.cos((center.lat * Math.PI) / 180)
        };
    },

    computeCells: function (grid, cfg) {
        const cells = [];
        const toRad = Math.PI / 180;
        const dirTo = this.wrapDegrees(cfg.baseDirDeg);
        const dirRad = dirTo * toRad;
        const fallbackU = Math.sin(dirRad) * cfg.baseSpeedMs;
        const fallbackV = Math.cos(dirRad) * cfg.baseSpeedMs;
        const baseU = Number.isFinite(cfg.profileWind?.u_ms) ? cfg.profileWind.u_ms : fallbackU;
        const baseV = Number.isFinite(cfg.profileWind?.v_ms) ? cfg.profileWind.v_ms : fallbackV;
        const baseTempC = Number.isFinite(cfg.profileWind?.T_c) ? cfg.profileWind.T_c : null;
        const baseTdC = Number.isFinite(cfg.profileWind?.Td_c) ? cfg.profileWind.Td_c : null;

        for (let row = 0; row < grid.rowCount; row += 1) {
            for (let col = 0; col < grid.colCount; col += 1) {
                const eastM = (col - grid.halfSteps) * grid.spacingM;
                const northM = (row - grid.halfSteps) * grid.spacingM;
                const distM = Math.hypot(eastM, northM);
                if (distM > cfg.radiusM) continue;

                const lat = grid.center.lat + northM / grid.metersPerDegLat;
                const lon = grid.center.lon + eastM / grid.metersPerDegLon;

                const cooling = this.coolingAtPoint(lat, lon, cfg.coolingZones);
                const speedScale = Math.max(0.15, 1 - 0.2 * Math.min(1, Math.abs(cooling.deltaK) / 4));
                const u = baseU * speedScale + cooling.driftUMs;
                const v = baseV * speedScale + cooling.driftVMs;
                const speedMs = Math.hypot(u, v);
                const dirDeg = this.wrapDegrees((Math.atan2(u, v) * 180) / Math.PI);

                cells.push({
                    id: "w-" + row + "-" + col,
                    row,
                    col,
                    lat,
                    lon,
                    eastM,
                    northM,
                    agl_m: cfg.aglM,
                    u_ms: u,
                    v_ms: v,
                    speed_ms: speedMs,
                    dir_deg: dirDeg,
                    temp_air_c: baseTempC,
                    dewpoint_c: baseTdC,
                    tempDeltaK: cfg.tempDeltaKBase + cooling.deltaK,
                    convergence: 0,
                    shear: 0,
                    confidence: cooling.confidence,
                    source: cfg.source
                });
            }
        }

        return cells;
    },

    coolingAtPoint: function (lat, lon, zones) {
        let deltaK = 0;
        let driftU = 0;
        let driftV = 0;
        let confidence = 0.6;

        zones.forEach((zone) => {
            const zLat = Number(zone.lat);
            const zLon = Number(zone.lon);
            const radiusM = Math.max(50, Number(zone.radiusM) || 300);
            const strengthK = Number(zone.strengthK);
            const steerDeg = Number(zone.steerDeg);
            const steerMs = Number(zone.steerMs);

            if (!Number.isFinite(zLat) || !Number.isFinite(zLon) || !Number.isFinite(strengthK)) {
                return;
            }

            const mPerDegLat = 111320;
            const mPerDegLon = 111320 * Math.cos((lat * Math.PI) / 180);
            const dNorth = (lat - zLat) * mPerDegLat;
            const dEast = (lon - zLon) * mPerDegLon;
            const d = Math.hypot(dNorth, dEast);
            if (d > radiusM) return;

            const w = 1 - d / radiusM;
            deltaK += strengthK * w;

            if (Number.isFinite(steerDeg) && Number.isFinite(steerMs)) {
                const r = (this.wrapDegrees(steerDeg) * Math.PI) / 180;
                driftU += Math.sin(r) * steerMs * w;
                driftV += Math.cos(r) * steerMs * w;
            }

            confidence = Math.min(0.95, confidence + 0.1 * w);
        });

        return {
            deltaK,
            driftUMs: driftU,
            driftVMs: driftV,
            confidence
        };
    },

    computeConvergence: function (cells, grid) {
        const byKey = new Map();
        cells.forEach((c) => byKey.set(c.row + ":" + c.col, c));

        const spacing = grid.spacingM;

        cells.forEach((c) => {
            const left = byKey.get(c.row + ":" + (c.col - 1));
            const right = byKey.get(c.row + ":" + (c.col + 1));
            const down = byKey.get((c.row - 1) + ":" + c.col);
            const up = byKey.get((c.row + 1) + ":" + c.col);

            const dudx = left && right ? (right.u_ms - left.u_ms) / (2 * spacing) : 0;
            const dvdy = down && up ? (up.v_ms - down.v_ms) / (2 * spacing) : 0;
            const divergence = dudx + dvdy;

            c.convergence = -divergence;
        });

        return cells;
    },

    nearestCell: function (field, lat, lon) {
        if (!field || !Array.isArray(field.cells) || !field.cells.length) return null;

        let best = null;
        let bestD = Number.POSITIVE_INFINITY;

        field.cells.forEach((cell) => {
            const dLat = cell.lat - lat;
            const dLon = cell.lon - lon;
            const d = dLat * dLat + dLon * dLon;
            if (d < bestD) {
                bestD = d;
                best = cell;
            }
        });

        return best;
    }
};

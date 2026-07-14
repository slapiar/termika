// js/wind-field.js
// TermikaXC v2.6 - WIND MVP data model and field computation.
// This module is standalone and does not mutate existing terrain modules.

window.WindField = {
    VERSION: "2.6.12-wind-3d-stage1",

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
        terrainGeometry: null,
        activeEffects: null,
        tempDeltaKBase: 0,
        coolingZones: [],
        source: "ODVODENE"
    },

    createField: function (options = {}) {
        const cfg = this.normalizeOptions(options);
        const grid = this.buildGrid(cfg.center, cfg.radiusM, cfg.spacingM);
        const cells = this.computeCells(grid, cfg);
        const withBaseConvergence = this.computeConvergence(cells, grid);

        const effectsResult = this.applyEffects({
            cells: withBaseConvergence,
            center: cfg.center,
            radiusM: cfg.radiusM,
            spacingM: cfg.spacingM,
            level: { agl_m: cfg.aglM }
        }, {
            terrainGeometry: cfg.terrainGeometry,
            activeEffects: cfg.activeEffects
        });

        const withMetrics = this.computeConvergence(effectsResult.cells, grid);

        const result = {
            createdAt: new Date().toISOString(),
            source: cfg.source,
            level: { agl_m: cfg.aglM },
            surfaceAltM: Number.isFinite(cfg.surfaceAltM) ? cfg.surfaceAltM : null,
            terrainGeometry: cfg.terrainGeometry,
            tempLevels: cfg.tempLevels,
            profileWind: cfg.profileWind,
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
                note: "WIND MVP field generated. Cooling zones, terrain steering and convergence are model estimates.",
                effectsApplied: effectsResult.applied
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
        cfg.terrainGeometry = cfg.terrainGeometry && Array.isArray(cfg.terrainGeometry.cells)
            ? cfg.terrainGeometry
            : null;
        cfg.activeEffects = Array.isArray(cfg.activeEffects)
            ? cfg.activeEffects.map((id) => String(id).trim()).filter(Boolean)
            : null;
        cfg.tempProfile = Array.isArray(cfg.tempProfile)
            ? cfg.tempProfile
            : (Array.isArray(window.PilotNetwork?.liveAtmosferaTEMP)
                ? window.PilotNetwork.liveAtmosferaTEMP
                : null);
        cfg.tempLevels = this.parseTempLevels(cfg.tempProfile);
        cfg.profileWind = this.resolveProfileWind(cfg);
        cfg.tempDeltaKBase = Number(cfg.tempDeltaKBase) || 0;
        cfg.coolingZones = Array.isArray(cfg.coolingZones) ? cfg.coolingZones : [];

        return cfg;
    },

    parseTempLevels: function (profile) {
        if (!Array.isArray(profile) || profile.length < 2) {
            return [];
        }

        return profile
            .filter((row) =>
                Number.isFinite(Number(row.z_m)) &&
                Number.isFinite(Number(row.w_dir_deg)) &&
                Number.isFinite(Number(row.w_speed_kts))
            )
            .map((row, idx) => ({
                idx,
                z_m: Number(row.z_m),
                p_hpa: Number(row.p_hpa),
                T_c: Number(row.T_c),
                Td_c: Number(row.Td_c),
                w_dir_deg: this.wrapDegrees(Number(row.w_dir_deg)),
                w_speed_kts: Number(row.w_speed_kts)
            }))
            .sort((a, b) => a.z_m - b.z_m);
    },

    resolveProfileWind: function (cfg) {
        if (!cfg.useTempProfileWind || !Array.isArray(cfg.tempLevels) || cfg.tempLevels.length < 2) {
            return null;
        }

        const levels = cfg.tempLevels;

        const surfaceAlt = Number.isFinite(cfg.surfaceAltM)
            ? cfg.surfaceAltM
            : Number(levels[0].z_m);
        const targetAltMsl = surfaceAlt + cfg.aglM;
        return this.sampleWindAtAltitude(levels, targetAltMsl);
    },

    sampleWindAtAltitude: function (levels, targetAltMsl) {
        if (!Array.isArray(levels) || levels.length < 2 || !Number.isFinite(Number(targetAltMsl))) {
            return null;
        }

        const target = Number(targetAltMsl);
        const low = levels[0];
        const high = levels[levels.length - 1];
        if (target < low.z_m || target > high.z_m) {
            return null;
        }

        for (let i = 0; i < levels.length - 1; i += 1) {
            const a = levels[i];
            const b = levels[i + 1];
            if (target < a.z_m || target > b.z_m) continue;

            const t = (target - a.z_m) / Math.max(1e-6, (b.z_m - a.z_m));
            const blend = t * t * (3 - 2 * t);
            const dirA = (a.w_dir_deg * Math.PI) / 180;
            const dirB = (b.w_dir_deg * Math.PI) / 180;
            const spdA = a.w_speed_kts * 0.514444;
            const spdB = b.w_speed_kts * 0.514444;
            const kappa = 0.2854;
            const pressureA = Number.isFinite(a.p_hpa) && a.p_hpa > 0 ? a.p_hpa : null;
            const pressureB = Number.isFinite(b.p_hpa) && b.p_hpa > 0 ? b.p_hpa : null;
            const thetaA = Number.isFinite(a.T_c) && pressureA
                ? (a.T_c + 273.15) * Math.pow(1000 / pressureA, kappa)
                : null;
            const thetaB = Number.isFinite(b.T_c) && pressureB
                ? (b.T_c + 273.15) * Math.pow(1000 / pressureB, kappa)
                : null;

            const uA = -Math.sin(dirA) * spdA;
            const vA = -Math.cos(dirA) * spdA;
            const uB = -Math.sin(dirB) * spdB;
            const vB = -Math.cos(dirB) * spdB;

            const pressureBlend = pressureA && pressureB
                ? Math.exp(Math.log(pressureA) + (Math.log(pressureB) - Math.log(pressureA)) * blend)
                : (Number.isFinite(a.p_hpa) && Number.isFinite(b.p_hpa)
                    ? a.p_hpa + (b.p_hpa - a.p_hpa) * blend
                    : null);
            const thetaBlend = Number.isFinite(thetaA) && Number.isFinite(thetaB)
                ? thetaA + (thetaB - thetaA) * blend
                : null;
            const tempBlend = Number.isFinite(thetaBlend) && Number.isFinite(pressureBlend)
                ? thetaBlend / Math.pow(1000 / Math.max(1e-6, pressureBlend), kappa) - 273.15
                : (Number.isFinite(a.T_c) && Number.isFinite(b.T_c)
                    ? a.T_c + (b.T_c - a.T_c) * blend
                    : null);
            const dewpointBlend = Number.isFinite(a.Td_c) && Number.isFinite(b.Td_c)
                ? a.Td_c + (b.Td_c - a.Td_c) * blend
                : null;

            const shearBias = Math.max(0, Math.min(0.18, Math.abs((Number(b.w_speed_kts) || 0) - (Number(a.w_speed_kts) || 0)) / 120));
            const vectorBlend = Math.max(0, Math.min(1, blend + (blend - t) * shearBias));
            const u = uA + (uB - uA) * vectorBlend;
            const v = vA + (vB - vA) * vectorBlend;
            const speedMs = Math.hypot(u, v);
            const dirToDeg = this.wrapDegrees((Math.atan2(u, v) * 180) / Math.PI);

            return {
                targetAltMsl: target,
                z_m: target,
                p_hpa: Number.isFinite(pressureBlend) ? pressureBlend : null,
                T_c: Number.isFinite(tempBlend) ? tempBlend : null,
                Td_c: Number.isFinite(dewpointBlend) ? dewpointBlend : null,
                u_ms: u,
                v_ms: v,
                speed_ms: speedMs,
                dir_deg: dirToDeg,
                source_temp_lower_index: a.idx,
                source_temp_upper_index: b.idx
            };
        }

        return null;
    },

    findTempBracket: function (levels, targetAltMsl) {
        if (!Array.isArray(levels) || levels.length < 2 || !Number.isFinite(Number(targetAltMsl))) {
            return null;
        }

        const target = Number(targetAltMsl);
        const low = levels[0];
        const high = levels[levels.length - 1];
        if (target < low.z_m || target > high.z_m) {
            return null;
        }

        for (let i = 0; i < levels.length - 1; i += 1) {
            const a = levels[i];
            const b = levels[i + 1];
            if (target < a.z_m || target > b.z_m) continue;

            const t = (target - a.z_m) / Math.max(1e-6, (b.z_m - a.z_m));
            return { low: a, high: b, t };
        }

        return null;
    },

    terrainNormalFromCell: function (terrainCell) {
        const slopeDeg = Number(terrainCell?.slopeDeg);
        const aspectDeg = Number(terrainCell?.aspectDeg);
        if (!Number.isFinite(slopeDeg) || !Number.isFinite(aspectDeg)) {
            return { e: 0, n: 0, u: 1 };
        }

        const slopeRad = (Math.max(0, slopeDeg) * Math.PI) / 180;
        const aspectRad = (aspectDeg * Math.PI) / 180;
        const tanSlope = Math.tan(slopeRad);
        const dzdx = -tanSlope * Math.sin(aspectRad);
        const dzdy = -tanSlope * Math.cos(aspectRad);
        const len = Math.hypot(-dzdx, -dzdy, 1);
        return {
            e: -dzdx / len,
            n: -dzdy / len,
            u: 1 / len
        };
    },

    stabilityFromBracket: function (bracket) {
        if (!bracket?.low || !bracket?.high) return 0.5;

        const dz = Math.max(1, Number(bracket.high.z_m) - Number(bracket.low.z_m));
        const tempDelta = Number(bracket.high.T_c) - Number(bracket.low.T_c);
        const lapseKPerKm = (tempDelta / dz) * 1000;
        return this.clamp01((lapseKPerKm + 8) / 14);
    },

    projectVectorToTerrain: function (vector, normal) {
        const dot = vector.e * normal.e + vector.n * normal.n + vector.u * normal.u;
        if (dot >= 0) {
            return { e: vector.e, n: vector.n, u: vector.u, penetrationRemoved: 0 };
        }

        return {
            e: vector.e - dot * normal.e,
            n: vector.n - dot * normal.n,
            u: vector.u - dot * normal.u,
            penetrationRemoved: Math.abs(dot)
        };
    },

    terrainAtPoint: function (field, lat, lon) {
        const terrainCell = this.nearestTerrainGeometryCell(field?.terrainGeometry, lat, lon);
        const terrainHeightMsl = Number.isFinite(Number(terrainCell?.heightM))
            ? Number(terrainCell.heightM)
            : (Number.isFinite(Number(field?.surfaceAltM)) ? Number(field.surfaceAltM) : null);
        return { terrainCell, terrainHeightMsl };
    },

    sampleWindVector3D: function (fieldOrLat, latOrLon, lonOrHeight, heightOrPrev, previousState = null) {
        let field = fieldOrLat;
        let lat = latOrLon;
        let lon = lonOrHeight;
        let heightMsl = heightOrPrev;
        let prevState = previousState;

        if (typeof fieldOrLat === "number") {
            prevState = heightOrPrev || null;
            heightMsl = lonOrHeight;
            lon = latOrLon;
            lat = fieldOrLat;
            field = this.lastField || null;
        }

        const levels = Array.isArray(field?.tempLevels) ? field.tempLevels : [];
        if (levels.length < 2) {
            return { valid: false, reason: "VALIDITY_END" };
        }

        const baseHeight = Number.isFinite(Number(heightMsl))
            ? Number(heightMsl)
            : (Number.isFinite(Number(field?.surfaceAltM)) ? Number(field.surfaceAltM) + Number(field?.level?.agl_m || 0) : null);
        if (!Number.isFinite(baseHeight)) {
            return { valid: false, reason: "NUMERICAL_FAILURE" };
        }

        const bracket = this.findTempBracket(levels, baseHeight);
        if (!bracket) {
            return { valid: false, reason: "VALIDITY_END" };
        }

        const low = bracket.low;
        const high = bracket.high;
        const t = bracket.t;
        const dirA = (low.w_dir_deg * Math.PI) / 180;
        const dirB = (high.w_dir_deg * Math.PI) / 180;
        const spdA = low.w_speed_kts * 0.514444;
        const spdB = high.w_speed_kts * 0.514444;
        const uA = -Math.sin(dirA) * spdA;
        const vA = -Math.cos(dirA) * spdA;
        const uB = -Math.sin(dirB) * spdB;
        const vB = -Math.cos(dirB) * spdB;

        const u = uA + (uB - uA) * t;
        const v = vA + (vB - vA) * t;
        const atmospheric = {
            p_hpa: Number.isFinite(low.p_hpa) && Number.isFinite(high.p_hpa)
                ? low.p_hpa + (high.p_hpa - low.p_hpa) * t
                : null,
            T_c: Number.isFinite(low.T_c) && Number.isFinite(high.T_c)
                ? low.T_c + (high.T_c - low.T_c) * t
                : null,
            Td_c: Number.isFinite(low.Td_c) && Number.isFinite(high.Td_c)
                ? low.Td_c + (high.Td_c - low.Td_c) * t
                : null
        };

        const terrain = this.terrainAtPoint(field, lat, lon);
        const terrainNormal = this.terrainNormalFromCell(terrain.terrainCell);
        const clearanceAgl = Number.isFinite(terrain.terrainHeightMsl)
            ? Math.max(0, baseHeight - terrain.terrainHeightMsl)
            : Number(field?.level?.agl_m) || 0;
        const terrainWeight = this.clamp01(1 - clearanceAgl / 480);
        const projected = this.projectVectorToTerrain({ e: u, n: v, u: 0 }, terrainNormal);
        const stability = this.stabilityFromBracket(bracket);
        const verticalPersistence = Math.max(0.42, Math.min(0.95, 0.9 - 0.28 * stability));
        const carriedVertical = Number.isFinite(Number(prevState?.vertical_momentum_ms))
            ? Number(prevState.vertical_momentum_ms) * verticalPersistence
            : 0;
        const liftFromSlope = Math.max(0, projected.u) * terrainWeight;
        const wMs = projected.u * terrainWeight + carriedVertical + liftFromSlope;
        const speedMs = Math.hypot(projected.e, projected.n, wMs);
        const dirDeg = this.wrapDegrees((Math.atan2(projected.e, projected.n) * 180) / Math.PI);
        const flowState = clearanceAgl < 8 && wMs <= 0.02
            ? "SEPARATED"
            : (terrainWeight > 0.3 && wMs > 0.08 ? "REATTACHING" : "ATTACHED");

        return {
            valid: true,
            lat,
            lon,
            height_msl: baseHeight,
            u_ms: projected.e,
            v_ms: projected.n,
            w_ms: wMs,
            speed_ms: speedMs,
            dir_deg: dirDeg,
            temp_air_c: atmospheric.T_c,
            dewpoint_c: atmospheric.Td_c,
            pressure_hpa: atmospheric.p_hpa,
            source_temp_lower_index: low.idx,
            source_temp_upper_index: high.idx,
            terrain_height_msl: terrain.terrainHeightMsl,
            clearance_agl: clearanceAgl,
            terrain_normal_east: terrainNormal.e,
            terrain_normal_north: terrainNormal.n,
            terrain_normal_up: terrainNormal.u,
            terrain_weight: terrainWeight,
            stability_index: stability,
            vertical_momentum_ms: wMs,
            flow_state: flowState,
            termination_reason: null,
            source: field?.source || "ODVODENE"
        };
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

    clamp01: function (value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.min(1, n));
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
                const terrainCell = this.nearestTerrainGeometryCell(cfg.terrainGeometry, lat, lon);
                const terrainHeightMsl = Number.isFinite(Number(terrainCell?.heightM))
                    ? Number(terrainCell.heightM)
                    : (Number.isFinite(cfg.surfaceAltM) ? cfg.surfaceAltM : null);

                const targetAltMsl = Number.isFinite(terrainHeightMsl)
                    ? terrainHeightMsl + cfg.aglM
                    : (Number.isFinite(cfg.profileWind?.targetAltMsl) ? Number(cfg.profileWind.targetAltMsl) : null);

                const profileSample = cfg.useTempProfileWind
                    ? this.sampleWindAtAltitude(cfg.tempLevels, targetAltMsl)
                    : null;

                const cooling = this.coolingAtPoint(lat, lon, cfg.coolingZones);
                const speedScale = Math.max(0.15, 1 - 0.2 * Math.min(1, Math.abs(cooling.deltaK) / 4));
                const ambientU = Number.isFinite(profileSample?.u_ms) ? profileSample.u_ms : baseU;
                const ambientV = Number.isFinite(profileSample?.v_ms) ? profileSample.v_ms : baseV;
                const u = ambientU * speedScale + cooling.driftUMs;
                const v = ambientV * speedScale + cooling.driftVMs;
                const speedMs = Math.hypot(u, v);
                const dirDeg = this.wrapDegrees((Math.atan2(u, v) * 180) / Math.PI);
                const heightMsl = Number.isFinite(targetAltMsl) ? targetAltMsl : null;
                const clearanceAgl = Number.isFinite(heightMsl) && Number.isFinite(terrainHeightMsl)
                    ? Math.max(0, heightMsl - terrainHeightMsl)
                    : cfg.aglM;

                cells.push({
                    id: "w-" + row + "-" + col,
                    row,
                    col,
                    lat,
                    lon,
                    eastM,
                    northM,
                    agl_m: cfg.aglM,
                    terrain_height_msl: terrainHeightMsl,
                    clearance_agl: clearanceAgl,
                    surface_alt_msl: terrainHeightMsl,
                    height_msl: heightMsl,
                    u_ms: u,
                    v_ms: v,
                    w_ms: 0,
                    speed_ms: speedMs,
                    dir_deg: dirDeg,
                    temp_air_c: Number.isFinite(profileSample?.T_c) ? profileSample.T_c : baseTempC,
                    dewpoint_c: Number.isFinite(profileSample?.Td_c) ? profileSample.Td_c : baseTdC,
                    pressure_hpa: Number.isFinite(profileSample?.p_hpa) ? profileSample.p_hpa : null,
                    tempDeltaK: cfg.tempDeltaKBase + cooling.deltaK,
                    convergence: 0,
                    shear: 0,
                    confidence: cooling.confidence,
                    source: cfg.source,
                    source_temp_lower_index: Number.isFinite(profileSample?.source_temp_lower_index)
                        ? profileSample.source_temp_lower_index
                        : null,
                    source_temp_upper_index: Number.isFinite(profileSample?.source_temp_upper_index)
                        ? profileSample.source_temp_upper_index
                        : null
                });
            }
        }

        return cells;
    },

    nearestTerrainGeometryCell: function (terrainGeometry, lat, lon) {
        const cells = terrainGeometry?.cells;
        if (!Array.isArray(cells) || !cells.length) return null;

        let best = null;
        let bestD = Number.POSITIVE_INFINITY;

        for (let i = 0; i < cells.length; i += 1) {
            const c = cells[i];
            const dLat = Number(c.lat) - lat;
            const dLon = Number(c.lon) - lon;
            const d = dLat * dLat + dLon * dLon;
            if (d < bestD) {
                bestD = d;
                best = c;
            }
        }

        return best;
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

    applyEffects: function (field, context) {
        if (!window.WindEffectsCore?.applyAll) {
            return { applied: [], cells: field.cells };
        }

        return window.WindEffectsCore.applyAll(field, context || {});
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

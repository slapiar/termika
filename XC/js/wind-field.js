// js/wind-field.js
// TermikaXC v2.6 - WIND MVP data model and field computation.
// This module is standalone and does not mutate existing terrain modules.

window.WindField = {
    VERSION: "2.6.15-wind-rk-mesh.1",

    lastField: null,

    defaultOptions: {
        center: null,
        radiusM: 1200,
        spacingM: 120,
        aglM: 30,
        baseSpeedMs: 4.5,
        baseDirDeg: 230,
        allowFallbackBaseVector: false,
        tempProfile: null,
        surfaceAltM: null,
        useTempProfileWind: true,
        terrainGeometry: null,
        activeEffects: null,
        maxVerticalMs: 4.0,
        maxVerticalRatio: 0.35,
        tempDeltaKBase: 0,
        coolingZones: [],
        source: "ODVODENE"
    },

    createField: function (options = {}) {
        const cfg = this.normalizeOptions(options);
        cfg.terrainSampler = this.createTerrainSampler(cfg.terrainGeometry, cfg.center);
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
            },
            model: {
                useTempProfileWind: cfg.useTempProfileWind,
                allowFallbackBaseVector: cfg.allowFallbackBaseVector,
                maxVerticalMs: cfg.maxVerticalMs,
                maxVerticalRatio: cfg.maxVerticalRatio
            },
            _terrainSampler: cfg.terrainSampler
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
        cfg.allowFallbackBaseVector = cfg.allowFallbackBaseVector === true;
        cfg.surfaceAltM = (cfg.surfaceAltM === null || cfg.surfaceAltM === undefined || cfg.surfaceAltM === "")
            ? null
            : (Number.isFinite(Number(cfg.surfaceAltM)) ? Number(cfg.surfaceAltM) : null);
        cfg.useTempProfileWind = cfg.useTempProfileWind !== false;
        if (!cfg.useTempProfileWind) {
            throw new Error("WindField.createField: režim bez TEMP profilu je vypnutý. Umelé prúdenie nie je povolené.");
        }
        cfg.maxVerticalMs = this.clampNumber(cfg.maxVerticalMs, 0.2, 20, "maxVerticalMs");
        cfg.maxVerticalRatio = this.clampNumber(cfg.maxVerticalRatio, 0.05, 1.2, "maxVerticalRatio");
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
        if (cfg.useTempProfileWind && cfg.tempLevels.length < 2) {
            throw new Error("WindField.createField: TEMP profil musí mať aspoň dve platné hladiny.");
        }
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
        if (target <= low.z_m) {
            const sample = this.levelToWindSample(low, target);
            return {
                ...sample,
                source_temp_lower_index: low.idx,
                source_temp_upper_index: low.idx
            };
        }
        if (target >= high.z_m) {
            const sample = this.levelToWindSample(high, target);
            return {
                ...sample,
                source_temp_lower_index: high.idx,
                source_temp_upper_index: high.idx
            };
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

        const lowClamp = Number(levels[0].z_m);
        const highClamp = Number(levels[levels.length - 1].z_m);
        const target = Math.max(lowClamp, Math.min(highClamp, Number(targetAltMsl)));
        const low = levels[0];
        const high = levels[levels.length - 1];

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

        if (window.MeteoCore?.moistLapseRateKPerM) {
            const tLowK = Number(bracket.low.T_c) + 273.15;
            const tHighK = Number(bracket.high.T_c) + 273.15;
            const tMidK = (tLowK + tHighK) / 2;
            const pMid = (Number(bracket.low.p_hpa) + Number(bracket.high.p_hpa)) / 2;
            const envGamma = (Number(bracket.low.T_c) - Number(bracket.high.T_c)) / dz;
            const moistGamma = Number(window.MeteoCore.moistLapseRateKPerM(tMidK, pMid));
            const stabilityProxy = (moistGamma - envGamma + 0.0015) / 0.006;
            return this.clamp01(stabilityProxy);
        }

        const tempDelta = Number(bracket.high.T_c) - Number(bracket.low.T_c);
        const lapseKPerKm = (tempDelta / dz) * 1000;
        return this.clamp01((lapseKPerKm + 8) / 14);
    },

    bruntVaisalaN2FromBracket: function (bracket) {
        if (!bracket?.low || !bracket?.high) return 0;

        const z0 = Number(bracket.low.z_m);
        const z1 = Number(bracket.high.z_m);
        const p0 = Number(bracket.low.p_hpa);
        const p1 = Number(bracket.high.p_hpa);
        const t0 = Number(bracket.low.T_c);
        const t1 = Number(bracket.high.T_c);

        if (!Number.isFinite(z0) || !Number.isFinite(z1) || !Number.isFinite(t0) || !Number.isFinite(t1)) {
            return 0;
        }

        const dz = Math.max(1, z1 - z0);
        const kappa = 0.2854;
        const theta0 = Number.isFinite(p0) && p0 > 0
            ? (t0 + 273.15) * Math.pow(1000 / p0, kappa)
            : (t0 + 273.15);
        const theta1 = Number.isFinite(p1) && p1 > 0
            ? (t1 + 273.15) * Math.pow(1000 / p1, kappa)
            : (t1 + 273.15);
        const thetaRef = Math.max(200, (theta0 + theta1) * 0.5);
        const dThetaDz = (theta1 - theta0) / dz;
        const n2 = (9.81 / thetaRef) * dThetaDz;

        return Math.max(-0.01, Math.min(0.03, Number.isFinite(n2) ? n2 : 0));
    },

    verticalDampingFromN2: function (n2, terrainWeight) {
        const omega = Math.sqrt(Math.max(0, Number(n2) || 0));
        const weight = this.clamp01(terrainWeight);
        const damping = 0.12 + 0.95 * omega + 0.18 * weight;
        return Math.max(0.06, Math.min(2.5, damping));
    },

    projectVectorToTerrain: function (vector, normal) {
        const dot = vector.e * normal.e + vector.n * normal.n + vector.u * normal.u;
        return {
            e: vector.e - dot * normal.e,
            n: vector.n - dot * normal.n,
            u: vector.u - dot * normal.u,
            penetrationRemoved: Math.abs(dot)
        };
    },

    pointToLocalMeters: function (center, lat, lon) {
        const metersPerDegLat = 111320;
        const metersPerDegLon = 111320 * Math.cos((Number(center?.lat) || 0) * Math.PI / 180);
        return {
            eastM: (Number(lon) - Number(center?.lon || 0)) * metersPerDegLon,
            northM: (Number(lat) - Number(center?.lat || 0)) * metersPerDegLat
        };
    },

    barycentric2D: function (point, a, b, c) {
        const v0x = b.eastM - a.eastM;
        const v0y = b.northM - a.northM;
        const v1x = c.eastM - a.eastM;
        const v1y = c.northM - a.northM;
        const v2x = point.eastM - a.eastM;
        const v2y = point.northM - a.northM;

        const den = v0x * v1y - v1x * v0y;
        if (Math.abs(den) < 1e-9) {
            return null;
        }

        const inv = 1 / den;
        const l1 = (v2x * v1y - v1x * v2y) * inv;
        const l2 = (v0x * v2y - v2x * v0y) * inv;
        const l0 = 1 - l1 - l2;
        return { l0, l1, l2 };
    },

    createTerrainSampler: function (terrainGeometry, center) {
        const mesh = terrainGeometry?.mesh;
        if (!mesh?.faces?.length || !mesh?.vertices?.length) return null;

        const vertexById = new Map();
        mesh.vertices.forEach((vertex) => {
            const local = this.pointToLocalMeters(center, Number(vertex.lat), Number(vertex.lon));
            vertexById.set(vertex.id, {
                id: vertex.id,
                lat: Number(vertex.lat),
                lon: Number(vertex.lon),
                eastM: local.eastM,
                northM: local.northM,
                heightM: Number(vertex.heightM)
            });
        });

        const edgeById = new Map((mesh.edges || []).map((edge) => [edge.id, edge]));
        const faceSamples = [];

        mesh.faces.forEach((face) => {
            const verts = (face.vertexIds || []).map((id) => vertexById.get(id)).filter(Boolean);
            if (verts.length !== 3) return;

            const eastVals = verts.map((v) => v.eastM);
            const northVals = verts.map((v) => v.northM);
            const meanBreak = (face.edgeIds || [])
                .map((edgeId) => Number(edgeById.get(edgeId)?.breakStrength))
                .filter(Number.isFinite)
                .reduce((sum, value, _, list) => sum + value / list.length, 0);

            faceSamples.push({
                face,
                verts,
                bounds: {
                    minEast: Math.min(...eastVals),
                    maxEast: Math.max(...eastVals),
                    minNorth: Math.min(...northVals),
                    maxNorth: Math.max(...northVals)
                },
                meanBreakStrength: Number.isFinite(meanBreak) ? meanBreak : 0
            });
        });

        return {
            center,
            faceSamples,
            fallbackCells: Array.isArray(terrainGeometry?.cells) ? terrainGeometry.cells : []
        };
    },

    sampleTerrainWithSampler: function (sampler, lat, lon) {
        if (!sampler?.faceSamples?.length) return null;

        const point = this.pointToLocalMeters(sampler.center, lat, lon);
        const eps = 1e-6;
        let best = null;
        let bestPenalty = Number.POSITIVE_INFINITY;

        sampler.faceSamples.forEach((faceSample) => {
            const b = faceSample.bounds;
            if (point.eastM < b.minEast - 2 || point.eastM > b.maxEast + 2 || point.northM < b.minNorth - 2 || point.northM > b.maxNorth + 2) {
                return;
            }

            const bc = this.barycentric2D(point, faceSample.verts[0], faceSample.verts[1], faceSample.verts[2]);
            if (!bc) return;

            const penalty = Math.max(0, -bc.l0) + Math.max(0, -bc.l1) + Math.max(0, -bc.l2);
            if (penalty > 0.2) return;
            if (penalty < bestPenalty) {
                bestPenalty = penalty;
                best = { faceSample, bc };
            }
        });

        if (!best) return null;

        const verts = best.faceSample.verts;
        const w0 = best.bc.l0;
        const w1 = best.bc.l1;
        const w2 = best.bc.l2;
        const heightMsl = w0 * Number(verts[0].heightM) + w1 * Number(verts[1].heightM) + w2 * Number(verts[2].heightM);
        const face = best.faceSample.face;
        const terrainNormal = {
            e: Number(face?.normal?.east) || 0,
            n: Number(face?.normal?.north) || 0,
            u: Number(face?.normal?.up) || 1
        };

        return {
            terrainHeightMsl: Number.isFinite(heightMsl) ? heightMsl : null,
            terrainNormal,
            terrainFaceId: String(face?.id || ""),
            terrainFaceBreakStrength: best.faceSample.meanBreakStrength,
            terrainCell: {
                slopeDeg: Number(face?.slopeDeg),
                aspectDeg: Number(face?.aspectDeg),
                heightM: Number.isFinite(heightMsl) ? heightMsl : null
            }
        };
    },

    terrainAtPoint: function (field, lat, lon) {
        const fromMesh = this.sampleTerrainWithSampler(field?._terrainSampler || null, lat, lon);
        if (fromMesh) {
            return {
                terrainCell: fromMesh.terrainCell,
                terrainHeightMsl: fromMesh.terrainHeightMsl,
                terrainNormal: fromMesh.terrainNormal,
                terrainFaceId: fromMesh.terrainFaceId,
                terrainFaceBreakStrength: fromMesh.terrainFaceBreakStrength
            };
        }

        const terrainCell = this.nearestTerrainGeometryCell(field?.terrainGeometry, lat, lon);
        const terrainHeightMsl = Number.isFinite(Number(terrainCell?.heightM))
            ? Number(terrainCell.heightM)
            : (Number.isFinite(Number(field?.surfaceAltM)) ? Number(field.surfaceAltM) : null);
        return {
            terrainCell,
            terrainHeightMsl,
            terrainNormal: this.terrainNormalFromCell(terrainCell),
            terrainFaceId: null,
            terrainFaceBreakStrength: null
        };
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
        const terrainNormal = terrain.terrainNormal || this.terrainNormalFromCell(terrain.terrainCell);
        const clearanceAgl = Number.isFinite(terrain.terrainHeightMsl)
            ? Math.max(0, baseHeight - terrain.terrainHeightMsl)
            : Number(field?.level?.agl_m) || 0;
        const terrainWeight = this.clamp01(1 - clearanceAgl / 480);
        const projected = this.projectVectorToTerrain({ e: u, n: v, u: 0 }, terrainNormal);
        const stability = this.stabilityFromBracket(bracket);
        const n2 = this.bruntVaisalaN2FromBracket(bracket);
        const dampingS = this.verticalDampingFromN2(n2, terrainWeight);
        const wRaw = projected.u;
        const hWind = Math.hypot(projected.e, projected.n);
        const maxVerticalMs = Number.isFinite(Number(field?.model?.maxVerticalMs))
            ? Number(field.model.maxVerticalMs)
            : 4.0;
        const maxVerticalRatio = Number.isFinite(Number(field?.model?.maxVerticalRatio))
            ? Number(field.model.maxVerticalRatio)
            : 0.35;
        const wCap = Math.max(0.2, Math.min(maxVerticalMs, hWind * maxVerticalRatio + 0.5));
        const wMs = Math.max(-wCap, Math.min(wCap, wRaw));
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
            buoyancy_n2_s2: n2,
            vertical_damping_s: dampingS,
            w_equilibrium_ms: wRaw,
            vertical_momentum_ms: wMs,
            vertical_displacement_m: Number.isFinite(Number(prevState?.vertical_displacement_m))
                ? Number(prevState.vertical_displacement_m)
                : 0,
            flow_state: flowState,
            termination_reason: null,
            terrain_face_id: terrain.terrainFaceId || null,
            terrain_face_break_strength: Number.isFinite(Number(terrain.terrainFaceBreakStrength))
                ? Number(terrain.terrainFaceBreakStrength)
                : null,
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
                const terrainSample = this.sampleTerrainWithSampler(cfg.terrainSampler || null, lat, lon);
                const terrainCell = terrainSample?.terrainCell || this.nearestTerrainGeometryCell(cfg.terrainGeometry, lat, lon);
                const terrainHeightMsl = Number.isFinite(Number(terrainSample?.terrainHeightMsl))
                    ? Number(terrainSample.terrainHeightMsl)
                    : (Number.isFinite(Number(terrainCell?.heightM))
                        ? Number(terrainCell.heightM)
                        : (Number.isFinite(cfg.surfaceAltM) ? cfg.surfaceAltM : null));

                const targetAltMsl = Number.isFinite(terrainHeightMsl)
                    ? terrainHeightMsl + cfg.aglM
                    : (Number.isFinite(cfg.profileWind?.targetAltMsl) ? Number(cfg.profileWind.targetAltMsl) : null);

                const profileSample = this.sampleWindAtAltitude(cfg.tempLevels, targetAltMsl);
                const u = Number.isFinite(profileSample?.u_ms) ? Number(profileSample.u_ms) : 0;
                const v = Number.isFinite(profileSample?.v_ms) ? Number(profileSample.v_ms) : 0;
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
                    tempDeltaK: Number(cfg.tempDeltaKBase) || 0,
                    convergence: 0,
                    shear: 0,
                    confidence: 0.8,
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

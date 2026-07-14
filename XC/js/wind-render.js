// js/wind-render.js
// TermikaXC v2.6 - WIND MVP streamline renderer for Cesium.
// This module is opt-in; no existing scene state is changed until renderField() is called.

window.WindRender = {
    VERSION: "2.6.9-wind-mvp.1",

    dataSourceName: "WIND_STREAMLINES",

    defaultStyle: {
        seedEvery: 4,
        maxSteps: 45,
        stepMeters: 90,
        minSpeedMs: 0.2,
        minHorizontalSpeedMs: 0.15,
        minClearanceM: 6,
        maxCollisionRetries: 5,
        lineWidthMin: 1,
        lineWidthMax: 4,
        alpha: 0.9,
        heightOffsetM: 24,
        colorMode: "tempDeltaK",
        colorTheme: "dark",
        animationEnabled: false,
        animationTrailSeconds: 2.0,
        animationSamples: 6,
        animationSpeedFactor: 8,
        animationMinSegmentM: 80,
        animationMaxSegmentM: 420
    },

    clear: function (viewer) {
        if (!viewer?.dataSources) return;

        const existing = viewer.dataSources
            .getByName(this.dataSourceName)
            .slice();

        existing.forEach((ds) => {
            viewer.dataSources.remove(ds, true);
        });
    },

    renderField: async function (viewer, field, style = {}) {
        if (!viewer || !window.Cesium || !field?.cells?.length) {
            return { rendered: 0, reason: "Viewer, Cesium, or field data missing." };
        }

        this.clear(viewer);

        const cfg = { ...this.defaultStyle, ...style };
        const ds = new Cesium.CustomDataSource(this.dataSourceName);

        const streamlines = this.buildStreamlines(field, cfg);
        let rendered = 0;

        streamlines.forEach((line) => {
            if (!line.points || line.points.length < 2) return;

            const speedMs = Number(line.speedMs) || 0;
            if (speedMs < cfg.minSpeedMs) return;

            const color = this.resolveLineColor(line, cfg);
            const width = this.widthForSpeed(speedMs, cfg.lineWidthMin, cfg.lineWidthMax);
            const useMslHeight = Number.isFinite(Number(line.heightMsl));

            const positions = line.points.map((p) =>
                Cesium.Cartesian3.fromDegrees(
                    p.lon,
                    p.lat,
                    useMslHeight
                        ? Number(p.heightMsl) + cfg.heightOffsetM
                        : Math.max(0, (p.heightM || 0) + cfg.heightOffsetM)
                )
            );

            ds.entities.add({
                polyline: {
                    positions,
                    width,
                    material: color,
                    clampToGround: !useMslHeight
                },
                properties: {
                    type: "WIND_STREAMLINE",
                    speed_ms: speedMs,
                    dir_deg: line.dirDeg,
                    tempDeltaK: line.tempDeltaK,
                    convergence: line.convergence,
                    flow_state: line.flowState,
                    termination_reason: line.terminationReason
                }
            });

            const tip = line.points[line.points.length - 1];
            if (tip) {
                ds.entities.add({
                    position: Cesium.Cartesian3.fromDegrees(
                        tip.lon,
                        tip.lat,
                        useMslHeight
                            ? Number(tip.heightMsl) + cfg.heightOffsetM
                            : Math.max(0, (tip.heightM || 0) + cfg.heightOffsetM)
                    ),
                    point: {
                        pixelSize: 4,
                        color,
                        outlineColor: Cesium.Color.BLACK.withAlpha(0.45),
                        outlineWidth: 1
                    },
                    properties: {
                        type: "WIND_ARROW_TIP",
                        speed_ms: speedMs,
                        dir_deg: line.dirDeg,
                        tempDeltaK: line.tempDeltaK,
                        flow_state: line.flowState
                    }
                });
            }

            if (cfg.animationEnabled) {
                this.addAnimatedVectorSegment(ds, positions, speedMs, color, width, cfg, field.radiusM);
            }

            rendered += 1;
        });

        viewer.dataSources.add(ds);
        return { rendered, streamlines: streamlines.length };
    },

    buildStreamlines: function (field, style) {
        if (!window.WindField) {
            throw new Error("WindField module is required before WindRender.");
        }

        const lines = [];
        const seedEvery = Math.max(1, Number(style.seedEvery) || 4);
        const maxSteps = Math.max(2, Number(style.maxSteps) || 45);
        const stepMeters = Math.max(10, Number(style.stepMeters) || 90);

        const metersPerDegLat = 111320;
        const centerLat = Number(field.center?.lat) || 0;
        const metersPerDegLon = 111320 * Math.cos((centerLat * Math.PI) / 180);

        field.cells.forEach((seed) => {
            if ((seed.row % seedEvery !== 0) || (seed.col % seedEvery !== 0)) {
                return;
            }

            const points = [];
            let lat = Number(seed.lat);
            let lon = Number(seed.lon);
            let heightMsl = Number.isFinite(Number(seed.height_msl))
                ? Number(seed.height_msl)
                : (Number.isFinite(Number(seed.terrain_height_msl)) ? Number(seed.terrain_height_msl) + (Number(seed.agl_m) || 0) : null);
            let lastCell = seed;
            let terminationReason = "MAX_STEPS";
            const flowStates = [];

            for (let i = 0; i < maxSteps; i += 1) {
                const cell = window.WindField.nearestCell(field, lat, lon);
                if (!cell) {
                    terminationReason = "NUMERICAL_FAILURE";
                    break;
                }
                if ((Number(cell.speed_ms) || 0) < style.minSpeedMs) {
                    terminationReason = "PHYSICAL_STAGNATION";
                    break;
                }

                const terrainHere = Number.isFinite(Number(cell.terrain_height_msl))
                    ? Number(cell.terrain_height_msl)
                    : (Number.isFinite(Number(seed.terrain_height_msl)) ? Number(seed.terrain_height_msl) : null);

                if (!Number.isFinite(heightMsl) && Number.isFinite(terrainHere)) {
                    heightMsl = terrainHere + Math.max(Number(style.minClearanceM) || 6, Number(cell.clearance_agl) || 0);
                }

                points.push({
                    lat,
                    lon,
                    heightM: Number.isFinite(Number(cell.clearance_agl)) ? Number(cell.clearance_agl) : (field.level?.agl_m || 0),
                    heightMsl,
                    flow_state: cell.flow_state || "ATTACHED"
                });
                flowStates.push(cell.flow_state || "ATTACHED");

                const stepResult = this.integrateStep3D(field, cell, {
                    lat,
                    lon,
                    heightMsl
                }, {
                    stepMeters,
                    minHorizontalSpeedMs: style.minHorizontalSpeedMs,
                    minClearanceM: style.minClearanceM,
                    maxCollisionRetries: style.maxCollisionRetries,
                    metersPerDegLat,
                    metersPerDegLon
                });

                if (!stepResult.accepted) {
                    terminationReason = stepResult.reason;
                    break;
                }

                lat = stepResult.lat;
                lon = stepResult.lon;
                heightMsl = stepResult.heightMsl;
                lastCell = stepResult.cell || cell;

                const dNorth = (lat - field.center.lat) * metersPerDegLat;
                const dEast = (lon - field.center.lon) * metersPerDegLon;
                if (Math.hypot(dNorth, dEast) > field.radiusM) {
                    terminationReason = "FOCUS_EXIT";
                    break;
                }
            }

            if (points.length >= 2) {
                lines.push({
                    points,
                    speedMs: lastCell.speed_ms,
                    dirDeg: lastCell.dir_deg,
                    tempDeltaK: lastCell.tempDeltaK,
                    convergence: lastCell.convergence,
                    heightMsl: Number.isFinite(Number(lastCell.height_msl)) ? Number(lastCell.height_msl) : heightMsl,
                    flowState: this.resolveDominantFlowState(flowStates),
                    terminationReason
                });
            }
        });

        return lines;
    },

    integrateStep3D: function (field, cell, state, cfg) {
        const u = Number(cell.u_ms) || 0;
        const v = Number(cell.v_ms) || 0;
        const w = Number(cell.w_ms) || 0;
        const hSpeed = Math.max(Number(cfg.minHorizontalSpeedMs) || 0.15, Math.hypot(u, v));

        let dt = Math.max(0.05, Number(cfg.stepMeters) / hSpeed);
        const minClearance = Math.max(0, Number(cfg.minClearanceM) || 6);
        const retries = Math.max(1, Number(cfg.maxCollisionRetries) || 5);

        for (let attempt = 0; attempt < retries; attempt += 1) {
            const latTrial = state.lat + (v * dt) / cfg.metersPerDegLat;
            const lonTrial = state.lon + (u * dt) / cfg.metersPerDegLon;
            const zTrial = (Number.isFinite(Number(state.heightMsl)) ? Number(state.heightMsl) : Number(cell.height_msl) || 0) + w * dt;

            const trialCell = window.WindField.nearestCell(field, latTrial, lonTrial);
            const terrainTrial = Number.isFinite(Number(trialCell?.terrain_height_msl))
                ? Number(trialCell.terrain_height_msl)
                : Number(cell.terrain_height_msl);

            if (Number.isFinite(terrainTrial) && zTrial <= terrainTrial + minClearance) {
                dt *= 0.5;
                continue;
            }

            return {
                accepted: true,
                lat: latTrial,
                lon: lonTrial,
                heightMsl: zTrial,
                cell: trialCell || cell,
                dt
            };
        }

        return { accepted: false, reason: "NUMERICAL_FAILURE" };
    },

    resolveDominantFlowState: function (states) {
        if (!Array.isArray(states) || !states.length) return "ATTACHED";

        if (states.includes("SEPARATED")) return "SEPARATED";
        if (states.includes("SEPARATING")) return "SEPARATING";
        if (states.includes("REATTACHING")) return "REATTACHING";
        return "ATTACHED";
    },

    colorForTempDelta: function (deltaK, alpha, theme = "dark") {
        const d = Number(deltaK) || 0;
        const neutral = theme === "light" ? "#4F5D75" : "#B0BEC5";

        if (d <= -2) return Cesium.Color.fromCssColorString("#1E88E5").withAlpha(alpha);
        if (d >= 2) return Cesium.Color.fromCssColorString("#FFB300").withAlpha(alpha);
        return Cesium.Color.fromCssColorString(neutral).withAlpha(alpha);
    },

    colorForSpeed: function (speedMs, alpha, theme = "dark") {
        const s = Math.max(0, Math.min(12, Number(speedMs) || 0));
        const t = s / 12;
        const start = theme === "light" ? [44, 123, 182] : [96, 165, 250];
        const end = theme === "light" ? [214, 40, 40] : [255, 107, 107];
        const r = Math.round(start[0] + (end[0] - start[0]) * t);
        const g = Math.round(start[1] + (end[1] - start[1]) * t);
        const b = Math.round(start[2] + (end[2] - start[2]) * t);
        return Cesium.Color.fromBytes(r, g, b, Math.round(alpha * 255));
    },

    colorForConvergence: function (convergence, alpha) {
        const c = Math.max(-0.03, Math.min(0.03, Number(convergence) || 0));
        if (c >= 0.01) return Cesium.Color.fromCssColorString("#00ACC1").withAlpha(alpha);
        if (c <= -0.01) return Cesium.Color.fromCssColorString("#AB47BC").withAlpha(alpha);
        return Cesium.Color.fromCssColorString("#90A4AE").withAlpha(alpha);
    },

    resolveLineColor: function (line, cfg) {
        const mode = String(cfg.colorMode || "tempDeltaK");
        const theme = String(cfg.colorTheme || "dark");
        const alpha = Number(cfg.alpha) || 0.9;

        if (mode === "speed") {
            return this.colorForSpeed(line.speedMs, alpha, theme);
        }
        if (mode === "convergence") {
            return this.colorForConvergence(line.convergence, alpha);
        }
        return this.colorForTempDelta(line.tempDeltaK, alpha, theme);
    },

    widthForSpeed: function (speedMs, minW, maxW) {
        const s = Math.max(0, Math.min(12, Number(speedMs) || 0));
        const t = s / 12;
        return minW + (maxW - minW) * t;
    },

    addAnimatedVectorSegment: function (dataSource, positions, speedMs, color, width, cfg, focusRadiusM) {
        if (!Array.isArray(positions) || positions.length < 2) return;

        const lengths = this.polylineLengths(positions);
        const totalLength = lengths.total;
        if (!(totalLength > 1)) return;

        const startTime = Cesium.JulianDate.now();
        const speed = Math.max(0.5, Number(speedMs) || 0.5);
        const trailSeconds = Math.max(0.6, Math.min(6, Number(cfg.animationTrailSeconds) || 2));
        const minSegment = Math.max(20, Number(cfg.animationMinSegmentM) || 80);
        const maxSegment = Math.max(minSegment, Number(cfg.animationMaxSegmentM) || 420);
        const segmentLengthM = Math.max(minSegment, Math.min(maxSegment, Math.min(totalLength * 0.45, speed * trailSeconds * 16)));
        const focusScale = Math.max(0.7, Math.min(2.4, (Number(focusRadiusM) || 1200) / 1200));
        const visualSpeedFactor = Math.max(1, Math.min(18, Number(cfg.animationSpeedFactor) || 8));
        const advectionSpeedMps = speed * focusScale * visualSpeedFactor;
        const sampleCount = Math.max(3, Math.min(12, Number(cfg.animationSamples) || 6));

        const arrowMaterial = Cesium.PolylineArrowMaterialProperty
            ? new Cesium.PolylineArrowMaterialProperty(color)
            : color;

        dataSource.entities.add({
            polyline: {
                positions: new Cesium.CallbackProperty((time) => {
                    const elapsed = Math.abs(Cesium.JulianDate.secondsDifference(time, startTime));
                    const headDistance = (elapsed * advectionSpeedMps) % totalLength;
                    const tailDistance = Math.max(0, headDistance - segmentLengthM);
                    return this.samplePolylineWindow(
                        positions,
                        lengths.cumulative,
                        totalLength,
                        tailDistance,
                        headDistance,
                        sampleCount
                    );
                }, false),
                width: Math.max(2.4, width + 1.4),
                material: arrowMaterial,
                clampToGround: false
            },
            properties: {
                type: "WIND_ANIMATED_VECTOR",
                speed_ms: speed,
                trail_seconds: trailSeconds,
                segment_length_m: segmentLengthM,
                advection_speed_mps: advectionSpeedMps,
                focus_scale: focusScale,
                flow_state: "ANIMATED"
            }
        });
    },

    polylineLengths: function (positions) {
        const cumulative = [0];
        let total = 0;
        for (let i = 1; i < positions.length; i += 1) {
            const seg = Cesium.Cartesian3.distance(positions[i - 1], positions[i]);
            total += seg;
            cumulative.push(total);
        }
        return { cumulative, total };
    },

    samplePolylineWindow: function (positions, cumulative, totalLength, fromDistance, toDistance, sampleCount) {
        if (toDistance <= fromDistance) {
            const p = this.samplePolylinePositionAtDistance(positions, cumulative, totalLength, toDistance);
            return [p, p];
        }

        const out = [];
        const span = toDistance - fromDistance;
        for (let i = 0; i < sampleCount; i += 1) {
            const t = i / Math.max(1, sampleCount - 1);
            const d = fromDistance + span * t;
            out.push(this.samplePolylinePositionAtDistance(positions, cumulative, totalLength, d));
        }
        return out;
    },

    samplePolylinePositionAtDistance: function (positions, cumulative, totalLength, distanceM) {
        const target = Math.max(0, Math.min(totalLength, distanceM));
        for (let i = 1; i < cumulative.length; i += 1) {
            if (target > cumulative[i]) continue;

            const prevL = cumulative[i - 1];
            const nextL = cumulative[i];
            const segLen = Math.max(1e-6, nextL - prevL);
            const localT = (target - prevL) / segLen;
            return Cesium.Cartesian3.lerp(positions[i - 1], positions[i], localT, new Cesium.Cartesian3());
        }
        return positions[positions.length - 1];
    },

    samplePolylinePosition: function (positions, cumulative, totalLength, t) {
        const target = Math.max(0, Math.min(totalLength, totalLength * t));
        return this.samplePolylinePositionAtDistance(positions, cumulative, totalLength, target);
    }
};

// js/wind-render.js
// TermikaXC v2.6 - WIND MVP streamline renderer for Cesium.
// This module is opt-in; no existing scene state is changed until renderField() is called.

window.WindRender = {
    VERSION: "2.6.9-wind-mvp.1",

    dataSourceName: "WIND_STREAMLINES",

    baseStreamlineColor: "#70E8FF",

    defaultStyle: {
        seedEvery: 4,
        maxSteps: 45,
        stepMeters: 90,
        focusEdgeBufferM: 120,
        minSpeedMs: 0.2,
        minHorizontalSpeedMs: 0.15,
        maxStepDtS: 8,
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
                this.addAnimatedVectorSegment(ds, line, positions, speedMs, color, width, cfg, field.radiusM);
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
        const focusEdgeBufferM = Math.max(0, Math.min(Number(field.radiusM) || 0, Number(style.focusEdgeBufferM) || 120));
        const safeFocusRadiusM = Math.max(0, (Number(field.radiusM) || 0) - focusEdgeBufferM);

        const metersPerDegLat = 111320;
        const centerLat = Number(field.center?.lat) || 0;
        const metersPerDegLon = 111320 * Math.cos((centerLat * Math.PI) / 180);

        field.cells.forEach((seed) => {
            if ((seed.row % seedEvery !== 0) || (seed.col % seedEvery !== 0)) {
                return;
            }

            const seedNorth = (Number(seed.lat) - Number(field.center?.lat || 0)) * metersPerDegLat;
            const seedEast = (Number(seed.lon) - Number(field.center?.lon || 0)) * metersPerDegLon;
            if (Math.hypot(seedNorth, seedEast) > safeFocusRadiusM) {
                return;
            }

            const points = [];
            let state = {
                lat: Number(seed.lat),
                lon: Number(seed.lon),
                height_msl: Number.isFinite(Number(seed.height_msl))
                    ? Number(seed.height_msl)
                    : (Number.isFinite(Number(seed.terrain_height_msl)) ? Number(seed.terrain_height_msl) + (Number(seed.agl_m) || 0) : null),
                w_ms: Number(seed.w_ms) || 0,
                vertical_momentum_ms: Number(seed.w_ms) || 0,
                flow_state: seed.flow_state || "ATTACHED"
            };
            let lastSample = null;
            let terminationReason = "MAX_STEPS";

            for (let i = 0; i < maxSteps; i += 1) {
                const sample = window.WindField.sampleWindVector3D(field, state.lat, state.lon, state.height_msl, state);
                if (!sample?.valid) {
                    terminationReason = sample?.reason || "VALIDITY_END";
                    break;
                }
                if ((Number(sample.speed_ms) || 0) < style.minSpeedMs) {
                    terminationReason = "PHYSICAL_STAGNATION";
                    break;
                }

                points.push({
                    lat: sample.lat,
                    lon: sample.lon,
                    heightM: Number.isFinite(Number(sample.clearance_agl)) ? Number(sample.clearance_agl) : (field.level?.agl_m || 0),
                    heightMsl: sample.height_msl,
                    u_ms: sample.u_ms,
                    v_ms: sample.v_ms,
                    w_ms: sample.w_ms,
                    flow_state: sample.flow_state || "ATTACHED"
                });
                lastSample = sample;

                const dNorthNow = (sample.lat - field.center.lat) * metersPerDegLat;
                const dEastNow = (sample.lon - field.center.lon) * metersPerDegLon;
                if (Math.hypot(dNorthNow, dEastNow) > safeFocusRadiusM) {
                    terminationReason = "FOCUS_EDGE_BUFFER";
                    break;
                }

                const stepResult = this.integrateStep3D(field, sample, state, {
                    stepMeters,
                    minHorizontalSpeedMs: style.minHorizontalSpeedMs,
                    maxStepDtS: style.maxStepDtS,
                    minClearanceM: style.minClearanceM,
                    maxCollisionRetries: style.maxCollisionRetries,
                    metersPerDegLat,
                    metersPerDegLon
                });

                if (!stepResult.accepted) {
                    terminationReason = stepResult.reason;
                    break;
                }

                state = stepResult.state;

                const dNorth = (state.lat - field.center.lat) * metersPerDegLat;
                const dEast = (state.lon - field.center.lon) * metersPerDegLon;
                if (Math.hypot(dNorth, dEast) > field.radiusM) {
                    terminationReason = "LEFT_FOCUS";
                    break;
                }
            }

            if (points.length >= 2) {
                lines.push({
                    points,
                    speedMs: lastSample?.speed_ms,
                    dirDeg: lastSample?.dir_deg,
                    tempDeltaK: lastSample?.tempDeltaK,
                    convergence: lastSample?.convergence,
                    heightMsl: Number.isFinite(Number(lastSample?.height_msl)) ? Number(lastSample.height_msl) : state.height_msl,
                    flowState: lastSample?.flow_state || "ATTACHED",
                    terminationReason
                });
            }
        });

        return lines;
    },

    integrateStep3D: function (field, sample, state, cfg) {
        const currentVector = {
            u: Number(sample.u_ms) || 0,
            v: Number(sample.v_ms) || 0,
            w: Number(sample.w_ms) || 0
        };
        const hSpeedRaw = Math.hypot(currentVector.u, currentVector.v);
        if (hSpeedRaw < (Number(cfg.minHorizontalSpeedMs) || 0.15)) {
            return { accepted: false, reason: "PHYSICAL_STAGNATION", state };
        }
        const hSpeed = hSpeedRaw;
        const minClearance = Math.max(0, Number(cfg.minClearanceM) || 6);
        const maxStepDtS = Math.max(0.2, Number(cfg.maxStepDtS) || 8);
        const retries = Math.max(1, Number(cfg.maxCollisionRetries) || 5);
        const previousHeading = Math.atan2(Number(state.u_ms) || 0, Number(state.v_ms) || 0);
        const currentHeading = Math.atan2(currentVector.u, currentVector.v);
        const turnDeltaDeg = this.angularDeltaDeg((currentHeading * 180) / Math.PI, (previousHeading * 180) / Math.PI);
        const terrainPenalty = sample.clearance_agl < 35 ? 0.35 : (sample.clearance_agl < 90 ? 0.65 : 1);
        const turnPenalty = turnDeltaDeg > 50 ? 0.35 : (turnDeltaDeg > 25 ? 0.55 : 1);
        const baseDt = Math.max(0.05, Number(cfg.stepMeters) / hSpeed);
        let dt = baseDt * terrainPenalty * turnPenalty;
        dt = Math.min(dt, maxStepDtS);
        const prevW = Number(state.w_ms) || 0;

        for (let attempt = 0; attempt < retries; attempt += 1) {
            const latTrial = state.lat + (currentVector.v * dt) / cfg.metersPerDegLat;
            const lonTrial = state.lon + (currentVector.u * dt) / cfg.metersPerDegLon;
            const wTrialRaw = currentVector.w + prevW * Math.max(0.55, 0.9 - 0.18 * (sample.stability_index || 0));
            const maxVerticalMs = Number.isFinite(Number(field?.model?.maxVerticalMs))
                ? Number(field.model.maxVerticalMs)
                : 4.0;
            const maxVerticalRatio = Number.isFinite(Number(field?.model?.maxVerticalRatio))
                ? Number(field.model.maxVerticalRatio)
                : 0.35;
            const wCap = Math.max(0.2, Math.min(maxVerticalMs, hSpeed * maxVerticalRatio + 0.5));
            const wTrial = Math.max(-wCap, Math.min(wCap, wTrialRaw));
            const zTrial = (Number.isFinite(Number(state.height_msl)) ? Number(state.height_msl) : Number(sample.height_msl) || 0) + wTrial * dt;

            const nextSample = window.WindField.sampleWindVector3D(field, latTrial, lonTrial, zTrial, {
                vertical_momentum_ms: wTrial,
                w_ms: wTrial,
                u_ms: currentVector.u,
                v_ms: currentVector.v
            });

            if (!nextSample?.valid) {
                return { accepted: false, reason: nextSample?.reason || "VALIDITY_END", state };
            }

            if (Number.isFinite(nextSample.terrain_height_msl) && zTrial <= nextSample.terrain_height_msl + minClearance) {
                dt *= 0.5;
                continue;
            }

            const headingChange = this.angularDeltaDeg(
                (Math.atan2(Number(nextSample.u_ms) || 0, Number(nextSample.v_ms) || 0) * 180) / Math.PI,
                (currentHeading * 180) / Math.PI
            );
            if (headingChange > 55 || (Number(nextSample.clearance_agl) || 0) < minClearance * 2) {
                dt *= 0.5;
                continue;
            }

            return {
                accepted: true,
                state: {
                    lat: nextSample.lat,
                    lon: nextSample.lon,
                    height_msl: nextSample.height_msl,
                    u_ms: nextSample.u_ms,
                    v_ms: nextSample.v_ms,
                    w_ms: nextSample.w_ms,
                    vertical_momentum_ms: nextSample.vertical_momentum_ms,
                    flow_state: nextSample.flow_state,
                    termination_reason: nextSample.termination_reason || null
                },
                dt
            };
        }

        return { accepted: false, reason: "NUMERICAL_FAILURE", state };
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
        const neutral = this.baseStreamlineColor;

        if (d <= -2) return Cesium.Color.fromCssColorString("#1E88E5").withAlpha(alpha);
        if (d >= 2) return Cesium.Color.fromCssColorString("#FFB300").withAlpha(alpha);
        return Cesium.Color.fromCssColorString(neutral).withAlpha(alpha);
    },

    colorForSpeed: function (speedMs, alpha, theme = "dark") {
        const s = Math.max(0, Math.min(12, Number(speedMs) || 0));
        const t = s / 12;
        const start = theme === "light" ? [112, 232, 255] : [112, 232, 255];
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

    angularDeltaDeg: function (aDeg, bDeg) {
        const diff = ((((Number(aDeg) || 0) - (Number(bDeg) || 0)) % 360) + 540) % 360 - 180;
        return Math.abs(diff);
    },

    darkenColor: function (color, factor = 0.72, alpha = null) {
        const safeFactor = Math.max(0, Math.min(1, Number(factor) || 0.72));
        const baseAlpha = Number.isFinite(alpha) ? alpha : (Number(color?.alpha) || 1);
        return new Cesium.Color(
            Math.max(0, Math.min(1, Number(color?.red) || 0) * safeFactor),
            Math.max(0, Math.min(1, Number(color?.green) || 0) * safeFactor),
            Math.max(0, Math.min(1, Number(color?.blue) || 0) * safeFactor),
            Math.max(0, Math.min(1, baseAlpha))
        );
    },

    animationZoneProfile: function (line, cfg, totalLength) {
        const points = Array.isArray(line?.points) ? line.points : [];
        const safeTotal = Math.max(1, Number(totalLength) || 1);
        const baseHeightOffsetM = Number(cfg.heightOffsetM) || 24;
        let crestIndex = 0;
        let crestHeightMsl = Number.NEGATIVE_INFINITY;
        let crestDistanceM = 0;

        points.forEach((point, index) => {
            const height = Number(point.heightMsl);
            if (!Number.isFinite(height)) return;
            if (height > crestHeightMsl) {
                crestHeightMsl = height;
                crestIndex = index;
            }
        });

        const cumulative = this.polylineLengths(points.map((point) => Cesium.Cartesian3.fromDegrees(point.lon, point.lat, Number(point.heightMsl) || 0))).cumulative;
        crestDistanceM = Array.isArray(cumulative) && cumulative.length > crestIndex ? cumulative[crestIndex] : 0;
        const crestProgress = crestDistanceM / safeTotal;

        const flowState = String(line?.flowState || "ATTACHED");
        const ridgeBoost = flowState === "SEPARATED" ? 1.55 : (flowState === "SEPARATING" ? 1.35 : (flowState === "REATTACHING" ? 1.18 : 1.0));
        const leeBoost = flowState === "SEPARATED" ? 1.3 : (flowState === "SEPARATING" ? 1.18 : 1.0);
        const baseCountScale = flowState === "SEPARATED" ? 1.35 : (flowState === "SEPARATING" ? 1.22 : 1.0);
        const baseLengthScale = flowState === "SEPARATED" ? 0.72 : (flowState === "SEPARATING" ? 0.82 : 1.0);
        const crestSpan = Math.max(0.08, Math.min(0.22, (Number(line?.heightMsl) || 0) > 0 ? 0.14 : 0.12));

        return {
            baseHeightOffsetM,
            crestHeightOffsetM: baseHeightOffsetM + 12 * ridgeBoost,
            leeHeightOffsetM: baseHeightOffsetM + 6 * leeBoost,
            windwardHeightOffsetM: baseHeightOffsetM + 2 * leeBoost,
            crestProgress,
            crestSpan,
            crestBoost: ridgeBoost,
            leeBoost,
            baseCountScale,
            baseLengthScale,
            darkenFactor: flowState === "SEPARATED" ? 0.54 : (flowState === "SEPARATING" ? 0.62 : 0.72)
        };
    },

    sampleLinePointAtDistance: function (linePoints, cumulative, totalLength, distanceM, liftM = 0) {
        const target = Math.max(0, Math.min(totalLength, distanceM));
        for (let i = 1; i < cumulative.length; i += 1) {
            if (target > cumulative[i]) continue;

            const prevL = cumulative[i - 1];
            const nextL = cumulative[i];
            const segLen = Math.max(1e-6, nextL - prevL);
            const localT = (target - prevL) / segLen;
            const a = linePoints[i - 1];
            const b = linePoints[i];
            const lat = Number(a.lat) + (Number(b.lat) - Number(a.lat)) * localT;
            const lon = Number(a.lon) + (Number(b.lon) - Number(a.lon)) * localT;
            const heightMsl = (Number(a.heightMsl) || 0) + ((Number(b.heightMsl) || 0) - (Number(a.heightMsl) || 0)) * localT + liftM;
            return Cesium.Cartesian3.fromDegrees(lon, lat, heightMsl);
        }
        const last = linePoints[linePoints.length - 1];
        return Cesium.Cartesian3.fromDegrees(Number(last.lon), Number(last.lat), (Number(last.heightMsl) || 0) + liftM);
    },

    addAnimatedVectorSegment: function (dataSource, line, positions, speedMs, color, width, cfg, focusRadiusM) {
        if (!Array.isArray(positions) || positions.length < 2) return;

        const lengths = this.polylineLengths(positions);
        const totalLength = lengths.total;
        if (!(totalLength > 1)) return;

        const startMs = (typeof performance !== "undefined" && performance.now)
            ? performance.now()
            : Date.now();
        const speed = Math.max(0.5, Number(speedMs) || 0.5);
        const trailSeconds = Math.max(0.6, Math.min(6, Number(cfg.animationTrailSeconds) || 2));
        const minSegment = Math.max(20, Number(cfg.animationMinSegmentM) || 80);
        const maxSegment = Math.max(minSegment, Number(cfg.animationMaxSegmentM) || 420);
        const focusScale = Math.max(0.7, Math.min(2.4, (Number(focusRadiusM) || 1200) / 1200));
        const visualSpeedFactor = Math.max(1, Math.min(18, Number(cfg.animationSpeedFactor) || 8));
        const advectionSpeedMps = speed * focusScale * visualSpeedFactor;
        const sampleCount = Math.max(3, Math.min(12, Number(cfg.animationSamples) || 6));
        const zone = this.animationZoneProfile(line, cfg, totalLength);
        const baseDashLengthM = Math.max(
            minSegment * zone.baseLengthScale,
            Math.min(maxSegment, Math.min(totalLength * 0.45, speed * trailSeconds * 14))
        );
        const baseGapLengthM = Math.max(
            12,
            Math.min(
                Math.max(22, baseDashLengthM * 0.84),
                (220 / Math.max(0.5, speed)) * focusScale
            )
        );
        const baseCycleLengthM = Math.max(1, baseDashLengthM + baseGapLengthM);
        const dashCount = Math.max(2, Math.min(18, Math.ceil((totalLength / baseCycleLengthM) * zone.baseCountScale)));
        const dashColor = this.darkenColor(color, zone.darkenFactor, Math.min(1, (Number(cfg.alpha) || 0.9) * 0.94));
        const arrowMaterial = Cesium.PolylineArrowMaterialProperty
            ? new Cesium.PolylineArrowMaterialProperty(dashColor)
            : dashColor;

        for (let dashIndex = 0; dashIndex < dashCount; dashIndex += 1) {
            const phaseOffset = dashIndex * baseCycleLengthM;
            const segmentCenterDistance = (phaseOffset + baseDashLengthM * 0.5) % totalLength;
            const crestDistance = zone.crestProgress * totalLength;
            const distToCrest = Math.abs(segmentCenterDistance - crestDistance);
            const crestProximity = Math.max(0, 1 - distToCrest / Math.max(1, zone.crestSpan * totalLength));
            const inLeeSide = segmentCenterDistance >= crestDistance;
            const liftM = inLeeSide
                ? zone.leeHeightOffsetM + 10 * crestProximity
                : zone.windwardHeightOffsetM + 18 * crestProximity;
            const dashLengthM = Math.max(
                minSegment * (inLeeSide ? 0.86 : 0.72) * zone.baseLengthScale,
                Math.min(maxSegment, baseDashLengthM * (inLeeSide ? 0.9 : 0.76))
            );
            const gapLengthM = Math.max(
                10,
                Math.min(
                    Math.max(18, dashLengthM * (inLeeSide ? 0.72 : 0.86)),
                    baseGapLengthM * (inLeeSide ? 0.9 : 1.08)
                )
            );
            dataSource.entities.add({
                polyline: {
                    positions: new Cesium.CallbackProperty(() => {
                        const nowMs = (typeof performance !== "undefined" && performance.now)
                            ? performance.now()
                            : Date.now();
                        const elapsed = Math.max(0, (nowMs - startMs) / 1000);
                        const headDistance = (elapsed * advectionSpeedMps + phaseOffset) % totalLength;
                        const tailDistance = Math.max(0, headDistance - dashLengthM);
                        const segmentCenter = (headDistance + tailDistance) * 0.5;
                        const crestBlend = Math.max(0, 1 - Math.abs(segmentCenter - crestDistance) / Math.max(1, zone.crestSpan * totalLength));
                        const segmentLift = liftM + 8 * crestBlend;
                        const samplePositions = this.sampleLineWindowAtDistance(
                            line.points,
                            lengths.cumulative,
                            totalLength,
                            tailDistance,
                            headDistance,
                            sampleCount,
                            segmentLift
                        );
                        return samplePositions;
                    }, false),
                    width: Math.max(2.6, width + 1.2),
                    material: arrowMaterial,
                    clampToGround: false
                },
                properties: {
                    type: "WIND_ANIMATED_VECTOR",
                    speed_ms: speed,
                    trail_seconds: trailSeconds,
                    segment_length_m: dashLengthM,
                    gap_length_m: gapLengthM,
                    cycle_length_m: dashLengthM + gapLengthM,
                    dash_index: dashIndex,
                    dash_count: dashCount,
                    advection_speed_mps: advectionSpeedMps,
                    focus_scale: focusScale,
                    crest_progress: zone.crestProgress,
                    crest_span: zone.crestSpan,
                    crest_lift_m: zone.crestHeightOffsetM,
                    lee_lift_m: zone.leeHeightOffsetM,
                    flow_state: "ANIMATED"
                }
            });
        }
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

    sampleLineWindowAtDistance: function (linePoints, cumulative, totalLength, fromDistance, toDistance, sampleCount, liftM = 0) {
        if (toDistance <= fromDistance) {
            const p = this.sampleLinePointAtDistance(linePoints, cumulative, totalLength, toDistance, liftM);
            return [p, p];
        }

        const out = [];
        const span = toDistance - fromDistance;
        for (let i = 0; i < sampleCount; i += 1) {
            const t = i / Math.max(1, sampleCount - 1);
            const d = fromDistance + span * t;
            out.push(this.sampleLinePointAtDistance(linePoints, cumulative, totalLength, d, liftM));
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

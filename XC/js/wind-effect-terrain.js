// js/wind-effect-terrain.js
// TermikaXC v2.6 - terrain steering vplyv pre WIND pole.

(function () {
    if (!window.WindEffectsCore) {
        throw new Error("Najprv musi byt nacitany wind-effects-core.js.");
    }

    const clamp = function (value, min, max) {
        return Math.max(min, Math.min(max, Number(value) || 0));
    };

    const normalize3 = function (v) {
        const len = Math.hypot(v.e, v.n, v.u);
        if (!(len > 1e-9)) return { e: 0, n: 0, u: 1 };
        return { e: v.e / len, n: v.n / len, u: v.u / len };
    };

    const computeSurfaceNormal = function (slopeDeg, aspectDeg) {
        if (!Number.isFinite(slopeDeg) || !Number.isFinite(aspectDeg)) {
            return { e: 0, n: 0, u: 1 };
        }

        const slopeRad = (Math.max(0, Number(slopeDeg)) * Math.PI) / 180;
        const aspectRad = (Number(aspectDeg) * Math.PI) / 180;
        const tanSlope = Math.tan(slopeRad);

        // aspectDeg je smer najväčšieho poklesu (downslope).
        // Pre normálu potrebujeme gradient smerom nahor.
        const dzdx = -tanSlope * Math.sin(aspectRad);
        const dzdy = -tanSlope * Math.cos(aspectRad);

        return normalize3({
            e: -dzdx,
            n: -dzdy,
            u: 1
        });
    };

    const nearestTerrainCell = function (terrainCells, lat, lon) {
        let best = null;
        let bestDist = Number.POSITIVE_INFINITY;

        for (let i = 0; i < terrainCells.length; i += 1) {
            const t = terrainCells[i];
            const dLat = Number(t.lat) - lat;
            const dLon = Number(t.lon) - lon;
            const d2 = dLat * dLat + dLon * dLon;
            if (d2 < bestDist) {
                bestDist = d2;
                best = t;
            }
        }

        return best;
    };

    const buildEdgeSamples = function (terrainGeometry) {
        const mesh = terrainGeometry?.mesh;
        if (!mesh?.edges?.length || !mesh?.vertices?.length) return [];

        const vertexById = new Map(mesh.vertices.map((v) => [v.id, v]));
        const samples = [];

        mesh.edges.forEach((edge) => {
            const a = vertexById.get(edge.vertexIds?.[0]);
            const b = vertexById.get(edge.vertexIds?.[1]);
            if (!a || !b) return;

            samples.push({
                lat: (Number(a.lat) + Number(b.lat)) / 2,
                lon: (Number(a.lon) + Number(b.lon)) / 2,
                breakStrength: Number(edge.breakStrength) || 0,
                dihedralDeg: Number(edge.dihedralDeg),
                boundary: Boolean(edge.boundary)
            });
        });

        return samples;
    };

    const nearestEdgeSample = function (edgeSamples, lat, lon) {
        if (!Array.isArray(edgeSamples) || !edgeSamples.length) return null;

        let best = null;
        let bestDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i < edgeSamples.length; i += 1) {
            const e = edgeSamples[i];
            const dLat = Number(e.lat) - lat;
            const dLon = Number(e.lon) - lon;
            const d2 = dLat * dLat + dLon * dLon;
            if (d2 < bestDist) {
                bestDist = d2;
                best = e;
            }
        }

        return best;
    };

    const classifyFlowState = function (params) {
        const breakStrength = Number(params.breakStrength) || 0;
        const penetrationRemoved = Number(params.penetrationRemoved) || 0;
        const terrainWeight = Number(params.terrainWeight) || 0;
        const wMs = Number(params.wMs) || 0;
        const clearanceAgl = Number(params.clearanceAgl) || 0;

        if (breakStrength >= 0.65 && penetrationRemoved > 0.22 && terrainWeight > 0.45) {
            return "SEPARATING";
        }

        if (breakStrength >= 0.65 && wMs < -0.45 && clearanceAgl < 260) {
            return "SEPARATED";
        }

        if (breakStrength >= 0.35 && breakStrength < 0.65 && wMs > -0.15) {
            return "REATTACHING";
        }

        return "ATTACHED";
    };

    WindEffectsCore.registerEffect({
        id: "terrain-steering",
        title: "Terrain steering",
        order: 20,

        run: function (field, context) {
            const terrainCells = context?.terrainGeometry?.cells;
            if (!Array.isArray(terrainCells) || !terrainCells.length) {
                return;
            }

            const edgeSamples = buildEdgeSamples(context?.terrainGeometry);

            field.cells.forEach((cell) => {
                const terrain = nearestTerrainCell(terrainCells, Number(cell.lat), Number(cell.lon));
                if (!terrain) return;
                const nearestEdge = nearestEdgeSample(edgeSamples, Number(cell.lat), Number(cell.lon));

                const slopeDeg = Number(terrain.slopeDeg) || 0;
                const aspectDeg = Number(terrain.aspectDeg);
                const curvature = Number(terrain.curvature) || 0;
                const spacingM = Number(terrain.spacingM) || Number(field.spacingM) || 100;
                const curvatureScaled = curvature * spacingM * spacingM;
                const normal = computeSurfaceNormal(slopeDeg, aspectDeg);
                const clearanceAgl = Number.isFinite(Number(cell.clearance_agl))
                    ? Number(cell.clearance_agl)
                    : Math.max(1, Number(cell.agl_m) || 1);

                // Vplyv terénu je silnejší pri malom clearance a väčšom sklone.
                const slopeFactor = clamp((slopeDeg - 3) / 40, 0, 1);
                const proximityFactor = clamp(1 - clearanceAgl / 450, 0, 1);
                const terrainWeight = clamp(0.2 + 0.7 * slopeFactor * (0.25 + 0.75 * proximityFactor), 0, 0.95);

                const v0 = {
                    e: Number(cell.u_ms) || 0,
                    n: Number(cell.v_ms) || 0,
                    u: Number(cell.w_ms) || 0
                };

                // Nepenetrácia terénu: pri V·n < 0 odstráň zložku smerujúcu do povrchu.
                const dot = v0.e * normal.e + v0.n * normal.n + v0.u * normal.u;
                let vt = v0;
                let penetrationRemoved = 0;
                if (dot < 0) {
                    vt = {
                        e: v0.e - dot * normal.e,
                        n: v0.n - dot * normal.n,
                        u: v0.u - dot * normal.u
                    };
                    penetrationRemoved = Math.abs(dot);
                }

                cell.u_ms = v0.e * (1 - terrainWeight) + vt.e * terrainWeight;
                cell.v_ms = v0.n * (1 - terrainWeight) + vt.n * terrainWeight;
                cell.w_ms = v0.u * (1 - terrainWeight) + vt.u * terrainWeight;

                // Konkavne tvary tok jemne brzdia, konvexne tvary jemne urychluju.
                const speedScale = 1 + clamp(-curvatureScaled / 10, -0.18, 0.18);
                cell.u_ms *= speedScale;
                cell.v_ms *= speedScale;
                cell.w_ms *= Math.max(0.85, speedScale);
                cell.speed_ms = Math.hypot(cell.u_ms, cell.v_ms, cell.w_ms);
                cell.dir_deg = ((Math.atan2(cell.u_ms, cell.v_ms) * 180) / Math.PI + 360) % 360;

                const flowState = classifyFlowState({
                    breakStrength: nearestEdge?.breakStrength,
                    penetrationRemoved,
                    terrainWeight,
                    wMs: cell.w_ms,
                    clearanceAgl
                });
                cell.flow_state = flowState;

                if (flowState === "SEPARATED") {
                    cell.confidence = clamp((Number(cell.confidence) || 0.6) - 0.2, 0.2, 0.99);
                } else if (flowState === "SEPARATING") {
                    cell.confidence = clamp((Number(cell.confidence) || 0.6) - 0.1, 0.2, 0.99);
                } else {
                    cell.confidence = clamp((Number(cell.confidence) || 0.6) + 0.06, 0, 0.99);
                }

                cell.terrainInfluence = {
                    slope_deg: slopeDeg,
                    aspect_deg: Number.isFinite(aspectDeg) ? aspectDeg : null,
                    normal_east: normal.e,
                    normal_north: normal.n,
                    normal_up: normal.u,
                    terrain_weight: terrainWeight,
                    clearance_agl: clearanceAgl,
                    penetration_removed: penetrationRemoved,
                    nearest_edge_break_strength: Number(nearestEdge?.breakStrength) || 0,
                    nearest_edge_dihedral_deg: Number.isFinite(Number(nearestEdge?.dihedralDeg))
                        ? Number(nearestEdge.dihedralDeg)
                        : null,
                    nearest_edge_boundary: Boolean(nearestEdge?.boundary),
                    curvature_scaled: curvatureScaled,
                    speed_scale: speedScale
                };
            });
        }
    });
})();

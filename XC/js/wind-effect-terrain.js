// js/wind-effect-terrain.js
// TermikaXC v2.6 - terrain steering vplyv pre WIND pole.

(function () {
    if (!window.WindEffectsCore) {
        throw new Error("Najprv musi byt nacitany wind-effects-core.js.");
    }

    const clamp = function (value, min, max) {
        return Math.max(min, Math.min(max, Number(value) || 0));
    };

    const vectorFromDir = function (dirDeg, magnitude) {
        const rad = ((Number(dirDeg) || 0) * Math.PI) / 180;
        return {
            u: Math.sin(rad) * magnitude,
            v: Math.cos(rad) * magnitude
        };
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

    WindEffectsCore.registerEffect({
        id: "terrain-steering",
        title: "Terrain steering",
        order: 20,

        run: function (field, context) {
            const terrainCells = context?.terrainGeometry?.cells;
            if (!Array.isArray(terrainCells) || !terrainCells.length) {
                return;
            }

            field.cells.forEach((cell) => {
                const terrain = nearestTerrainCell(terrainCells, Number(cell.lat), Number(cell.lon));
                if (!terrain) return;

                const slopeDeg = Number(terrain.slopeDeg) || 0;
                const aspectDeg = Number(terrain.aspectDeg);
                const curvature = Number(terrain.curvature) || 0;
                const spacingM = Number(terrain.spacingM) || Number(field.spacingM) || 100;
                const curvatureScaled = curvature * spacingM * spacingM;
                const speed = Math.max(0.01, Number(cell.speed_ms) || 0.01);

                // Mierne vedenie toku po orientacii svahu pri vyraznejsom sklone.
                if (Number.isFinite(aspectDeg)) {
                    const slopeFactor = clamp((slopeDeg - 5) / 35, 0, 1);
                    const steerWeight = 0.22 * slopeFactor;
                    if (steerWeight > 0) {
                        const steer = vectorFromDir(aspectDeg, speed);
                        cell.u_ms = cell.u_ms * (1 - steerWeight) + steer.u * steerWeight;
                        cell.v_ms = cell.v_ms * (1 - steerWeight) + steer.v * steerWeight;
                    }
                }

                // Konkavne tvary tok jemne brzdia, konvexne tvary jemne urychluju.
                const speedScale = 1 + clamp(-curvatureScaled / 10, -0.18, 0.18);
                cell.u_ms *= speedScale;
                cell.v_ms *= speedScale;
                cell.speed_ms = Math.hypot(cell.u_ms, cell.v_ms);
                cell.dir_deg = ((Math.atan2(cell.u_ms, cell.v_ms) * 180) / Math.PI + 360) % 360;

                cell.confidence = clamp((Number(cell.confidence) || 0.6) + 0.06, 0, 0.99);
                cell.terrainInfluence = {
                    slope_deg: slopeDeg,
                    aspect_deg: Number.isFinite(aspectDeg) ? aspectDeg : null,
                    curvature_scaled: curvatureScaled,
                    speed_scale: speedScale
                };
            });
        }
    });
})();

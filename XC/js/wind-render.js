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
        lineWidthMin: 1,
        lineWidthMax: 4,
        alpha: 0.9,
        heightOffsetM: 24
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

            const color = this.colorForTempDelta(line.tempDeltaK, cfg.alpha);
            const width = this.widthForSpeed(speedMs, cfg.lineWidthMin, cfg.lineWidthMax);

            const positions = line.points.map((p) =>
                Cesium.Cartesian3.fromDegrees(p.lon, p.lat, Math.max(0, (p.heightM || 0) + cfg.heightOffsetM))
            );

            ds.entities.add({
                polyline: {
                    positions,
                    width,
                    material: color,
                    clampToGround: false
                },
                properties: {
                    type: "WIND_STREAMLINE",
                    speed_ms: speedMs,
                    dir_deg: line.dirDeg,
                    tempDeltaK: line.tempDeltaK,
                    convergence: line.convergence
                }
            });

            const tip = line.points[line.points.length - 1];
            if (tip) {
                ds.entities.add({
                    position: Cesium.Cartesian3.fromDegrees(tip.lon, tip.lat, Math.max(0, (tip.heightM || 0) + cfg.heightOffsetM)),
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
                        tempDeltaK: line.tempDeltaK
                    }
                });
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
            let lat = seed.lat;
            let lon = seed.lon;
            let lastCell = seed;

            for (let i = 0; i < maxSteps; i += 1) {
                const cell = window.WindField.nearestCell(field, lat, lon);
                if (!cell) break;
                if ((Number(cell.speed_ms) || 0) < style.minSpeedMs) break;

                points.push({ lat, lon, heightM: field.level?.agl_m || 0 });

                const speed = Math.max(0.01, Number(cell.speed_ms) || 0.01);
                const dt = stepMeters / speed;

                lat += (cell.v_ms * dt) / metersPerDegLat;
                lon += (cell.u_ms * dt) / metersPerDegLon;
                lastCell = cell;

                const dNorth = (lat - field.center.lat) * metersPerDegLat;
                const dEast = (lon - field.center.lon) * metersPerDegLon;
                if (Math.hypot(dNorth, dEast) > field.radiusM) break;
            }

            if (points.length >= 2) {
                lines.push({
                    points,
                    speedMs: lastCell.speed_ms,
                    dirDeg: lastCell.dir_deg,
                    tempDeltaK: lastCell.tempDeltaK,
                    convergence: lastCell.convergence
                });
            }
        });

        return lines;
    },

    colorForTempDelta: function (deltaK, alpha) {
        const d = Number(deltaK) || 0;

        if (d <= -2) return Cesium.Color.fromCssColorString("#1E88E5").withAlpha(alpha);
        if (d >= 2) return Cesium.Color.fromCssColorString("#FFB300").withAlpha(alpha);
        return Cesium.Color.fromCssColorString("#B0BEC5").withAlpha(alpha);
    },

    widthForSpeed: function (speedMs, minW, maxW) {
        const s = Math.max(0, Math.min(12, Number(speedMs) || 0));
        const t = s / 12;
        return minW + (maxW - minW) * t;
    }
};

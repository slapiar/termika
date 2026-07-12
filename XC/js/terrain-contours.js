// js/terrain-contours.js
// TermikaXC v2.6 – priehľadná mapová vrstva 3D vrstevníc.
// Opätovne commitnuté na main kvôli spoľahlivému nasadeniu a obnoveniu cache.

(function () {
    if (!window.TerrainAnalysisCore) {
        throw new Error("Najprv musí byť načítaný terrain-analysis-core.js.");
    }

    const DEFAULT_INTERVAL_M = 10;
    const INDEX_INTERVAL_M = 50;
    const HEIGHT_OFFSET_M = 1.5;

    window.TerrainContours = {
        VERSION: "2.6.0-alpha.2",
        dataSource: null,
        visible: true,

        setVisible: function (visible) {
            this.visible = Boolean(visible);
            if (this.dataSource) this.dataSource.show = this.visible;
        },

        clear: function (viewer) {
            if (this.dataSource && viewer?.dataSources) {
                viewer.dataSources.remove(this.dataSource, true);
            }
            this.dataSource = null;
        },

        render: async function (viewer, contourResult) {
            if (!viewer || !contourResult?.segments?.length) {
                this.clear(viewer);
                return null;
            }

            this.clear(viewer);
            const dataSource = new Cesium.CustomDataSource("terrain-contours");

            contourResult.segments.forEach((segment, index) => {
                const major = segment.levelM % INDEX_INTERVAL_M === 0;
                dataSource.entities.add({
                    id: "terrain-contour-" + index,
                    polyline: {
                        positions: segment.points.map((point) =>
                            Cesium.Cartesian3.fromDegrees(
                                point.lon,
                                point.lat,
                                segment.levelM + HEIGHT_OFFSET_M
                            )
                        ),
                        width: major ? 2.2 : 1.0,
                        material: Cesium.Color.fromCssColorString("#404040").withAlpha(major ? 0.92 : 0.72),
                        clampToGround: false,
                        arcType: Cesium.ArcType.NONE
                    },
                    properties: {
                        layer: "VRSTEVNICE",
                        elevationM: segment.levelM,
                        kind: major ? "HLAVNÁ_VRSTEVNICA" : "BEŽNÁ_VRSTEVNICA"
                    }
                });
            });

            dataSource.show = this.visible;
            await viewer.dataSources.add(dataSource);
            this.dataSource = dataSource;
            return dataSource;
        }
    };

    function interpolate(a, b, levelM) {
        const delta = b.heightM - a.heightM;
        const t = Math.abs(delta) < 1e-9 ? 0.5 : (levelM - a.heightM) / delta;
        const clamped = Math.max(0, Math.min(1, t));
        return {
            lat: a.lat + (b.lat - a.lat) * clamped,
            lon: a.lon + (b.lon - a.lon) * clamped
        };
    }

    function edgeCrossing(a, b, levelM) {
        const min = Math.min(a.heightM, b.heightM);
        const max = Math.max(a.heightM, b.heightM);
        if (levelM < min || levelM > max || Math.abs(a.heightM - b.heightM) < 1e-9) {
            return null;
        }
        return interpolate(a, b, levelM);
    }

    function buildSegments(geometry, intervalM) {
        const points = geometry.points;
        const rows = geometry.rows;
        const cols = geometry.cols;
        const radiusM = geometry.radiusM;
        const pointAt = (row, col) => points[row * cols + col];
        const heights = points.map((point) => point.heightM).filter(Number.isFinite);
        const minLevel = Math.ceil(Math.min(...heights) / intervalM) * intervalM;
        const maxLevel = Math.floor(Math.max(...heights) / intervalM) * intervalM;
        const segments = [];

        for (let levelM = minLevel; levelM <= maxLevel; levelM += intervalM) {
            for (let row = 0; row < rows - 1; row += 1) {
                for (let col = 0; col < cols - 1; col += 1) {
                    const southWest = pointAt(row, col);
                    const southEast = pointAt(row, col + 1);
                    const northEast = pointAt(row + 1, col + 1);
                    const northWest = pointAt(row + 1, col);
                    const centerEastM = (southWest.eastM + northEast.eastM) / 2;
                    const centerNorthM = (southWest.northM + northEast.northM) / 2;

                    if (Math.hypot(centerEastM, centerNorthM) > radiusM + geometry.spacingM) {
                        continue;
                    }

                    const crossings = [
                        edgeCrossing(southWest, southEast, levelM),
                        edgeCrossing(southEast, northEast, levelM),
                        edgeCrossing(northEast, northWest, levelM),
                        edgeCrossing(northWest, southWest, levelM)
                    ].filter(Boolean);

                    if (crossings.length === 2) {
                        segments.push({ levelM, points: crossings });
                    } else if (crossings.length === 4) {
                        segments.push({ levelM, points: [crossings[0], crossings[1]] });
                        segments.push({ levelM, points: [crossings[2], crossings[3]] });
                    }
                }
            }
        }

        return { intervalM, minLevelM: minLevel, maxLevelM: maxLevel, segments };
    }

    TerrainAnalysisCore.registerModule({
        id: "contours",
        title: "Vrstevnice",
        description: "Tmavošedé 3D vrstevnice ako samostatná priehľadná mapová vrstva.",
        requires: ["geometry"],

        run: async function (context) {
            const geometry = context.layers.geometry;
            const result = buildSegments(geometry, DEFAULT_INTERVAL_M);

            context.provenance.contours = {
                dataOrigin: "ODVODENÉ Z MODELOVÉHO TERÉNU CESIUM",
                method: "lineárna interpolácia priesečníkov výškových hladín v bunkách mriežky",
                intervalM: DEFAULT_INTERVAL_M,
                indexIntervalM: INDEX_INTERVAL_M,
                moduleVersion: TerrainContours.VERSION
            };

            context.diagnostics.contours = {
                intervalM: DEFAULT_INTERVAL_M,
                indexIntervalM: INDEX_INTERVAL_M,
                segmentCount: result.segments.length,
                minLevelM: result.minLevelM,
                maxLevelM: result.maxLevelM
            };

            return result;
        }
    });
})();
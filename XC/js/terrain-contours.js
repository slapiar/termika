// js/terrain-contours.js
// TermikaXC v2.6 – priehľadná mapová vrstva 3D vrstevníc.
// Vrstevnice sa po výpočte spájajú do súvislých čiar a ich body sa znovu
// vzorkujú na skutočnom Cesium teréne, aby sa nestrácali vo vnútri prudkých stien.

(function () {
    if (!window.TerrainAnalysisCore) {
        throw new Error("Najprv musí byť načítaný terrain-analysis-core.js.");
    }

    const DEFAULT_INTERVAL_M = 10;
    const INDEX_INTERVAL_M = 50;
    const HEIGHT_OFFSET_M = 3;
    const POINT_KEY_PRECISION = 7;

    window.TerrainContours = {
        VERSION: "2.6.0-alpha.4",
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
            const lines = contourResult?.lines || contourResult?.segments || [];
            if (!viewer || !lines.length) {
                this.clear(viewer);
                return null;
            }

            this.clear(viewer);
            const correctedLines = await correctLinesToTerrain(viewer, lines);
            const dataSource = new Cesium.CustomDataSource("terrain-contours");

            correctedLines.forEach((line, index) => {
                const major = line.levelM % INDEX_INTERVAL_M === 0;
                const color = Cesium.Color.fromCssColorString("#404040");

                dataSource.entities.add({
                    id: "terrain-contour-" + index,
                    polyline: {
                        positions: line.points.map((point) =>
                            Cesium.Cartesian3.fromDegrees(
                                point.lon,
                                point.lat,
                                point.renderHeightM
                            )
                        ),
                        width: major ? 2.8 : 1.35,
                        material: color.withAlpha(major ? 0.95 : 0.78),
                        clampToGround: false,
                        arcType: Cesium.ArcType.NONE
                    },
                    properties: {
                        layer: "VRSTEVNICE",
                        elevationM: line.levelM,
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

    function pointKey(point) {
        return point.lat.toFixed(POINT_KEY_PRECISION) + "," + point.lon.toFixed(POINT_KEY_PRECISION);
    }

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

    function stitchSegments(segments) {
        const byLevel = new Map();
        segments.forEach((segment, index) => {
            if (!byLevel.has(segment.levelM)) byLevel.set(segment.levelM, []);
            byLevel.get(segment.levelM).push({ ...segment, sourceIndex: index });
        });

        const lines = [];

        byLevel.forEach((levelSegments, levelM) => {
            const endpointMap = new Map();
            levelSegments.forEach((segment, index) => {
                segment.points.forEach((point, endpointIndex) => {
                    const key = pointKey(point);
                    if (!endpointMap.has(key)) endpointMap.set(key, []);
                    endpointMap.get(key).push({ index, endpointIndex });
                });
            });

            const used = new Set();

            const walk = (startIndex, startEndpointIndex) => {
                const first = levelSegments[startIndex];
                const linePoints = startEndpointIndex === 0
                    ? [first.points[0], first.points[1]]
                    : [first.points[1], first.points[0]];
                used.add(startIndex);

                while (true) {
                    const tail = linePoints[linePoints.length - 1];
                    const candidates = endpointMap.get(pointKey(tail)) || [];
                    const next = candidates.find((candidate) => !used.has(candidate.index));
                    if (!next) break;

                    const segment = levelSegments[next.index];
                    const nextPoint = next.endpointIndex === 0 ? segment.points[1] : segment.points[0];
                    linePoints.push(nextPoint);
                    used.add(next.index);
                }

                return linePoints;
            };

            levelSegments.forEach((segment, index) => {
                if (used.has(index)) return;
                const degree0 = (endpointMap.get(pointKey(segment.points[0])) || []).length;
                const degree1 = (endpointMap.get(pointKey(segment.points[1])) || []).length;
                const startEndpointIndex = degree0 === 1 ? 0 : (degree1 === 1 ? 1 : 0);
                const points = walk(index, startEndpointIndex);
                if (points.length >= 2) lines.push({ levelM, points });
            });
        });

        return lines;
    }

    async function correctLinesToTerrain(viewer, lines) {
        const provider = viewer?.scene?.globe?.terrainProvider || viewer?.terrainProvider;
        if (!provider) {
            return lines.map((line) => ({
                ...line,
                points: line.points.map((point) => ({
                    ...point,
                    renderHeightM: line.levelM + HEIGHT_OFFSET_M
                }))
            }));
        }

        const flatPoints = [];
        lines.forEach((line, lineIndex) => {
            line.points.forEach((point, pointIndex) => {
                flatPoints.push({ lineIndex, pointIndex, point });
            });
        });

        const cartographics = flatPoints.map((item) =>
            Cesium.Cartographic.fromDegrees(item.point.lon, item.point.lat)
        );

        let sampled;
        try {
            sampled = await Cesium.sampleTerrainMostDetailed(provider, cartographics);
        } catch (error) {
            return lines.map((line) => ({
                ...line,
                points: line.points.map((point) => ({
                    ...point,
                    renderHeightM: line.levelM + HEIGHT_OFFSET_M
                }))
            }));
        }

        const corrected = lines.map((line) => ({
            ...line,
            points: line.points.map((point) => ({ ...point }))
        }));

        sampled.forEach((cartographic, index) => {
            const item = flatPoints[index];
            const sampledHeight = Number(cartographic?.height);
            corrected[item.lineIndex].points[item.pointIndex].renderHeightM =
                (Number.isFinite(sampledHeight) ? sampledHeight : lines[item.lineIndex].levelM) + HEIGHT_OFFSET_M;
        });

        return corrected;
    }

    TerrainAnalysisCore.registerModule({
        id: "contours",
        title: "Vrstevnice",
        description: "Tmavošedé 3D vrstevnice ako samostatná priehľadná mapová vrstva.",
        requires: ["geometry"],

        run: async function (context) {
            const geometry = context.layers.geometry;
            const result = buildSegments(geometry, DEFAULT_INTERVAL_M);
            result.lines = stitchSegments(result.segments);

            context.provenance.contours = {
                dataOrigin: "ODVODENÉ Z MODELOVÉHO TERÉNU CESIUM",
                method: "lineárna interpolácia priesečníkov výškových hladín, spojenie úsekov a spätná korekcia na povrch terénu",
                intervalM: DEFAULT_INTERVAL_M,
                indexIntervalM: INDEX_INTERVAL_M,
                moduleVersion: TerrainContours.VERSION
            };

            context.diagnostics.contours = {
                intervalM: DEFAULT_INTERVAL_M,
                indexIntervalM: INDEX_INTERVAL_M,
                segmentCount: result.segments.length,
                lineCount: result.lines.length,
                minLevelM: result.minLevelM,
                maxLevelM: result.maxLevelM
            };

            return result;
        }
    });
})();

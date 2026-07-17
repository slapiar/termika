// js/terrain-mesh.js
// TermikaXC v2.6 – M1: základný terénny mesh ako výpočtová kostra krajiny.
//
// Modul nemení zdrojové výšky, lokálnu geometriu ani farebný dizajn.
// Nad viditeľnými bunkami vytvára vrcholy, trojuholníkové plochy a unikátne
// hrany. Drôtené zobrazenie je iba diagnostika; hlavnou hodnotou je topológia.

(function () {
    if (!window.TerrainAnalysisCore) {
        throw new Error("Najprv musí byť načítaný terrain-analysis-core.js.");
    }

    const VERSION = "2.6.0-m1.1";
    const METHOD = "TERRAIN_MESH_M1";
    const TRIANGULATION_METHOD = "GEOMETRY_CONTINUITY_DIAGONAL_V1";
    const BREAK_REFERENCE_DEG = 35;
    const EPSILON = 1e-9;

    let meshCollection = null;
    let meshViewer = null;
    let lastMesh = null;
    let visible = true;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
    const clamp01 = (value) => clamp(value, 0, 1);
    const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const keyOf = (row, col) => String(row) + ":" + String(col);
    const vertexIdOf = (cell) => "v:" + cell.row + ":" + cell.col;
    const normalizeAzimuth = (degrees) => ((degrees % 360) + 360) % 360;

    const mean = function (values) {
        const valid = values.map(Number).filter(Number.isFinite);
        if (!valid.length) return null;
        return valid.reduce((sum, value) => sum + value, 0) / valid.length;
    };

    const vector = function (from, to) {
        return {
            x: to.x - from.x,
            y: to.y - from.y,
            z: to.z - from.z
        };
    };

    const cross = function (a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    };

    const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
    const magnitude = (value) => Math.hypot(value.x, value.y, value.z);

    const normalize = function (value) {
        const length = magnitude(value);
        if (length <= EPSILON) return { x: 0, y: 0, z: 1 };
        return {
            x: value.x / length,
            y: value.y / length,
            z: value.z / length
        };
    };

    const pointOf = function (vertex) {
        return {
            x: finite(vertex.eastM),
            y: finite(vertex.northM),
            z: finite(vertex.heightM)
        };
    };

    const geometryDistance = function (left, right) {
        const a = left.cell?.geometry || {};
        const b = right.cell?.geometry || {};
        const metricDifference = mean([
            Math.abs(clamp01(a.convexity) - clamp01(b.convexity)),
            Math.abs(clamp01(a.concavity) - clamp01(b.concavity)),
            Math.abs(clamp01(a.planarity) - clamp01(b.planarity)),
            Math.abs(clamp01(a.breakIntensity) - clamp01(b.breakIntensity)),
            Math.abs(clamp01(a.wallness) - clamp01(b.wallness))
        ]) || 0;
        const classPenalty = a.localClass && b.localClass && a.localClass !== b.localClass
            ? 0.18
            : 0;
        return clamp01(metricDifference + classPenalty);
    };

    const diagonalScore = function (first, second, reliefM) {
        const heightDifference = Math.abs(finite(first.heightM) - finite(second.heightM));
        const normalizedHeightDifference = reliefM > 0.25
            ? clamp01(heightDifference / reliefM)
            : 0;
        const localGeometryDifference = geometryDistance(first, second);

        return {
            score: 0.68 * normalizedHeightDifference + 0.32 * localGeometryDifference,
            normalizedHeightDifference,
            localGeometryDifference
        };
    };

    const chooseDiagonal = function (a, b, c, d) {
        const heights = [a, b, c, d].map((vertex) => finite(vertex.heightM));
        const reliefM = Math.max(...heights) - Math.min(...heights);
        const ad = diagonalScore(a, d, reliefM);
        const bc = diagonalScore(b, c, reliefM);
        const difference = ad.score - bc.score;

        if (Math.abs(difference) <= 0.025) {
            const diagonal = (a.row + a.col) % 2 === 0 ? "AD" : "BC";
            return {
                diagonal,
                reason: "CHECKERBOARD_TIE_BREAK",
                reliefM,
                scores: { AD: ad, BC: bc }
            };
        }

        return {
            diagonal: difference < 0 ? "AD" : "BC",
            reason: difference < 0
                ? "AD_LOWER_GEOMETRY_CONTINUITY_SCORE"
                : "BC_LOWER_GEOMETRY_CONTINUITY_SCORE",
            reliefM,
            scores: { AD: ad, BC: bc }
        };
    };

    const createVertex = function (cell) {
        return {
            id: vertexIdOf(cell),
            row: cell.row,
            col: cell.col,
            lat: finite(cell.lat),
            lon: finite(cell.lon),
            eastM: finite(cell.eastM),
            northM: finite(cell.northM),
            heightM: finite(cell.heightM),
            cell,
            faceIds: [],
            edgeIds: []
        };
    };

    const createFace = function (id, vertices, quadId, triangulation) {
        let ordered = [...vertices];
        let p0 = pointOf(ordered[0]);
        let p1 = pointOf(ordered[1]);
        let p2 = pointOf(ordered[2]);
        let rawNormal = cross(vector(p0, p1), vector(p0, p2));

        if (rawNormal.z < 0) {
            ordered = [ordered[0], ordered[2], ordered[1]];
            p0 = pointOf(ordered[0]);
            p1 = pointOf(ordered[1]);
            p2 = pointOf(ordered[2]);
            rawNormal = cross(vector(p0, p1), vector(p0, p2));
        }

        const doubleArea = magnitude(rawNormal);
        const normal = normalize(rawNormal);
        const area3DM2 = doubleArea / 2;
        const areaHorizontalM2 = Math.abs(rawNormal.z) / 2;
        const slopeDeg = Cesium.Math.toDegrees(
            Math.atan2(Math.hypot(normal.x, normal.y), Math.max(EPSILON, normal.z))
        );
        const aspectDeg = slopeDeg < 1e-6
            ? null
            : normalizeAzimuth(Cesium.Math.toDegrees(Math.atan2(normal.x, normal.y)));

        const centroid = {
            eastM: mean(ordered.map((vertex) => vertex.eastM)),
            northM: mean(ordered.map((vertex) => vertex.northM)),
            heightM: mean(ordered.map((vertex) => vertex.heightM)),
            lat: mean(ordered.map((vertex) => vertex.lat)),
            lon: mean(ordered.map((vertex) => vertex.lon))
        };

        return {
            id,
            quadId,
            vertexIds: ordered.map((vertex) => vertex.id),
            edgeIds: [],
            neighborFaceIds: [],
            area3DM2,
            areaHorizontalM2,
            centroid,
            normal: {
                east: normal.x,
                north: normal.y,
                up: normal.z
            },
            slopeDeg,
            aspectDeg,
            meanVertexSlopeDeg: mean(ordered.map((vertex) => vertex.cell?.slopeDeg)),
            meanConvexity: mean(ordered.map((vertex) => vertex.cell?.geometry?.convexity)),
            meanConcavity: mean(ordered.map((vertex) => vertex.cell?.geometry?.concavity)),
            meanBreakIntensity: mean(ordered.map((vertex) => vertex.cell?.geometry?.breakIntensity)),
            triangulation
        };
    };

    const edgeKey = function (leftId, rightId) {
        return [leftId, rightId].sort().join("|");
    };

    const createEdge = function (left, right) {
        const p0 = pointOf(left);
        const p1 = pointOf(right);
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const dz = p1.z - p0.z;
        const key = edgeKey(left.id, right.id);

        return {
            id: "e:" + key,
            vertexIds: key.split("|"),
            faceIds: [],
            lengthHorizontalM: Math.hypot(dx, dy),
            length3DM: Math.hypot(dx, dy, dz),
            heightDifferenceM: Math.abs(dz),
            boundary: false,
            dihedralDeg: null,
            normalBreakStrength: 0,
            sourceBreakStrength: mean([
                left.cell?.geometry?.breakIntensity,
                right.cell?.geometry?.breakIntensity
            ]) || 0,
            breakStrength: 0,
            role: null,
            flowEffect: null
        };
    };

    const connectFaceEdges = function (face, vertexMap, edgeMap) {
        const pairs = [
            [face.vertexIds[0], face.vertexIds[1]],
            [face.vertexIds[1], face.vertexIds[2]],
            [face.vertexIds[2], face.vertexIds[0]]
        ];

        pairs.forEach(([leftId, rightId]) => {
            const key = edgeKey(leftId, rightId);
            let edge = edgeMap.get(key);
            if (!edge) {
                edge = createEdge(vertexMap.get(leftId), vertexMap.get(rightId));
                edgeMap.set(key, edge);
            }
            edge.faceIds.push(face.id);
            face.edgeIds.push(edge.id);
        });
    };

    const finalizeEdgesAndNeighbors = function (edges, facesById) {
        edges.forEach((edge) => {
            edge.boundary = edge.faceIds.length === 1;

            if (edge.faceIds.length === 2) {
                const first = facesById.get(edge.faceIds[0]);
                const second = facesById.get(edge.faceIds[1]);
                const firstNormal = {
                    x: first.normal.east,
                    y: first.normal.north,
                    z: first.normal.up
                };
                const secondNormal = {
                    x: second.normal.east,
                    y: second.normal.north,
                    z: second.normal.up
                };
                const cosine = clamp(dot(firstNormal, secondNormal), -1, 1);
                edge.dihedralDeg = Cesium.Math.toDegrees(Math.acos(cosine));
                edge.normalBreakStrength = clamp01(edge.dihedralDeg / BREAK_REFERENCE_DEG);
                edge.breakStrength = clamp01(
                    0.75 * edge.normalBreakStrength + 0.25 * edge.sourceBreakStrength
                );

                if (!first.neighborFaceIds.includes(second.id)) {
                    first.neighborFaceIds.push(second.id);
                }
                if (!second.neighborFaceIds.includes(first.id)) {
                    second.neighborFaceIds.push(first.id);
                }
            } else {
                edge.breakStrength = clamp01(0.25 * edge.sourceBreakStrength);
            }
        });
    };

    const buildMesh = function (geometryResult) {
        if (!geometryResult?.cells?.length) {
            throw new Error("Terénny mesh nedostal geometrické bunky.");
        }

        const vertices = geometryResult.cells.map(createVertex);
        const vertexMap = new Map(vertices.map((vertex) => [vertex.id, vertex]));
        const gridIndex = new Map(vertices.map((vertex) => [keyOf(vertex.row, vertex.col), vertex]));
        const faces = [];
        const faceMap = new Map();
        const edgeMap = new Map();
        const diagonalCounts = { AD: 0, BC: 0 };
        const triangulationReasons = {};
        let quadCount = 0;

        vertices.forEach((a) => {
            const b = gridIndex.get(keyOf(a.row, a.col + 1));
            const c = gridIndex.get(keyOf(a.row + 1, a.col));
            const d = gridIndex.get(keyOf(a.row + 1, a.col + 1));
            if (!b || !c || !d) return;

            const decision = chooseDiagonal(a, b, c, d);
            const quadId = "q:" + a.row + ":" + a.col;
            const triangles = decision.diagonal === "AD"
                ? [[a, b, d], [a, d, c]]
                : [[a, b, c], [b, d, c]];

            diagonalCounts[decision.diagonal] += 1;
            triangulationReasons[decision.reason] = (triangulationReasons[decision.reason] || 0) + 1;
            quadCount += 1;

            triangles.forEach((triangle, triangleIndex) => {
                const face = createFace(
                    "f:" + faces.length,
                    triangle,
                    quadId,
                    {
                        method: TRIANGULATION_METHOD,
                        diagonal: decision.diagonal,
                        reason: decision.reason,
                        triangleIndex,
                        reliefM: decision.reliefM,
                        scores: decision.scores
                    }
                );
                faces.push(face);
                faceMap.set(face.id, face);
                face.vertexIds.forEach((vertexId) => vertexMap.get(vertexId).faceIds.push(face.id));
                connectFaceEdges(face, vertexMap, edgeMap);
            });
        });

        const edges = Array.from(edgeMap.values());
        finalizeEdgesAndNeighbors(edges, faceMap);
        edges.forEach((edge) => {
            edge.vertexIds.forEach((vertexId) => {
                const vertex = vertexMap.get(vertexId);
                if (vertex && !vertex.edgeIds.includes(edge.id)) vertex.edgeIds.push(edge.id);
            });
        });

        vertices.forEach((vertex) => {
            vertex.cell.mesh = {
                vertexId: vertex.id,
                faceIds: [...vertex.faceIds],
                edgeIds: [...vertex.edgeIds]
            };
        });

        const totalArea3DM2 = faces.reduce((sum, face) => sum + face.area3DM2, 0);
        const totalAreaHorizontalM2 = faces.reduce((sum, face) => sum + face.areaHorizontalM2, 0);
        const internalEdges = edges.filter((edge) => !edge.boundary);
        const dihedralValues = internalEdges
            .map((edge) => edge.dihedralDeg)
            .filter(Number.isFinite);
        const faceSlopes = faces.map((face) => face.slopeDeg).filter(Number.isFinite);
        const invalidUpNormals = faces.filter((face) => face.normal.up <= 0).length;
        const invalidAreaRelation = totalArea3DM2 + 1e-6 < totalAreaHorizontalM2;

        const summary = {
            version: VERSION,
            method: METHOD,
            triangulationMethod: TRIANGULATION_METHOD,
            vertexCount: vertices.length,
            quadCount,
            faceCount: faces.length,
            edgeCount: edges.length,
            internalEdgeCount: internalEdges.length,
            boundaryEdgeCount: edges.filter((edge) => edge.boundary).length,
            totalArea3DM2,
            totalAreaHorizontalM2,
            surfaceAreaRatio: totalAreaHorizontalM2 > EPSILON
                ? totalArea3DM2 / totalAreaHorizontalM2
                : 1,
            meanFaceSlopeDeg: mean(faceSlopes),
            maxFaceSlopeDeg: faceSlopes.length ? Math.max(...faceSlopes) : null,
            meanDihedralDeg: mean(dihedralValues),
            maxDihedralDeg: dihedralValues.length ? Math.max(...dihedralValues) : null,
            potentialBreakEdgeCount: edges.filter((edge) => edge.breakStrength >= 0.35).length,
            strongBreakEdgeCount: edges.filter((edge) => edge.breakStrength >= 0.65).length,
            diagonalCounts,
            triangulationReasons,
            validation: {
                upwardNormals: invalidUpNormals === 0,
                invalidUpNormalCount: invalidUpNormals,
                surfaceAreaRelation: !invalidAreaRelation,
                valid: invalidUpNormals === 0 && !invalidAreaRelation
            },
            energyEnabled: false,
            morphologyBound: false,
            flowEffectsEnabled: false
        };

        const mesh = {
            version: VERSION,
            method: METHOD,
            triangulationMethod: TRIANGULATION_METHOD,
            dataOrigin: "ODVODENÉ VÝPOČTOM",
            vertices,
            edges,
            faces,
            summary
        };

        geometryResult.mesh = mesh;
        lastMesh = mesh;
        return mesh;
    };

    const colorForEdge = function (edge) {
        if (edge.breakStrength >= 0.65) {
            return Cesium.Color.ORANGE.withAlpha(0.92);
        }
        if (edge.breakStrength >= 0.35) {
            return Cesium.Color.YELLOW.withAlpha(0.72);
        }
        return Cesium.Color.CYAN.withAlpha(0.42);
    };

    const widthForEdge = function (edge) {
        if (edge.breakStrength >= 0.65) return 2.2;
        if (edge.breakStrength >= 0.35) return 1.6;
        return 1.0;
    };

    const clear = function (viewer = meshViewer) {
        if (meshCollection && viewer?.scene?.primitives) {
            viewer.scene.primitives.remove(meshCollection);
        }
        meshCollection = null;
        if (!viewer || viewer === meshViewer) meshViewer = viewer || null;
    };

    const render = function (viewer, mesh = lastMesh, options = {}) {
        if (!viewer?.scene?.primitives) {
            throw new Error("Nie je dostupný Cesium viewer pre drôtený model.");
        }
        if (!mesh?.edges?.length) {
            clear(viewer);
            return null;
        }

        clear(viewer);
        const collection = viewer.scene.primitives.add(new Cesium.PolylineCollection());
        const vertexMap = new Map(mesh.vertices.map((vertex) => [vertex.id, vertex]));
        const heightOffsetM = finite(options.heightOffsetM, 9);

        mesh.edges.forEach((edge) => {
            const first = vertexMap.get(edge.vertexIds[0]);
            const second = vertexMap.get(edge.vertexIds[1]);
            if (!first || !second) return;

            collection.add({
                positions: [
                    Cesium.Cartesian3.fromDegrees(first.lon, first.lat, first.heightM + heightOffsetM),
                    Cesium.Cartesian3.fromDegrees(second.lon, second.lat, second.heightM + heightOffsetM)
                ],
                width: widthForEdge(edge),
                material: Cesium.Material.fromType("Color", {
                    color: colorForEdge(edge)
                }),
                show: visible,
                id: {
                    type: "terrain-mesh-edge",
                    edge
                }
            });
        });

        meshCollection = collection;
        meshViewer = viewer;
        collection.show = visible;
        return collection;
    };

    const setVisible = function (value) {
        visible = Boolean(value);
        if (meshCollection) meshCollection.show = visible;
    };

    const addDiagnosticRow = function (container, label, value) {
        const key = document.createElement("b");
        const data = document.createElement("span");
        key.textContent = label;
        data.textContent = value;
        container.append(key, data);
    };

    const installDiagnosticCard = function () {
        const original = window.showCellDiagnostics;
        if (typeof original !== "function" || original.__terrainMeshM1Wrapped) return;

        const wrapped = function (cell) {
            original(cell);

            const body = document.getElementById("cellDiagnosticsBody");
            const meshInfo = cell?.mesh;
            const mesh = lastMesh;
            if (!body || !meshInfo || !mesh) return;

            const faceMap = new Map(mesh.faces.map((face) => [face.id, face]));
            const edgeMap = new Map(mesh.edges.map((edge) => [edge.id, edge]));
            const incidentFaces = meshInfo.faceIds.map((id) => faceMap.get(id)).filter(Boolean);
            const incidentEdges = meshInfo.edgeIds.map((id) => edgeMap.get(id)).filter(Boolean);
            const maxBreak = incidentEdges.length
                ? Math.max(...incidentEdges.map((edge) => edge.breakStrength))
                : 0;

            const card = document.createElement("section");
            card.className = "terrain-design-color-card";

            const heading = document.createElement("h3");
            heading.textContent = "Terénny mesh M1 · topológia bodu";
            heading.style.margin = "0 0 7px";
            heading.style.color = "#70e8ff";
            heading.style.fontSize = "13px";

            const rows = document.createElement("div");
            rows.className = "terrain-design-color-row";
            addDiagnosticRow(rows, "Vrchol siete", meshInfo.vertexId);
            addDiagnosticRow(rows, "Susedné plochy", String(incidentFaces.length));
            addDiagnosticRow(rows, "Susedné hrany", String(incidentEdges.length));
            addDiagnosticRow(rows, "Priemerná plocha", incidentFaces.length
                ? (mean(incidentFaces.map((face) => face.area3DM2)) || 0).toFixed(1) + " m²"
                : "neurčená");
            addDiagnosticRow(rows, "Max. sila rozhrania", maxBreak.toFixed(2));
            addDiagnosticRow(rows, "Stav energetiky", "pripravená topológia · energia sa ešte nepočíta");
            addDiagnosticRow(rows, "Metóda", mesh.method);

            card.append(heading, rows);
            const intro = body.querySelector(".diagnostic-intro");
            intro?.insertAdjacentElement("afterend", card);
        };

        wrapped.__terrainMeshM1Wrapped = true;
        window.showCellDiagnostics = wrapped;
    };

    const installUi = function () {
        let moduleInput = document.querySelector('.module-toggle[value="mesh"]');
        if (!moduleInput) {
            const morphologyInput = document.querySelector('.module-toggle[value="morphology"]');
            const anchorLabel = morphologyInput?.closest("label") ||
                document.querySelector('.module-toggle[value="geometry"]')?.closest("label");

            if (anchorLabel) {
                const label = document.createElement("label");
                moduleInput = document.createElement("input");
                moduleInput.className = "module-toggle";
                moduleInput.type = "checkbox";
                moduleInput.value = "mesh";
                moduleInput.checked = true;
                label.append(moduleInput, document.createTextNode(" Terénny mesh M1"));
                anchorLabel.insertAdjacentElement("afterend", label);
            }
        }

        if (moduleInput && !moduleInput.__terrainMeshBound) {
            moduleInput.addEventListener("change", () => setVisible(moduleInput.checked));
            moduleInput.__terrainMeshBound = true;
        }

        let visibilityInput = document.getElementById("meshVisible");
        if (!visibilityInput) {
            const contoursInput = document.getElementById("contoursVisible");
            const contoursLabel = contoursInput?.closest("label");
            if (contoursLabel) {
                const label = document.createElement("label");
                visibilityInput = document.createElement("input");
                visibilityInput.id = "meshVisible";
                visibilityInput.type = "checkbox";
                visibilityInput.checked = true;
                label.append(visibilityInput, document.createTextNode(" Zobraziť drôtený model"));
                contoursLabel.insertAdjacentElement("afterend", label);
            }
        }

        if (visibilityInput && !visibilityInput.__terrainMeshBound) {
            visibilityInput.addEventListener("change", () => setVisible(visibilityInput.checked));
            visibilityInput.__terrainMeshBound = true;
            visible = visibilityInput.checked;
        }

        const clearButton = document.getElementById("clearButton");
        if (clearButton && !clearButton.__terrainMeshBound) {
            clearButton.addEventListener("click", () => clear());
            clearButton.__terrainMeshBound = true;
        }

        installDiagnosticCard();
    };

    window.TerrainMesh = {
        VERSION,
        METHOD,
        TRIANGULATION_METHOD,
        buildMesh,
        render,
        clear,
        setVisible,
        get lastMesh() { return lastMesh; },
        get collection() { return meshCollection; }
    };

    TerrainAnalysisCore.registerModule({
        id: "mesh",
        title: "Terénny mesh M1",
        description: "Vrcholy, trojuholníkové plochy, hrany, normály a diagnostický drôtený model.",
        requires: ["geometry"],

        run: async function (context) {
            const geometryResult = context.layers.geometry;
            const mesh = buildMesh(geometryResult);
            const visibilityInput = document.getElementById("meshVisible");
            visible = visibilityInput ? visibilityInput.checked : true;
            render(context.viewer, mesh, {
                heightOffsetM: finite(context.config.diagnosticHeightOffsetM, 6) + 3
            });

            context.provenance.mesh = {
                dataOrigin: "ODVODENÉ VÝPOČTOM",
                method: METHOD,
                version: VERSION,
                triangulationMethod: TRIANGULATION_METHOD
            };
            context.diagnostics.mesh = mesh.summary;

            if (typeof window.logStatus === "function") {
                window.logStatus(
                    "Terénny mesh M1: " + mesh.summary.vertexCount + " vrcholov, " +
                    mesh.summary.edgeCount + " hrán, " + mesh.summary.faceCount +
                    " plôch, 3D plocha " + mesh.summary.totalArea3DM2.toFixed(0) + " m².",
                    mesh.summary.validation.valid ? "success" : "error"
                );
                window.logStatus(
                    "Drôtený model: azúrové plynulé hrany, žlté až oranžové výraznejšie geometrické rozhrania. Morfologický význam hrán ešte nie je konečný."
                );
            }

            return mesh;
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", installUi, { once: true });
    } else {
        installUi();
    }
})();

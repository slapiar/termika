// js/terrain-mesh-surface.js
// TermikaXC v2.6 – M1.2: diagnostická plošná výplň terénneho meshu.
//
// Susedné trojuholníky zostávajú samostatnými fyzikálnymi plochami, ale podľa
// dominantnej farebnej rodiny širšieho okolia sa opticky spájajú do súvislých
// oblastí. Alternatívny režim vykreslí celý mesh jednotnou šedou farbou.

(function () {
    if (!window.TerrainAnalysisCore) {
        throw new Error("Najprv musí byť načítaný terrain-analysis-core.js.");
    }
    if (!window.TerrainMesh) {
        throw new Error("Najprv musí byť načítaný terrain-mesh.js.");
    }

    const VERSION = "2.6.0-m1.2-surface.2";
    const METHOD = "TERRAIN_MESH_SURFACE_M1_2";
    const FILL_METHOD = "ONE_RING_DOMINANT_FAMILY_V1";
    const RENDER_METHOD = "COPLANAR_TRIANGLE_PRIMITIVE_V2";
    const GRAY_FILL_HEX = "#858B91";
    const DOMINANT_FILL_ALPHA = 0.82;
    const GRAY_FILL_ALPHA = 0.86;

    let fillPrimitive = null;
    let activeViewer = null;
    let lastMesh = null;
    let visible = false;
    let mode = "dominant";
    let lastRenderOptions = {};
    let lastRenderState = {
        status: "idle",
        renderedFaceCount: 0,
        expectedFaceCount: 0,
        mode,
        error: null
    };

    const keyOf = (row, col) => String(row) + ":" + String(col);
    const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

    const mean = function (values) {
        const valid = values.map(Number).filter(Number.isFinite);
        if (!valid.length) return null;
        return valid.reduce((sum, value) => sum + value, 0) / valid.length;
    };

    const familyForVertex = function (vertex) {
        const cell = vertex?.cell;
        if (!cell) return null;
        return cell.color?.family ||
            cell.geometry?.family ||
            window.TerrainDesign?.familyForCell?.(cell) ||
            null;
    };

    const paletteEntry = function (family) {
        return window.TerrainDesign?.palette?.[family] ||
            window.TerrainDesign?.palette?.G14 ||
            { name: "Neurčitý prechod", hex: "#B155E0" };
    };

    const assignDominantFill = function (mesh) {
        if (!mesh?.faces?.length || !mesh?.vertices?.length) {
            throw new Error("Plošná výplň nedostala platný terénny mesh.");
        }

        const vertexMap = new Map(mesh.vertices.map((vertex) => [vertex.id, vertex]));
        const gridIndex = new Map(mesh.vertices.map((vertex) => [keyOf(vertex.row, vertex.col), vertex]));
        const familyCounts = {};

        mesh.faces.forEach((face) => {
            const faceVertexIds = new Set(face.vertexIds);
            const neighborhood = new Map();

            face.vertexIds.forEach((vertexId) => {
                const vertex = vertexMap.get(vertexId);
                if (!vertex) return;

                for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
                    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
                        const candidate = gridIndex.get(keyOf(
                            vertex.row + rowOffset,
                            vertex.col + colOffset
                        ));
                        if (candidate) neighborhood.set(candidate.id, candidate);
                    }
                }
            });

            const scores = new Map();
            let totalWeight = 0;

            neighborhood.forEach((vertex) => {
                const family = familyForVertex(vertex);
                if (!family) return;

                const isFaceVertex = faceVertexIds.has(vertex.id);
                const weight = isFaceVertex ? 3 : 1;
                const current = scores.get(family) || {
                    family,
                    weight: 0,
                    faceWeight: 0,
                    sampleCount: 0
                };

                current.weight += weight;
                current.faceWeight += isFaceVertex ? weight : 0;
                current.sampleCount += 1;
                scores.set(family, current);
                totalWeight += weight;
            });

            const ranked = Array.from(scores.values()).sort((left, right) =>
                right.weight - left.weight ||
                right.faceWeight - left.faceWeight ||
                right.sampleCount - left.sampleCount ||
                left.family.localeCompare(right.family, "sk")
            );

            const winner = ranked[0] || {
                family: "G14",
                weight: 1,
                faceWeight: 0,
                sampleCount: 0
            };
            const palette = paletteEntry(winner.family);

            face.surfaceFill = {
                method: FILL_METHOD,
                family: winner.family,
                familyName: palette.name,
                baseHex: palette.hex,
                confidence: totalWeight > 0 ? winner.weight / totalWeight : 0,
                sampleCount: winner.sampleCount,
                totalWeight,
                scores: Object.fromEntries(
                    ranked.map((entry) => [entry.family, {
                        weight: entry.weight,
                        faceWeight: entry.faceWeight,
                        sampleCount: entry.sampleCount
                    }])
                )
            };

            familyCounts[winner.family] = (familyCounts[winner.family] || 0) + 1;
        });

        const confidences = mesh.faces
            .map((face) => face.surfaceFill?.confidence)
            .filter(Number.isFinite);

        mesh.surfaceFill = {
            version: VERSION,
            method: METHOD,
            fillMethod: FILL_METHOD,
            renderMethod: RENDER_METHOD,
            familyCounts,
            meanConfidence: mean(confidences),
            faceCount: mesh.faces.length,
            topologyMerged: false,
            note: "Súvislé oblasti sú zatiaľ vizuálnym spojením susedných trojuholníkov rovnakej rodiny."
        };

        return mesh.surfaceFill;
    };

    const colorForFace = function (face, selectedMode = mode) {
        const gray = selectedMode === "gray";
        const hex = gray ? GRAY_FILL_HEX : (face.surfaceFill?.baseHex || "#B155E0");
        const alpha = gray ? GRAY_FILL_ALPHA : DOMINANT_FILL_ALPHA;
        return Cesium.Color.fromCssColorString(hex).withAlpha(alpha);
    };

    const getStatusElement = function () {
        return document.getElementById("meshFillStatus");
    };

    const setUiStatus = function (text, state = "info") {
        const element = getStatusElement();
        if (!element) return;
        element.textContent = text;
        element.dataset.state = state;
        element.style.color = state === "error"
            ? "#ff8585"
            : (state === "success" ? "#8cff9d" : "#8fa9b8");
    };

    const updateRenderState = function (patch) {
        lastRenderState = { ...lastRenderState, ...patch };
        return lastRenderState;
    };

    const clear = function (viewer = activeViewer) {
        if (fillPrimitive && viewer?.scene?.primitives) {
            viewer.scene.primitives.remove(fillPrimitive);
        }
        fillPrimitive = null;
        activeViewer?.scene?.requestRender?.();
    };

    const createGeometryInstances = function (mesh, heightOffsetM, selectedMode) {
        const vertexMap = new Map(mesh.vertices.map((vertex) => [vertex.id, vertex]));
        const instances = [];

        mesh.faces.forEach((face) => {
            const positions = face.vertexIds
                .map((vertexId) => vertexMap.get(vertexId))
                .filter(Boolean)
                .map((vertex) => Cesium.Cartesian3.fromDegrees(
                    vertex.lon,
                    vertex.lat,
                    vertex.heightM + heightOffsetM
                ));

            if (positions.length !== 3) return;

            const description = Cesium.CoplanarPolygonGeometry.fromPositions({
                positions,
                vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT
            });
            const geometry = Cesium.CoplanarPolygonGeometry.createGeometry(description);
            if (!geometry) return;

            instances.push(new Cesium.GeometryInstance({
                id: "terrain-mesh-surface:" + face.id,
                geometry,
                attributes: {
                    color: Cesium.ColorGeometryInstanceAttribute.fromColor(
                        colorForFace(face, selectedMode)
                    )
                }
            }));
        });

        return instances;
    };

    const render = function (viewer, mesh = lastMesh, options = {}) {
        if (!viewer?.scene?.primitives) {
            throw new Error("Nie je dostupný Cesium viewer pre plošnú výplň meshu.");
        }
        if (!mesh?.faces?.length || !mesh?.vertices?.length) {
            clear(viewer);
            setUiStatus("Výplň: chýba vypočítaný mesh.", "error");
            updateRenderState({
                status: "error",
                renderedFaceCount: 0,
                expectedFaceCount: mesh?.faces?.length || 0,
                error: "MESH_NOT_AVAILABLE"
            });
            return null;
        }

        activeViewer = viewer;
        lastMesh = mesh;
        lastRenderOptions = { ...options };
        clear(viewer);

        const heightOffsetM = finite(options.heightOffsetM, 5);
        const selectedMode = options.mode === "gray" ? "gray" : "dominant";

        try {
            setUiStatus("Výplň: vytváram plochy…");
            const instances = createGeometryInstances(mesh, heightOffsetM, selectedMode);

            if (!instances.length) {
                throw new Error("Nevznikla žiadna vykresliteľná trojuholníková plocha.");
            }

            fillPrimitive = viewer.scene.primitives.add(new Cesium.Primitive({
                geometryInstances: instances,
                appearance: new Cesium.PerInstanceColorAppearance({
                    flat: true,
                    translucent: true,
                    closed: false
                }),
                asynchronous: false,
                allowPicking: false,
                releaseGeometryInstances: true,
                show: visible
            }));

            updateRenderState({
                status: "ready",
                renderedFaceCount: instances.length,
                expectedFaceCount: mesh.faces.length,
                mode: selectedMode,
                error: null
            });

            setUiStatus(
                "Výplň: " + instances.length + " / " + mesh.faces.length +
                " plôch · " + (selectedMode === "gray" ? "šedá" : "G01–G16"),
                "success"
            );
            viewer.scene.requestRender?.();
            return fillPrimitive;
        } catch (error) {
            clear(viewer);
            updateRenderState({
                status: "error",
                renderedFaceCount: 0,
                expectedFaceCount: mesh.faces.length,
                mode: selectedMode,
                error: error.message
            });
            setUiStatus("Výplň: chyba · " + error.message, "error");
            if (typeof window.logStatus === "function") {
                window.logStatus("Chyba plošnej výplne meshu: " + error.message, "error");
            }
            throw error;
        }
    };

    const setVisible = function (value) {
        visible = Boolean(value);

        if (fillPrimitive) {
            fillPrimitive.show = visible;
            setUiStatus(
                visible
                    ? "Výplň: zobrazená · " + lastRenderState.renderedFaceCount + " plôch"
                    : "Výplň: pripravená, ale skrytá.",
                visible ? "success" : "info"
            );
            activeViewer?.scene?.requestRender?.();
            return;
        }

        if (visible && activeViewer && lastMesh) {
            render(activeViewer, lastMesh, {
                ...lastRenderOptions,
                mode
            });
            return;
        }

        if (visible) {
            setUiStatus("Výplň: najprv spusti analýzu terénu.");
        } else {
            setUiStatus("Výplň: vypnutá.");
        }
    };

    const setMode = function (value) {
        mode = value === "gray" ? "gray" : "dominant";
        updateRenderState({ mode });

        if (activeViewer && lastMesh && visible) {
            render(activeViewer, lastMesh, {
                ...lastRenderOptions,
                mode
            });
        } else {
            setUiStatus(
                "Výplň: režim " + (mode === "gray" ? "jednotná šedá" : "dominantná G01–G16") +
                " · čaká na zobrazenie."
            );
        }
    };

    const addDiagnosticRow = function (container, label, value) {
        const key = document.createElement("b");
        const data = document.createElement("span");
        key.textContent = label;
        data.textContent = value;
        container.append(key, data);
    };

    const dominantIncidentFill = function (faces) {
        const counts = new Map();
        faces.forEach((face) => {
            const family = face.surfaceFill?.family;
            if (!family) return;
            counts.set(family, (counts.get(family) || 0) + 1);
        });

        const winner = Array.from(counts.entries())
            .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "sk"))[0];
        if (!winner) return null;

        const palette = paletteEntry(winner[0]);
        return {
            family: winner[0],
            familyName: palette.name,
            count: winner[1]
        };
    };

    const installDiagnosticCard = function () {
        const original = window.showCellDiagnostics;
        if (typeof original !== "function" || original.__terrainMeshSurfaceWrapped) return;

        const wrapped = function (cell) {
            original(cell);

            const body = document.getElementById("cellDiagnosticsBody");
            const meshInfo = cell?.mesh;
            const mesh = lastMesh;
            if (!body || !meshInfo || !mesh) return;

            const faceMap = new Map(mesh.faces.map((face) => [face.id, face]));
            const incidentFaces = meshInfo.faceIds.map((id) => faceMap.get(id)).filter(Boolean);
            const dominantFill = dominantIncidentFill(incidentFaces);
            const meanConfidence = mean(incidentFaces.map((face) => face.surfaceFill?.confidence));

            const card = document.createElement("section");
            card.className = "terrain-design-color-card";

            const heading = document.createElement("h3");
            heading.textContent = "Plošná výplň meshu M1.2";
            heading.style.margin = "0 0 7px";
            heading.style.color = "#70e8ff";
            heading.style.fontSize = "13px";

            const rows = document.createElement("div");
            rows.className = "terrain-design-color-row";
            addDiagnosticRow(rows, "Dominantná rodina okolia", dominantFill
                ? dominantFill.family + " · " + dominantFill.familyName
                : "neurčená");
            addDiagnosticRow(rows, "Priemerná dôvera", Number.isFinite(meanConfidence)
                ? meanConfidence.toFixed(2)
                : "neurčená");
            addDiagnosticRow(rows, "Aktuálny režim", mode === "gray"
                ? "jednotná šedá"
                : "dominantná G01–G16");
            addDiagnosticRow(rows, "Vykreslené plochy",
                lastRenderState.renderedFaceCount + " / " + lastRenderState.expectedFaceCount);
            addDiagnosticRow(rows, "Stav rendereru", lastRenderState.status);
            addDiagnosticRow(rows, "Renderer", RENDER_METHOD);
            addDiagnosticRow(rows, "Metóda farby", FILL_METHOD);
            addDiagnosticRow(rows, "Topologické zlúčenie", "zatiaľ nie · plochy sa spájajú vizuálne");

            card.append(heading, rows);
            const meshCard = Array.from(body.querySelectorAll(".terrain-design-color-card"))
                .find((candidate) => candidate.querySelector("h3")?.textContent?.startsWith("Terénny mesh"));
            if (meshCard) meshCard.insertAdjacentElement("afterend", card);
            else body.querySelector(".diagnostic-intro")?.insertAdjacentElement("afterend", card);
        };

        wrapped.__terrainMeshSurfaceWrapped = true;
        window.showCellDiagnostics = wrapped;
    };

    const installStyles = function () {
        if (document.getElementById("terrain-mesh-surface-style")) return;

        const style = document.createElement("style");
        style.id = "terrain-mesh-surface-style";
        style.textContent = `
            .terrain-mesh-fill-mode{
                align-items:center;
                padding-left:24px;
                color:#b9cbd5
            }
            .terrain-mesh-fill-mode select{
                min-width:180px;
                padding:4px 6px;
                border:1px solid #426277;
                border-radius:4px;
                background:#10212b;
                color:#fff
            }
            .terrain-mesh-fill-status{
                display:block;
                margin:-1px 0 6px 24px;
                color:#8fa9b8;
                font-size:11px;
                line-height:1.25
            }
        `;
        document.head.appendChild(style);
    };

    const installUi = function () {
        installStyles();

        let moduleInput = document.querySelector('.module-toggle[value="mesh-surface"]');
        if (!moduleInput) {
            const meshInput = document.querySelector('.module-toggle[value="mesh"]');
            const anchorLabel = meshInput?.closest("label");
            if (anchorLabel) {
                const label = document.createElement("label");
                moduleInput = document.createElement("input");
                moduleInput.className = "module-toggle";
                moduleInput.type = "checkbox";
                moduleInput.value = "mesh-surface";
                moduleInput.checked = true;
                label.append(moduleInput, document.createTextNode(" Plošná výplň meshu M1.2"));
                anchorLabel.insertAdjacentElement("afterend", label);
            }
        }

        let fillInput = document.getElementById("meshFillVisible");
        if (!fillInput) {
            const wireInput = document.getElementById("meshVisible");
            const anchorLabel = wireInput?.closest("label") ||
                document.getElementById("contoursVisible")?.closest("label");

            if (anchorLabel) {
                const label = document.createElement("label");
                fillInput = document.createElement("input");
                fillInput.id = "meshFillVisible";
                fillInput.type = "checkbox";
                fillInput.checked = false;
                label.append(fillInput, document.createTextNode(" Vyplniť plochy meshu"));
                anchorLabel.insertAdjacentElement("afterend", label);
            }
        }

        if (fillInput && !fillInput.__terrainMeshSurfaceBound) {
            fillInput.addEventListener("change", () => setVisible(fillInput.checked));
            fillInput.__terrainMeshSurfaceBound = true;
            visible = fillInput.checked;
        }

        let modeSelect = document.getElementById("meshFillMode");
        if (!modeSelect && fillInput) {
            const label = document.createElement("label");
            label.className = "terrain-mesh-fill-mode";
            label.append(document.createTextNode("Farba výplne "));

            modeSelect = document.createElement("select");
            modeSelect.id = "meshFillMode";

            const dominantOption = document.createElement("option");
            dominantOption.value = "dominant";
            dominantOption.textContent = "Dominantná G01–G16";

            const grayOption = document.createElement("option");
            grayOption.value = "gray";
            grayOption.textContent = "Jednotná šedá";

            modeSelect.append(dominantOption, grayOption);
            label.append(modeSelect);
            fillInput.closest("label")?.insertAdjacentElement("afterend", label);
        }

        if (modeSelect && !modeSelect.__terrainMeshSurfaceBound) {
            modeSelect.addEventListener("change", () => setMode(modeSelect.value));
            modeSelect.__terrainMeshSurfaceBound = true;
            mode = modeSelect.value === "gray" ? "gray" : "dominant";
        }

        if (!getStatusElement() && modeSelect) {
            const status = document.createElement("small");
            status.id = "meshFillStatus";
            status.className = "terrain-mesh-fill-status";
            status.textContent = "Výplň: čaká na výpočet meshu.";
            modeSelect.closest("label")?.insertAdjacentElement("afterend", status);
        }

        if (moduleInput && !moduleInput.__terrainMeshSurfaceBound) {
            moduleInput.addEventListener("change", () => {
                if (!moduleInput.checked) {
                    if (fillInput) fillInput.checked = false;
                    setVisible(false);
                }
            });
            moduleInput.__terrainMeshSurfaceBound = true;
        }

        const clearButton = document.getElementById("clearButton");
        if (clearButton && !clearButton.__terrainMeshSurfaceBound) {
            clearButton.addEventListener("click", () => {
                clear();
                setUiStatus("Výplň: výsledky boli skryté.");
            });
            clearButton.__terrainMeshSurfaceBound = true;
        }

        installDiagnosticCard();
    };

    window.TerrainMeshSurface = {
        VERSION,
        METHOD,
        FILL_METHOD,
        RENDER_METHOD,
        assignDominantFill,
        render,
        clear,
        setVisible,
        setMode,
        get visible() { return visible; },
        get mode() { return mode; },
        get primitive() { return fillPrimitive; },
        get mesh() { return lastMesh; },
        get renderState() { return { ...lastRenderState }; }
    };

    TerrainAnalysisCore.registerModule({
        id: "mesh-surface",
        title: "Plošná výplň meshu M1.2",
        description: "Dominantná farebná rodina širšieho okolia alebo jednotná šedá výplň trojuholníkových plôch.",
        requires: ["geometry", "mesh"],

        run: async function (context) {
            const geometryResult = context.layers.geometry;
            const mesh = context.layers.mesh;

            window.TerrainDesign?.prepareResult?.(geometryResult);
            const surfaceSummary = assignDominantFill(mesh);

            const fillInput = document.getElementById("meshFillVisible");
            const modeSelect = document.getElementById("meshFillMode");
            visible = fillInput ? fillInput.checked : false;
            mode = modeSelect?.value === "gray" ? "gray" : "dominant";
            activeViewer = context.viewer;
            lastMesh = mesh;
            lastRenderOptions = {
                heightOffsetM: Math.max(1, finite(context.config.diagnosticHeightOffsetM, 6) - 1),
                mode
            };

            if (visible) {
                render(context.viewer, mesh, lastRenderOptions);
            } else {
                clear(context.viewer);
                updateRenderState({
                    status: "prepared",
                    renderedFaceCount: 0,
                    expectedFaceCount: mesh.faces.length,
                    mode,
                    error: null
                });
                setUiStatus(
                    "Výplň: pripravených " + mesh.faces.length +
                    " plôch · zapni zobrazenie."
                );
            }

            context.provenance.meshSurface = {
                dataOrigin: "ODVODENÉ VÝPOČTOM",
                method: METHOD,
                version: VERSION,
                fillMethod: FILL_METHOD,
                renderMethod: RENDER_METHOD
            };
            context.diagnostics.meshSurface = {
                ...surfaceSummary,
                visible,
                mode,
                renderState: { ...lastRenderState }
            };

            if (typeof window.logStatus === "function") {
                window.logStatus(
                    "Plošná výplň meshu M1.2: dominantná rodina G01–G16 pripravená pre " +
                    surfaceSummary.faceCount + " trojuholníkov; priemerná dôvera " +
                    (surfaceSummary.meanConfidence || 0).toFixed(2) + "."
                );
                window.logStatus(
                    "Výplň je " + (visible ? "zobrazená" : "pripravená, ale skrytá") +
                    "; režim: " + (mode === "gray" ? "jednotná šedá" : "dominantná G01–G16") +
                    "; renderer: " + RENDER_METHOD + "."
                );
            }

            return surfaceSummary;
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", installUi, { once: true });
    } else {
        installUi();
    }
})();

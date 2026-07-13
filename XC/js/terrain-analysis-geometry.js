// js/terrain-analysis-geometry.js
// TermikaXC v2.6 – adaptér existujúcej geometrickej analýzy do modulárneho jadra.

(function () {
    if (!window.TerrainAnalysisCore) {
        throw new Error("Najprv musí byť načítaný terrain-analysis-core.js.");
    }
    if (!window.TerrainAnalysis) {
        throw new Error("Najprv musí byť načítaný terrain-analysis.js.");
    }

    const currentScriptSrc = document.currentScript?.src || "";
    const versionSuffix = currentScriptSrc.includes("?")
        ? currentScriptSrc.slice(currentScriptSrc.indexOf("?"))
        : "";

    const loadScript = function (src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-termika-module="' + src + '"]');
            if (existing) {
                if (existing.dataset.loaded === "true") resolve();
                else {
                    existing.addEventListener("load", resolve, { once: true });
                    existing.addEventListener("error", reject, { once: true });
                }
                return;
            }

            const script = document.createElement("script");
            script.src = src + versionSuffix;
            script.async = false;
            script.dataset.termikaModule = src;
            script.addEventListener("load", () => {
                script.dataset.loaded = "true";
                resolve();
            }, { once: true });
            script.addEventListener("error", () => {
                reject(new Error("Nepodarilo sa načítať modul " + src + "."));
            }, { once: true });
            document.head.appendChild(script);
        });
    };

    const terrainMorphologyReady = (async function () {
        if (!window.TerrainMorphology) {
            await loadScript("js/terrain-morphology.js");
        }
        return window.TerrainMorphology;
    })();

    const terrainMeshReady = (async function () {
        await terrainMorphologyReady;
        if (!window.TerrainMesh) {
            await loadScript("js/terrain-mesh.js");
        }
        return window.TerrainMesh;
    })();

    const terrainDesignReady = (async function () {
        await terrainMeshReady;
        if (!window.TerrainDesign) {
            await loadScript("js/terrain-design.js");
        }
        await loadScript("js/terrain-design-ui.js");
        return window.TerrainDesign;
    })();

    const terrainFocusUiReady = (async function () {
        await terrainDesignReady;
        if (!window.TerrainAnalysisFocusUI) {
            await loadScript("js/terrain-analysis-focus-ui.js");
        }
        return window.TerrainAnalysisFocusUI;
    })();

    window.TerrainMorphologyReady = terrainMorphologyReady;
    window.TerrainMeshReady = terrainMeshReady;
    window.TerrainDesignReady = terrainDesignReady;
    window.TerrainAnalysisFocusUIReady = terrainFocusUiReady;

    TerrainAnalysisCore.registerModule({
        id: "geometry",
        title: "Geometria reliéfu",
        description: "Výška, sklon, orientácia, gradient, zakrivenie, lokálna geometria a pracovný terénny dizajn G01–G16.",
        requires: [],

        run: async function (context) {
            await terrainMorphologyReady;
            await terrainMeshReady;
            await terrainDesignReady;
            await terrainFocusUiReady;

            const size = TerrainAnalysisCore.gridSizeForCircle(
                context.config.radiusM,
                context.config.spacingM
            );

            const rawResult = await TerrainAnalysis.analyzujOblast(context.viewer, {
                center: context.center,
                rows: size,
                cols: size,
                spacingM: context.config.spacingM,
                diagnosticHeightOffsetM: context.config.diagnosticHeightOffsetM
            });

            const circularResult = TerrainAnalysisCore.applyCircularMask(
                rawResult,
                context.config.radiusM
            );

            context.provenance.geometry = {
                dataOrigin: rawResult.source?.dataOrigin || "ODVODENÉ VÝPOČTOM",
                terrainSource: rawResult.source?.terrain || null,
                sampledPoints: rawResult.source?.sampledPoints || 0,
                totalSampledPoints: rawResult.source?.totalPoints || 0,
                localGeometryMethod: TerrainAnalysis.LOCAL_GEOMETRY_VERSION || null,
                terrainDesignVersion: window.TerrainDesign?.VERSION || null,
                morphologyModuleVersion: window.TerrainMorphology?.VERSION || null,
                meshModuleVersion: window.TerrainMesh?.VERSION || null,
                focusUiVersion: window.TerrainAnalysisFocusUI?.VERSION || null
            };

            context.diagnostics.geometry = {
                gridRows: size,
                gridCols: size,
                spacingM: context.config.spacingM,
                radiusM: context.config.radiusM,
                cellsBeforeMask: rawResult.cells.length,
                cellsAfterMask: circularResult.cells.length,
                palette: "G01-G16",
                shadeMethod: "GEOMETRY_CONTRAST_V2",
                relativeHeightMethod: null,
                relativeDepthMethod: null
            };

            return circularResult;
        }
    });
})();

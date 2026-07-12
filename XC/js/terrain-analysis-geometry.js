// js/terrain-analysis-geometry.js
// TermikaXC v2.6 – adaptér existujúcej geometrickej analýzy do modulárneho jadra.

(function () {
    if (!window.TerrainAnalysisCore) {
        throw new Error("Najprv musí byť načítaný terrain-analysis-core.js.");
    }
    if (!window.TerrainAnalysis) {
        throw new Error("Najprv musí byť načítaný terrain-analysis.js.");
    }

    TerrainAnalysisCore.registerModule({
        id: "geometry",
        title: "Geometria reliéfu",
        description: "Výška, sklon, orientácia, gradient, zakrivenie a pracovná morfologická klasifikácia.",
        requires: [],

        run: async function (context) {
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
                totalSampledPoints: rawResult.source?.totalPoints || 0
            };

            context.diagnostics.geometry = {
                gridRows: size,
                gridCols: size,
                spacingM: context.config.spacingM,
                radiusM: context.config.radiusM,
                cellsBeforeMask: rawResult.cells.length,
                cellsAfterMask: circularResult.cells.length
            };

            return circularResult;
        }
    });
})();

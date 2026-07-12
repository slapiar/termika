// js/terrain-analysis-diagnostics.js
// TermikaXC v2.6 – vysvetliteľná diagnostika pracovnej geometrickej klasifikácie.
//
// Modul nemení fyzikálny výpočet ani farebnú klasifikáciu. Z už vypočítaných
// čísel zostaví čitateľný diagnostický záznam a presne uvedie, ktoré aktuálne
// pracovné pravidlo viedlo k zobrazenej triede.

(function () {
    if (!window.TerrainAnalysis) {
        throw new Error("Najprv musí byť načítaný terrain-analysis.js.");
    }

    const reasonsForType = function (cell, scaledLaplacian, scaledProfileCurvature) {
        switch (cell.terrainShape) {
            case "ROVINA":
                return [
                    "sklon je menší než 2°",
                    "lokálny výškový rozdiel je menší než 4 m"
                ];

            case "REBRO_ALEBO_HRANA":
                return [
                    "normalizovaný Laplacián je výrazne záporný (≤ −1,2)",
                    "normalizované profilové zakrivenie je záporné (≤ −0,5)",
                    "sklon je aspoň 12°"
                ];

            case "VYVÝŠENINA":
                return [
                    "normalizovaný Laplacián je výrazne záporný (≤ −1,2)",
                    "normalizované profilové zakrivenie je záporné (≤ −0,5)",
                    "sklon je menší než 12°"
                ];

            case "ŽĽAB_ALEBO_ZBERNICA":
                return [
                    "normalizovaný Laplacián je výrazne kladný (≥ 1,2)",
                    "normalizované profilové zakrivenie je kladné (≥ 0,5)",
                    "sklon je aspoň 8°"
                ];

            case "DEPRESIA":
                return [
                    "normalizovaný Laplacián je výrazne kladný (≥ 1,2)",
                    "normalizované profilové zakrivenie je kladné (≥ 0,5)",
                    "sklon je menší než 8°"
                ];

            case "SVAH":
                return [
                    "sklon je aspoň 5°",
                    "krivosti nesplnili prah výrazného konvexného ani konkávneho tvaru"
                ];

            default:
                return [
                    "sklon je menší než 5°",
                    "lokálny reliéf alebo krivosti nespĺňajú pravidlo roviny ani výrazného tvaru"
                ];
        }
    };

    const ruleForType = function (type) {
        return {
            ROVINA: "FLAT_LOW_RELIEF",
            REBRO_ALEBO_HRANA: "CONVEX_LINEAR_CANDIDATE",
            VYVÝŠENINA: "CONVEX_AREA_CANDIDATE",
            ŽĽAB_ALEBO_ZBERNICA: "CONCAVE_LINEAR_CANDIDATE",
            DEPRESIA: "CONCAVE_AREA_CANDIDATE",
            SVAH: "SLOPE_WITHOUT_STRONG_CURVATURE",
            PRECHODOVÝ_TERÉN: "MIXED_OR_WEAK_SIGNAL"
        }[type] || "UNKNOWN_RULE";
    };

    TerrainAnalysis.vytvorDiagnostikuBunky = function (cell) {
        if (!cell || typeof cell !== "object") {
            throw new Error("Diagnostika nedostala platnú bunku terénu.");
        }

        const spacingM = Number(
            TerrainAnalysis.lastResult?.config?.spacingM ??
            TerrainAnalysis.lastResult?.spacingM ??
            TerrainAnalysis.defaultOptions?.spacingM ??
            40
        );
        const curvatureScale = spacingM * spacingM;
        const scaledLaplacian = Number(cell.curvature) * curvatureScale;
        const scaledProfileCurvature = Number(cell.profileCurvature) * curvatureScale;

        return {
            type: cell.terrainShape,
            confidence: cell.terrainShapeConfidence,
            rule: ruleForType(cell.terrainShape),
            reasons: reasonsForType(cell, scaledLaplacian, scaledProfileCurvature),
            metrics: {
                heightM: cell.heightM,
                slopeDeg: cell.slopeDeg,
                aspectDeg: cell.aspectDeg,
                localReliefM: cell.localReliefM,
                gradient: cell.gradient,
                laplacian: cell.curvature,
                profileCurvature: cell.profileCurvature,
                scaledLaplacian,
                scaledProfileCurvature,
                convexity: cell.convexity,
                spacingM
            },
            position: {
                lat: cell.lat,
                lon: cell.lon,
                eastM: cell.eastM,
                northM: cell.northM,
                row: cell.row,
                col: cell.col
            },
            pending: {
                geometryFamily: null,
                morphologyRole: null,
                relativeHeight: null,
                relativeDepth: null,
                breakIntensity: null
            },
            dataOrigin: cell.dataOrigin || null
        };
    };
})();

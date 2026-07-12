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

    let hoverHandler = null;
    let hoverViewer = null;
    let hoverTooltip = null;

    const typeLabels = {
        ROVINA: "Rovina",
        SVAH: "Svah",
        REBRO_ALEBO_HRANA: "Rebro alebo hrana",
        VYVÝŠENINA: "Vyvýšenina",
        ŽĽAB_ALEBO_ZBERNICA: "Žľab alebo zbernica",
        DEPRESIA: "Depresia",
        PRECHODOVÝ_TERÉN: "Prechodový terén"
    };

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

    const ensureHoverTooltip = function () {
        if (hoverTooltip?.isConnected) return hoverTooltip;

        hoverTooltip = document.createElement("div");
        hoverTooltip.id = "terrain-analysis-hover-tooltip";
        hoverTooltip.setAttribute("role", "tooltip");
        Object.assign(hoverTooltip.style, {
            position: "fixed",
            zIndex: "1000",
            display: "none",
            pointerEvents: "none",
            padding: "7px 10px",
            border: "1px solid rgba(112, 232, 255, 0.75)",
            borderRadius: "6px",
            background: "rgba(7, 16, 24, 0.94)",
            color: "#eef",
            boxShadow: "0 5px 16px rgba(0, 0, 0, 0.42)",
            font: "13px/1.3 system-ui, sans-serif",
            whiteSpace: "nowrap"
        });

        document.body.appendChild(hoverTooltip);
        return hoverTooltip;
    };

    const hideHoverTooltip = function () {
        if (hoverTooltip) hoverTooltip.style.display = "none";
        if (hoverViewer?.scene?.canvas) hoverViewer.scene.canvas.style.cursor = "crosshair";
    };

    const showHoverTooltip = function (viewer, screenPosition, cell) {
        const tooltip = ensureHoverTooltip();
        const label = typeLabels[cell.terrainShape] || String(cell.terrainShape || "Neurčený bod").replaceAll("_", " ");
        const height = Number(cell.heightM);
        const heightText = Number.isFinite(height)
            ? height.toLocaleString("sk-SK", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " m n. m."
            : "výška nie je dostupná";

        tooltip.replaceChildren();

        const title = document.createElement("strong");
        title.style.display = "block";
        title.style.color = "#70e8ff";
        title.textContent = label;

        const altitude = document.createElement("span");
        altitude.textContent = heightText;

        tooltip.append(title, altitude);
        tooltip.style.display = "block";

        const canvasRect = viewer.scene.canvas.getBoundingClientRect();
        const pointerX = canvasRect.left + screenPosition.x;
        const pointerY = canvasRect.top + screenPosition.y;
        const margin = 8;
        const gap = 10;
        const rect = tooltip.getBoundingClientRect();

        const left = Math.min(
            Math.max(margin, pointerX + 13),
            window.innerWidth - rect.width - margin
        );
        const preferredTop = pointerY - rect.height - gap;
        const top = preferredTop >= margin
            ? preferredTop
            : Math.min(window.innerHeight - rect.height - margin, pointerY + 16);

        tooltip.style.left = left + "px";
        tooltip.style.top = top + "px";
        viewer.scene.canvas.style.cursor = "pointer";
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

    TerrainAnalysis.nainstalujHoverDiagnostiku = function (viewer) {
        if (!viewer?.scene?.canvas || typeof Cesium === "undefined") return;
        if (hoverHandler && hoverViewer === viewer) return;

        if (hoverHandler) hoverHandler.destroy();
        hideHoverTooltip();

        hoverViewer = viewer;
        hoverHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        hoverHandler.setInputAction((event) => {
            const picked = viewer.scene.pick(event.endPosition);
            const pickedId = picked?.id;

            if (pickedId?.type === "terrain-analysis-cell" && pickedId.cell) {
                showHoverTooltip(viewer, event.endPosition, pickedId.cell);
                return;
            }

            hideHoverTooltip();
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        hoverHandler.setInputAction(hideHoverTooltip, Cesium.ScreenSpaceEventType.MOUSE_LEAVE);
    };

    const originalShowDiagnostics = TerrainAnalysis.zobrazDiagnostiku;
    TerrainAnalysis.zobrazDiagnostiku = function (viewer, result) {
        const collection = originalShowDiagnostics.call(this, viewer, result);
        this.nainstalujHoverDiagnostiku(viewer);
        return collection;
    };

    const originalHideDiagnostics = TerrainAnalysis.skryDiagnostiku;
    TerrainAnalysis.skryDiagnostiku = function (viewer) {
        hideHoverTooltip();
        return originalHideDiagnostics.call(this, viewer);
    };
})();
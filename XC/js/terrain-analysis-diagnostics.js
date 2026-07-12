// js/terrain-analysis-diagnostics.js
// TermikaXC v2.6 – vysvetliteľná diagnostika pracovnej geometrickej klasifikácie.
//
// Modul nemení zdrojové výšky ani pôvodné morfologické kandidáty. Nad už
// vypočítanými metrikami vytvára samostatnú vrstvu lokálnej geometrie:
// rovinná, konvexná, konkávna, zlomová, stenová alebo prechodová.

(function () {
    if (!window.TerrainAnalysis) {
        throw new Error("Najprv musí byť načítaný terrain-analysis.js.");
    }

    let hoverHandler = null;
    let hoverViewer = null;
    let hoverCanvas = null;
    let hoverCanvasLeaveListener = null;
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

    const localGeometryLabels = {
        ROVINNÁ: "rovinná",
        KONVEXNÁ: "konvexná",
        KONKÁVNA: "konkávna",
        ZLOMOVÁ: "zlomová",
        STENOVÁ: "stenová",
        PRECHODOVÁ: "prechodová"
    };

    const clamp01 = function (value) {
        return Math.max(0, Math.min(1, Number(value) || 0));
    };

    const classifyLocalGeometry = function (cell, spacingM) {
        const curvatureScale = spacingM * spacingM;
        const scaledLaplacian = Number(cell.curvature) * curvatureScale;
        const scaledProfileCurvature = Number(cell.profileCurvature) * curvatureScale;
        const slopeDeg = Number(cell.slopeDeg) || 0;

        // Znamienková konvencia existujúceho výpočtu:
        // záporná krivosť = konvexnosť, kladná krivosť = konkávnosť.
        const convexity = clamp01(Math.max(
            -scaledLaplacian / 4,
            -scaledProfileCurvature / 2
        ));
        const concavity = clamp01(Math.max(
            scaledLaplacian / 4,
            scaledProfileCurvature / 2
        ));

        // Rovinnosť tu neznamená vodorovnosť. Aj naklonený, ale geometricky
        // približne planárny svah patrí lokálne do rovinnej triedy.
        const planarity = clamp01(1 - Math.max(
            Math.abs(scaledLaplacian) / 1.2,
            Math.abs(scaledProfileCurvature) / 0.8
        ));

        // Zlom je zmena geometrie, nie samotný veľký sklon. Preto vychádza
        // prednostne z intenzity krivosti a nie z uhla svahu.
        const breakIntensity = clamp01(Math.max(
            Math.abs(scaledLaplacian) / 6,
            Math.abs(scaledProfileCurvature) / 3
        ));
        const wallness = clamp01((slopeDeg - 50) / 25);

        let localClass = "PRECHODOVÁ";
        let confidence = 0.45;
        let reasons = [];

        if (slopeDeg >= 65) {
            localClass = "STENOVÁ";
            confidence = Math.max(0.65, wallness);
            reasons = [
                "lokálny sklon dosiahol pracovný prah steny 65°",
                "stenová trieda má prednosť pred znamienkom lokálnej krivosti"
            ];
        } else if (
            breakIntensity >= 0.72 &&
            (Math.abs(scaledLaplacian) >= 2 || Math.abs(scaledProfileCurvature) >= 1)
        ) {
            localClass = "ZLOMOVÁ";
            confidence = Math.max(0.62, breakIntensity);
            reasons = [
                "intenzita lokálnej zmeny geometrie prekročila pracovný prah 0,72",
                "výrazná krivosť naznačuje prechod alebo zlom sklonu"
            ];
        } else if (convexity >= 0.20 && convexity > concavity * 1.15) {
            localClass = "KONVEXNÁ";
            confidence = Math.max(0.55, convexity);
            reasons = [
                "záporná krivosť prevláda nad konkávnou zložkou",
                "lokálny povrch je vypuklý bez potreby určiť jeho širšiu morfologickú rolu"
            ];
        } else if (concavity >= 0.20 && concavity > convexity * 1.15) {
            localClass = "KONKÁVNA";
            confidence = Math.max(0.55, concavity);
            reasons = [
                "kladná krivosť prevláda nad konvexnou zložkou",
                "lokálny povrch je vydutý dovnútra bez potreby určiť jeho širšiu morfologickú rolu"
            ];
        } else if (planarity >= 0.65) {
            localClass = "ROVINNÁ";
            confidence = Math.max(0.58, planarity);
            reasons = [
                "Laplacián aj profilová krivosť sú lokálne slabé",
                "povrch je približne planárny; môže pritom zostať vodorovný aj naklonený"
            ];
        } else {
            reasons = [
                "žiadna lokálna geometrická zložka zatiaľ jednoznačne neprevláda",
                "bunka ostáva prechodová, kým ju nespresní širšie okolie alebo hustejšie vzorkovanie"
            ];
        }

        return {
            localClass,
            confidence: clamp01(confidence),
            convexity,
            concavity,
            planarity,
            breakIntensity,
            wallness,
            scaledLaplacian,
            scaledProfileCurvature,
            reasons,
            method: "LOCAL_CURVATURE_V1",
            family: null
        };
    };

    if (!TerrainAnalysis.__localGeometryInstalled) {
        const originalCompleteGeometry = TerrainAnalysis.doplnGeometriuBuniek;

        TerrainAnalysis.doplnGeometriuBuniek = function (grid, config) {
            originalCompleteGeometry.call(this, grid, config);

            grid.cells.forEach((cell) => {
                cell.geometry = classifyLocalGeometry(cell, config.spacingM);
            });
        };

        TerrainAnalysis.__localGeometryInstalled = true;
        TerrainAnalysis.LOCAL_GEOMETRY_VERSION = "2.6.0-alpha.1";
    }

    const reasonsForType = function (cell, scaledLaplacian, scaledProfileCurvature) {
        switch (cell.terrainShape) {
            case "ROVINA":
                return [
                    "pracovný morfologický kandidát: sklon je menší než 2°",
                    "pracovný morfologický kandidát: lokálny výškový rozdiel je menší než 4 m"
                ];

            case "REBRO_ALEBO_HRANA":
                return [
                    "pracovný morfologický kandidát: normalizovaný Laplacián je výrazne záporný (≤ −1,2)",
                    "pracovný morfologický kandidát: normalizované profilové zakrivenie je záporné (≤ −0,5)",
                    "pracovný morfologický kandidát: sklon je aspoň 12°"
                ];

            case "VYVÝŠENINA":
                return [
                    "pracovný morfologický kandidát: normalizovaný Laplacián je výrazne záporný (≤ −1,2)",
                    "pracovný morfologický kandidát: normalizované profilové zakrivenie je záporné (≤ −0,5)",
                    "pracovný morfologický kandidát: sklon je menší než 12°"
                ];

            case "ŽĽAB_ALEBO_ZBERNICA":
                return [
                    "pracovný morfologický kandidát: normalizovaný Laplacián je výrazne kladný (≥ 1,2)",
                    "pracovný morfologický kandidát: normalizované profilové zakrivenie je kladné (≥ 0,5)",
                    "pracovný morfologický kandidát: sklon je aspoň 8°"
                ];

            case "DEPRESIA":
                return [
                    "pracovný morfologický kandidát: normalizovaný Laplacián je výrazne kladný (≥ 1,2)",
                    "pracovný morfologický kandidát: normalizované profilové zakrivenie je kladné (≥ 0,5)",
                    "pracovný morfologický kandidát: sklon je menší než 8°"
                ];

            case "SVAH":
                return [
                    "pracovný morfologický kandidát: sklon je aspoň 5°",
                    "pracovný morfologický kandidát: krivosti nesplnili prah výrazného konvexného ani konkávneho tvaru"
                ];

            default:
                return [
                    "pracovný morfologický kandidát: sklon je menší než 5°",
                    "pracovný morfologický kandidát: lokálny reliéf alebo krivosti nespĺňajú pravidlo roviny ani výrazného tvaru"
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
        const localClass = cell.geometry?.localClass;
        const localLabel = localGeometryLabels[localClass] || null;
        const height = Number(cell.heightM);
        const heightText = Number.isFinite(height)
            ? height.toLocaleString("sk-SK", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " m n. m."
            : "výška nie je dostupná";

        tooltip.replaceChildren();

        const title = document.createElement("strong");
        title.style.display = "block";
        title.style.color = "#70e8ff";
        title.textContent = label;

        tooltip.appendChild(title);

        if (localLabel) {
            const geometry = document.createElement("span");
            geometry.style.display = "block";
            geometry.style.color = "#b9cbd5";
            geometry.textContent = "lokálne: " + localLabel;
            tooltip.appendChild(geometry);
        }

        const altitude = document.createElement("span");
        altitude.style.display = "block";
        altitude.textContent = heightText;
        tooltip.appendChild(altitude);
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
        const localGeometry = cell.geometry || classifyLocalGeometry(cell, spacingM);
        const localLabel = localGeometryLabels[localGeometry.localClass] || String(localGeometry.localClass || "neurčená").toLowerCase();
        const candidateLabel = typeLabels[cell.terrainShape] || String(cell.terrainShape || "neurčený").replaceAll("_", " ");
        const localStrength = Math.max(localGeometry.convexity, localGeometry.concavity);

        return {
            type: candidateLabel + " · lokálne " + localLabel,
            confidence: localGeometry.confidence,
            rule: localGeometry.method + " / " + ruleForType(cell.terrainShape),
            reasons: [
                "Lokálna geometria: " + localLabel + ".",
                ...localGeometry.reasons,
                ...reasonsForType(cell, scaledLaplacian, scaledProfileCurvature)
            ],
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
                convexity: localLabel.toUpperCase() +
                    " · konvexnosť " + localGeometry.convexity.toFixed(2) +
                    " · konkávnosť " + localGeometry.concavity.toFixed(2) +
                    " · rovinnosť " + localGeometry.planarity.toFixed(2) +
                    " · zlom " + localGeometry.breakIntensity.toFixed(2) +
                    " · sila " + localStrength.toFixed(2),
                spacingM
            },
            localGeometry,
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
                relativeDepth: null
            },
            dataOrigin: cell.dataOrigin || null
        };
    };

    TerrainAnalysis.nainstalujHoverDiagnostiku = function (viewer) {
        if (!viewer?.scene?.canvas || typeof Cesium === "undefined") return;
        if (hoverHandler && hoverViewer === viewer) return;

        if (hoverHandler) hoverHandler.destroy();
        if (hoverCanvas && hoverCanvasLeaveListener) {
            hoverCanvas.removeEventListener("mouseleave", hoverCanvasLeaveListener);
        }
        hideHoverTooltip();

        hoverViewer = viewer;
        hoverCanvas = viewer.scene.canvas;
        hoverCanvasLeaveListener = hideHoverTooltip;
        hoverCanvas.addEventListener("mouseleave", hoverCanvasLeaveListener);

        hoverHandler = new Cesium.ScreenSpaceEventHandler(hoverCanvas);
        hoverHandler.setInputAction((event) => {
            const picked = viewer.scene.pick(event.endPosition);
            const pickedId = picked?.id;

            if (pickedId?.type === "terrain-analysis-cell" && pickedId.cell) {
                showHoverTooltip(viewer, event.endPosition, pickedId.cell);
                return;
            }

            hideHoverTooltip();
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
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
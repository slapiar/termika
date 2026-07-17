// js/terrain-morphology.js
// TermikaXC v2.6 – vrstva B1: viacmierkové susedstvo pre morfologickú rolu.
//
// Tento krok ešte nepriraďuje konečnú morfologickú rolu. Pripravuje
// vysvetliteľné metriky širšieho okolia, z ktorých budú v B2 odvodené skóre
// vrcholu, hrebeňa, rebra, žľabu, doliny, sedla, hrán a ďalších rolí.

(function () {
    if (!window.TerrainAnalysisCore) {
        throw new Error("Najprv musí byť načítaný terrain-analysis-core.js.");
    }

    const VERSION = "2.6.0-b1.1";
    const METHOD = "MULTISCALE_NEIGHBORHOOD_V1";
    const SCALE_STEPS = [1, 2, 3];
    const HEIGHT_EPSILON_M = 0.5;

    const DIRECTIONS = [
        { id: "N",  dr: 1,  dc: 0,  bearingDeg: 0 },
        { id: "NE", dr: 1,  dc: 1,  bearingDeg: 45 },
        { id: "E",  dr: 0,  dc: 1,  bearingDeg: 90 },
        { id: "SE", dr: -1, dc: 1,  bearingDeg: 135 },
        { id: "S",  dr: -1, dc: 0,  bearingDeg: 180 },
        { id: "SW", dr: -1, dc: -1, bearingDeg: 225 },
        { id: "W",  dr: 0,  dc: -1, bearingDeg: 270 },
        { id: "NW", dr: 1,  dc: -1, bearingDeg: 315 }
    ];

    const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
    const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const keyOf = (row, col) => String(row) + ":" + String(col);

    const mean = function (values) {
        if (!values.length) return null;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    };

    const median = function (values) {
        if (!values.length) return null;
        const sorted = [...values].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        return sorted.length % 2
            ? sorted[middle]
            : (sorted[middle - 1] + sorted[middle]) / 2;
    };

    const standardDeviation = function (values, average = mean(values)) {
        if (!values.length || !Number.isFinite(average)) return null;
        const variance = values.reduce((sum, value) => {
            const difference = value - average;
            return sum + difference * difference;
        }, 0) / values.length;
        return Math.sqrt(variance);
    };

    const circularSpread = function (anglesDeg) {
        if (!anglesDeg.length) return null;
        let sumSin = 0;
        let sumCos = 0;

        anglesDeg.forEach((angle) => {
            const radians = Cesium.Math.toRadians(angle);
            sumSin += Math.sin(radians);
            sumCos += Math.cos(radians);
        });

        const resultant = Math.hypot(sumSin, sumCos) / anglesDeg.length;
        return clamp01(1 - resultant);
    };

    const createIndex = function (cells) {
        const index = new Map();
        cells.forEach((cell) => index.set(keyOf(cell.row, cell.col), cell));
        return index;
    };

    const supportBounds = function (cells) {
        const rows = cells.map((cell) => Number(cell.row));
        const cols = cells.map((cell) => Number(cell.col));
        return {
            minRow: Math.min(...rows),
            maxRow: Math.max(...rows),
            minCol: Math.min(...cols),
            maxCol: Math.max(...cols)
        };
    };

    const squareOffsets = function (radiusSteps) {
        const offsets = [];
        for (let dr = -radiusSteps; dr <= radiusSteps; dr += 1) {
            for (let dc = -radiusSteps; dc <= radiusSteps; dc += 1) {
                offsets.push({ dr, dc });
            }
        }
        return offsets;
    };

    const scaleMetrics = function (cell, radiusSteps, spacingM, index) {
        const offsets = squareOffsets(radiusSteps);
        const samples = offsets
            .map(({ dr, dc }) => index.get(keyOf(cell.row + dr, cell.col + dc)))
            .filter(Boolean);
        const neighbors = samples.filter((sample) => sample !== cell);
        const heights = samples.map((sample) => finite(sample.heightM));
        const neighborHeights = neighbors.map((sample) => finite(sample.heightM));
        const slopes = samples.map((sample) => finite(sample.slopeDeg));
        const aspects = samples
            .map((sample) => Number(sample.aspectDeg))
            .filter(Number.isFinite);
        const convexities = samples.map((sample) => clamp01(sample.geometry?.convexity));
        const concavities = samples.map((sample) => clamp01(sample.geometry?.concavity));
        const breaks = samples.map((sample) => clamp01(sample.geometry?.breakIntensity));

        const minHeightM = Math.min(...heights);
        const maxHeightM = Math.max(...heights);
        const meanHeightM = mean(heights);
        const reliefM = maxHeightM - minHeightM;
        const centerHeightM = finite(cell.heightM);
        const higherCount = neighborHeights.filter((height) => height > centerHeightM + HEIGHT_EPSILON_M).length;
        const lowerCount = neighborHeights.filter((height) => height < centerHeightM - HEIGHT_EPSILON_M).length;
        const equalCount = Math.max(0, neighborHeights.length - higherCount - lowerCount);

        return {
            radiusSteps,
            halfWidthM: radiusSteps * spacingM,
            cornerDistanceM: Math.SQRT2 * radiusSteps * spacingM,
            expectedCount: offsets.length,
            actualCount: samples.length,
            completeness: clamp01(samples.length / offsets.length),
            minHeightM,
            maxHeightM,
            meanHeightM,
            medianHeightM: median(heights),
            heightStdDevM: standardDeviation(heights, meanHeightM),
            reliefM,
            relativePositionLocal: reliefM > 0.01
                ? clamp01((centerHeightM - minHeightM) / reliefM)
                : 0.5,
            higherNeighborRatio: neighbors.length ? higherCount / neighbors.length : 0,
            lowerNeighborRatio: neighbors.length ? lowerCount / neighbors.length : 0,
            equalNeighborRatio: neighbors.length ? equalCount / neighbors.length : 1,
            meanSlopeDeg: mean(slopes),
            slopeStdDevDeg: standardDeviation(slopes),
            aspectCircularSpread: circularSpread(aspects),
            meanConvexity: mean(convexities),
            meanConcavity: mean(concavities),
            meanBreakIntensity: mean(breaks)
        };
    };

    const directionMetrics = function (cell, direction, spacingM, index) {
        const samples = [];
        const stepDistanceM = Math.hypot(direction.dr, direction.dc) * spacingM;

        SCALE_STEPS.forEach((step) => {
            const sample = index.get(keyOf(
                cell.row + direction.dr * step,
                cell.col + direction.dc * step
            ));
            if (!sample) return;

            const distanceM = stepDistanceM * step;
            const heightDeltaM = finite(sample.heightM) - finite(cell.heightM);
            samples.push({
                step,
                distanceM,
                heightDeltaM,
                profileSlopeDeg: Cesium.Math.toDegrees(Math.atan2(heightDeltaM, distanceM)),
                slopeDeg: finite(sample.slopeDeg),
                localClass: sample.geometry?.localClass || null,
                convexity: clamp01(sample.geometry?.convexity),
                concavity: clamp01(sample.geometry?.concavity),
                breakIntensity: clamp01(sample.geometry?.breakIntensity)
            });
        });

        const endSample = samples[samples.length - 1] || null;
        const heightDeltas = samples.map((sample) => sample.heightDeltaM);

        return {
            id: direction.id,
            bearingDeg: direction.bearingDeg,
            availableSteps: samples.length,
            expectedSteps: SCALE_STEPS.length,
            completeness: samples.length / SCALE_STEPS.length,
            endDistanceM: endSample?.distanceM ?? null,
            endHeightDeltaM: endSample?.heightDeltaM ?? null,
            endProfileSlopeDeg: endSample?.profileSlopeDeg ?? null,
            meanHeightDeltaM: mean(heightDeltas),
            meanConvexity: mean(samples.map((sample) => sample.convexity)),
            meanConcavity: mean(samples.map((sample) => sample.concavity)),
            meanBreakIntensity: mean(samples.map((sample) => sample.breakIntensity)),
            riseStepRatio: samples.length
                ? samples.filter((sample) => sample.heightDeltaM > HEIGHT_EPSILON_M).length / samples.length
                : 0,
            fallStepRatio: samples.length
                ? samples.filter((sample) => sample.heightDeltaM < -HEIGHT_EPSILON_M).length / samples.length
                : 0,
            samples
        };
    };

    const neighborhoodForCell = function (cell, spacingM, index, bounds, supportSource) {
        const scales = SCALE_STEPS.map((radiusSteps) =>
            scaleMetrics(cell, radiusSteps, spacingM, index)
        );
        const directions = DIRECTIONS.map((direction) =>
            directionMetrics(cell, direction, spacingM, index)
        );

        const scaleWeights = [0.5, 0.3, 0.2];
        const scaleQuality = scales.reduce(
            (sum, scale, indexValue) => sum + scale.completeness * scaleWeights[indexValue],
            0
        );
        const directionQuality = mean(directions.map((direction) => direction.completeness)) || 0;
        const quality = clamp01(0.7 * scaleQuality + 0.3 * directionQuality);
        const outerScale = scales[scales.length - 1];

        return {
            method: METHOD,
            version: VERSION,
            supportSource,
            spacingM,
            scaleSteps: [...SCALE_STEPS],
            scaleMeters: SCALE_STEPS.map((steps) => steps * spacingM),
            quality,
            relativePositionLocal: outerScale.relativePositionLocal,
            localReliefM: outerScale.reliefM,
            higherNeighborRatio: outerScale.higherNeighborRatio,
            lowerNeighborRatio: outerScale.lowerNeighborRatio,
            meanSlopeDeg: outerScale.meanSlopeDeg,
            aspectCircularSpread: outerScale.aspectCircularSpread,
            distanceToSupportEdgeSteps: Math.min(
                cell.row - bounds.minRow,
                bounds.maxRow - cell.row,
                cell.col - bounds.minCol,
                bounds.maxCol - cell.col
            ),
            scales,
            directions
        };
    };

    const prepareNeighborhood = function (geometryResult) {
        if (!geometryResult?.cells?.length) {
            throw new Error("Vrstva B1 nedostala geometrické bunky.");
        }

        const supportCells = geometryResult.allCells?.length
            ? geometryResult.allCells
            : geometryResult.cells;
        const supportSource = geometryResult.allCells?.length
            ? "FULL_GRID_BEFORE_CIRCULAR_MASK"
            : "VISIBLE_CELLS_ONLY";
        const spacingM = finite(
            geometryResult.spacingM ?? geometryResult.config?.spacingM,
            40
        );
        const index = createIndex(supportCells);
        const bounds = supportBounds(supportCells);
        const qualities = [];

        geometryResult.cells.forEach((cell) => {
            cell.neighborhood = neighborhoodForCell(
                cell,
                spacingM,
                index,
                bounds,
                supportSource
            );
            cell.morphology = {
                role: null,
                candidateRole: null,
                confidence: null,
                quality: cell.neighborhood.quality,
                scaleM: null,
                axisDeg: null,
                continuity: null,
                relativePositionLocal: cell.neighborhood.relativePositionLocal,
                hRel: null,
                dRel: null,
                method: "NEIGHBORHOOD_ONLY_B1",
                reasons: [
                    "Viacmierkové susedstvo B1 je vypočítané.",
                    "Konečná morfologická rola sa začne skórovať až v kroku B2."
                ]
            };
            qualities.push(cell.neighborhood.quality);
        });

        const summary = {
            version: VERSION,
            stage: "B1_NEIGHBORHOOD_ONLY",
            method: METHOD,
            supportSource,
            visibleCellCount: geometryResult.cells.length,
            supportCellCount: supportCells.length,
            spacingM,
            scaleSteps: [...SCALE_STEPS],
            scaleMeters: SCALE_STEPS.map((steps) => steps * spacingM),
            meanQuality: mean(qualities),
            minQuality: Math.min(...qualities),
            maxQuality: Math.max(...qualities),
            roleAssignmentEnabled: false,
            hRelEnabled: false,
            dRelEnabled: false
        };

        geometryResult.morphologyStage = summary;
        return summary;
    };

    const installToggle = function () {
        if (document.querySelector('.module-toggle[value="morphology"]')) return;

        const geometryInput = document.querySelector('.module-toggle[value="geometry"]');
        const geometryLabel = geometryInput?.closest("label");
        if (!geometryLabel) return;

        const label = document.createElement("label");
        const input = document.createElement("input");
        input.className = "module-toggle";
        input.type = "checkbox";
        input.value = "morphology";
        input.checked = true;
        label.append(input, document.createTextNode(" Morfologické susedstvo B1"));
        geometryLabel.insertAdjacentElement("afterend", label);
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
        if (typeof original !== "function" || original.__terrainMorphologyB1Wrapped) return;

        const wrapped = function (cell) {
            original(cell);

            const body = document.getElementById("cellDiagnosticsBody");
            const neighborhood = cell?.neighborhood;
            if (!body || !neighborhood) return;

            const card = document.createElement("section");
            card.className = "terrain-design-color-card";

            const heading = document.createElement("h3");
            heading.textContent = "Vrstva B1 · širšie susedstvo";
            heading.style.margin = "0 0 7px";
            heading.style.color = "#70e8ff";
            heading.style.fontSize = "13px";

            const rows = document.createElement("div");
            rows.className = "terrain-design-color-row";
            addDiagnosticRow(rows, "Stav", "metriky hotové · rola sa ešte nepriraďuje");
            addDiagnosticRow(rows, "Kvalita susedstva", neighborhood.quality.toFixed(2));
            addDiagnosticRow(rows, "Podpora", neighborhood.supportSource);
            addDiagnosticRow(rows, "Mierky", neighborhood.scaleMeters.map((value) => value + " m").join(" · "));
            addDiagnosticRow(rows, "Lokálna relatívna poloha", neighborhood.relativePositionLocal.toFixed(2));
            addDiagnosticRow(rows, "Reliéf širšieho okolia", neighborhood.localReliefM.toFixed(1) + " m");
            addDiagnosticRow(rows, "Vyšší susedia", neighborhood.higherNeighborRatio.toFixed(2));
            addDiagnosticRow(rows, "Nižší susedia", neighborhood.lowerNeighborRatio.toFixed(2));
            addDiagnosticRow(rows, "Rozptyl orientácie", neighborhood.aspectCircularSpread == null
                ? "neurčený"
                : neighborhood.aspectCircularSpread.toFixed(2));
            addDiagnosticRow(rows, "Vzdialenosť od okraja podpory", neighborhood.distanceToSupportEdgeSteps + " buniek");
            addDiagnosticRow(rows, "Metóda", neighborhood.method);

            card.append(heading, rows);
            const intro = body.querySelector(".diagnostic-intro");
            intro?.insertAdjacentElement("afterend", card);
        };

        wrapped.__terrainMorphologyB1Wrapped = true;
        window.showCellDiagnostics = wrapped;
    };

    const initializeUi = function () {
        installToggle();
        installDiagnosticCard();
    };

    window.TerrainMorphology = {
        VERSION,
        METHOD,
        SCALE_STEPS: [...SCALE_STEPS],
        DIRECTIONS: DIRECTIONS.map((direction) => ({ ...direction })),
        prepareNeighborhood
    };

    TerrainAnalysisCore.registerModule({
        id: "morphology",
        title: "Morfologické susedstvo B1",
        description: "Viacmierkové susedstvo a smerové profily pre budúce určenie morfologickej roly.",
        requires: ["geometry"],

        run: async function (context) {
            const geometryResult = context.layers.geometry;
            const summary = prepareNeighborhood(geometryResult);

            context.provenance.morphology = {
                dataOrigin: "ODVODENÉ VÝPOČTOM",
                method: METHOD,
                version: VERSION,
                supportSource: summary.supportSource
            };
            context.diagnostics.morphology = summary;

            return summary;
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeUi, { once: true });
    } else {
        initializeUi();
    }
})();

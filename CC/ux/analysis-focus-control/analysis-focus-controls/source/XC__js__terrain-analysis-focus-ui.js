// js/terrain-analysis-focus-ui.js
// TermikaXC v2.6 – opakovaný prepočet toho istého diagnostického fokusu.

(function () {
    if (window.TerrainAnalysisFocusUI) return;

    const VERSION = "2.6.0-focus-ui.1";
    let installed = false;

    const finitePositive = function (value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) && number > 0 ? number : fallback;
    };

    const formatInteger = function (value) {
        return Math.round(Number(value) || 0).toLocaleString("sk-SK");
    };

    const estimateSampling = function (radiusM, spacingM) {
        const radius = finitePositive(radiusM, 400);
        const spacing = finitePositive(spacingM, 40);
        const halfSteps = Math.ceil(radius / spacing) + 1;
        const gridSize = halfSteps * 2 + 1;
        const gridPointCount = gridSize * gridSize;
        const radiusSteps = radius / spacing;
        const maxRowStep = Math.floor(radiusSteps);
        let visiblePointCount = 0;

        for (let rowStep = -maxRowStep; rowStep <= maxRowStep; rowStep += 1) {
            const remainingSquared = Math.max(0, radiusSteps * radiusSteps - rowStep * rowStep);
            const maxColStep = Math.floor(Math.sqrt(remainingSquared) + 1e-9);
            visiblePointCount += 2 * maxColStep + 1;
        }

        const densityPerKm2 = 1000000 / (spacing * spacing);
        let effort = "ľahký";
        if (gridPointCount > 40000) effort = "veľmi náročný";
        else if (gridPointCount > 12000) effort = "náročný";
        else if (gridPointCount > 3500) effort = "podrobný";
        else if (gridPointCount > 1200) effort = "stredný";

        return {
            radiusM: radius,
            spacingM: spacing,
            gridSize,
            gridPointCount,
            visiblePointCount,
            densityPerKm2,
            effort
        };
    };

    const installStyles = function () {
        if (document.getElementById("terrain-analysis-focus-ui-style")) return;

        const style = document.createElement("style");
        style.id = "terrain-analysis-focus-ui-style";
        style.textContent = `
            .analysis-focus-helper{
                margin:9px 0 2px;
                padding:9px 10px;
                border:1px solid #35505f;
                border-radius:6px;
                background:rgba(16,33,43,.62)
            }
            .analysis-focus-helper strong{
                display:block;
                margin-bottom:4px;
                color:#70e8ff;
                font-size:12px
            }
            .analysis-focus-summary{
                color:#d7e7ef;
                font-size:12px;
                line-height:1.45
            }
            .analysis-focus-state{
                margin-top:5px;
                color:#8fa9b8;
                font-size:11px
            }
            .analysis-focus-state.is-dirty{color:#ffd86b}
            .analysis-focus-state.is-running{color:#70e8ff}
            #analyzeButton.analysis-focus-dirty{
                border-color:#d9aa35;
                box-shadow:0 0 0 1px rgba(217,170,53,.24),0 0 12px rgba(217,170,53,.18)
            }
        `;
        document.head.appendChild(style);
    };

    const install = function () {
        if (installed) return true;

        const radiusInput = document.getElementById("radiusInput");
        const spacingInput = document.getElementById("spacingInput");
        const analyzeButton = document.getElementById("analyzeButton");
        if (!radiusInput || !spacingInput || !analyzeButton) return false;

        installed = true;
        installStyles();

        const fieldset = radiusInput.closest("fieldset");
        const spacingLabel = spacingInput.closest("label");
        const centerText = document.getElementById("centerText");
        const cellDiagnostics = document.getElementById("cellDiagnostics");

        const helper = document.createElement("div");
        helper.className = "analysis-focus-helper";

        const heading = document.createElement("strong");
        heading.textContent = "Opakovaný výpočet rovnakého fokusu";

        const summary = document.createElement("div");
        summary.className = "analysis-focus-summary";

        const state = document.createElement("div");
        state.className = "analysis-focus-state";
        state.textContent = "Stred zostáva zachovaný. Zmeň parametre a prepočítaj ten istý výrez.";

        helper.append(heading, summary, state);
        if (spacingLabel) spacingLabel.insertAdjacentElement("afterend", helper);
        else fieldset?.appendChild(helper);

        analyzeButton.textContent = "↻ Prepočítať aktuálny výrez";
        analyzeButton.title = "Spustiť alebo zopakovať všetky vybrané analýzy nad rovnakým stredom s aktuálnym polomerom a rozostupom";

        const updatePreview = function (markDirty) {
            const estimate = estimateSampling(radiusInput.value, spacingInput.value);
            const center = centerText?.textContent?.trim() || "aktuálne zvolený stred";

            summary.textContent =
                "Stred: " + center + ". Podkladová mriežka približne " +
                estimate.gridSize + " × " + estimate.gridSize + " (" +
                formatInteger(estimate.gridPointCount) + " vzoriek); v kruhu približne " +
                formatInteger(estimate.visiblePointCount) + " bodov. Hustota " +
                formatInteger(estimate.densityPerKm2) + " bodov/km²; výpočet: " +
                estimate.effort + ".";

            if (markDirty) {
                state.textContent = "Parametre sa zmenili. Stlač prepočet; fokus a kamera zostanú na tom istom mieste.";
                state.className = "analysis-focus-state is-dirty";
                analyzeButton.classList.add("analysis-focus-dirty");
            }
        };

        const markDirty = () => updatePreview(true);
        radiusInput.addEventListener("input", markDirty);
        radiusInput.addEventListener("change", markDirty);
        spacingInput.addEventListener("input", markDirty);
        spacingInput.addEventListener("change", markDirty);

        analyzeButton.addEventListener("click", () => {
            if (cellDiagnostics) cellDiagnostics.hidden = true;
            analyzeButton.classList.remove("analysis-focus-dirty");
            state.textContent = "Prepočítavam rovnaký stred s aktuálnym polomerom a hustotou bodov…";
            state.className = "analysis-focus-state is-running";
        }, { capture: true });

        const buttonObserver = new MutationObserver(() => {
            if (analyzeButton.disabled) {
                state.textContent = "Prepočítavam rovnaký stred s aktuálnym polomerom a hustotou bodov…";
                state.className = "analysis-focus-state is-running";
                return;
            }

            if (state.classList.contains("is-running")) {
                state.textContent = "Prepočet skončil. Výsledok a prípadné chyby sú uvedené v protokole nižšie.";
                state.className = "analysis-focus-state";
                updatePreview(false);
            }
        });
        buttonObserver.observe(analyzeButton, { attributes: true, attributeFilter: ["disabled"] });

        if (centerText) {
            const centerObserver = new MutationObserver(() => updatePreview(false));
            centerObserver.observe(centerText, { childList: true, characterData: true, subtree: true });
        }

        updatePreview(false);
        return true;
    };

    window.TerrainAnalysisFocusUI = {
        VERSION,
        estimateSampling,
        install
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", install, { once: true });
    } else {
        install();
    }
})();

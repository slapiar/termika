// TermikaXC v2.6 – zapojenie diagnostiky terénu do hlavnej aplikácie.
window.TerrainAnalysisUI = {
    busy: false,

    init: function () {
        const button = document.getElementById("analyzeTerrainButton");
        const clearButton = document.getElementById("clearTerrainAnalysisButton");

        button?.addEventListener("click", () => this.analyzujAktualnyBod());
        clearButton?.addEventListener("click", () => {
            window.TerrainAnalysis?.skryDiagnostiku?.(window.termikaViewer);
            window.logStatus?.("Diagnostická vrstva terénu bola skrytá.");
        });
    },

    analyzujAktualnyBod: async function () {
        if (this.busy) return;
        if (!window.termikaViewer || !window.TerrainAnalysis) {
            window.logStatus?.("Modul analýzy terénu nie je pripravený.", "error");
            return;
        }

        const button = document.getElementById("analyzeTerrainButton");
        this.busy = true;
        if (button) {
            button.disabled = true;
            button.textContent = "… Terén";
        }

        try {
            window.setMapState?.("ANALÝZA TERÉNU");
            const result = await TerrainAnalysis.analyzujOblast(window.termikaViewer, {
                rows: 21,
                cols: 21,
                spacingM: 40
            });
            TerrainAnalysis.zobrazDiagnostiku(window.termikaViewer, result);
            window.setMapState?.("TERÉN ANALYZOVANÝ", "success");
        } catch (error) {
            window.logStatus?.("Analýza terénu zlyhala: " + error.message, "error");
            window.setMapState?.("CHYBA TERÉNU", "error");
        } finally {
            this.busy = false;
            if (button) {
                button.disabled = false;
                button.textContent = "△ Analyzovať terén";
            }
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    window.TerrainAnalysisUI.init();
});

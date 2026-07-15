// js/wind-effect-surface.js
// TermikaXC v2.6 - povrchovy/teplotny vplyv pre WIND pole.

(function () {
    if (!window.WindEffectsCore) {
        throw new Error("Najprv musi byt nacitany wind-effects-core.js.");
    }

    const clamp = function (value, min, max) {
        return Math.max(min, Math.min(max, Number(value) || 0));
    };

    WindEffectsCore.registerEffect({
        id: "surface-thermal",
        title: "Surface thermal contrast",
        order: 30,

        run: function (field) {
            field.cells.forEach((cell) => {
                const deltaK = Number(cell.tempDeltaK) || 0;

                // Chladny jazyk tok tlmi, ohrievanie ho mierne rozbieha.
                const thermalScale = clamp(1 + deltaK * 0.04, 0.72, 1.24);
                cell.u_ms *= thermalScale;
                cell.v_ms *= thermalScale;
                cell.speed_ms = Math.hypot(cell.u_ms, cell.v_ms);
                cell.dir_deg = ((Math.atan2(cell.u_ms, cell.v_ms) * 180) / Math.PI + 360) % 360;

                // Jednoduchy indikator triggeru termickej bubliny.
                const convergence = Number(cell.convergence) || 0;
                const trigger = clamp((Math.max(0, -deltaK) * 0.35) + Math.max(0, convergence) * 20, 0, 1);
                cell.bubbleTrigger = trigger;
                cell.confidence = clamp((Number(cell.confidence) || 0.6) + 0.04, 0, 0.99);
            });
        }
    });
})();

/*
 * Testovacia stránka načíta rovnaký vizuálny modul ako Prieskumník.
 * Podmienka na #navShell zabráni zásahu do ostatných stránok TermikaXC.
 */
(function bootstrapWorkspacePolish() {
    const initialize = function () {
        if (!document.getElementById("navShell")) return;
        if (document.getElementById("explorerNavShell")) return;

        if (!document.querySelector('link[data-workspace-polish="true"]')) {
            const stylesheet = document.createElement("link");
            stylesheet.rel = "stylesheet";
            stylesheet.href = "asset/workspace-polish.css?v=20260715-01";
            stylesheet.dataset.workspacePolish = "true";
            document.head.appendChild(stylesheet);
        }

        if (!document.querySelector('script[data-workspace-crosshair="true"]')) {
            const script = document.createElement("script");
            script.src = "js/workspace-crosshair.js?v=20260715-01";
            script.defer = true;
            script.dataset.workspaceCrosshair = "true";
            document.body.appendChild(script);
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})();

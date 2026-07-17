// js/terrain-test-link.js
// TermikaXC v2.6 – rýchly vstup z hlavnej stránky na test analýzy terénu.

(function () {
    const installButton = function () {
        if (document.getElementById("openTerrainTestButton")) return;

        const toolbar = document.querySelector(".map-actions-primary");
        if (!toolbar) return;

        const button = document.createElement("button");
        button.id = "openTerrainTestButton";
        button.type = "button";
        button.title = "Otvoriť testovaciu stránku analýzy terénu v novej karte";
        button.textContent = "◫ Test terénu";

        button.addEventListener("click", () => {
            const testWindow = window.open(
                "terrain-analysis-test.php",
                "_blank",
                "noopener"
            );

            if (testWindow) testWindow.opener = null;
        });

        toolbar.appendChild(button);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", installButton, { once: true });
    } else {
        installButton();
    }
})();

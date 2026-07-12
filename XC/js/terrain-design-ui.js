// js/terrain-design-ui.js
// TermikaXC v2.6 – používateľské rozhranie pracovného terénneho dizajnu.

(function () {
    if (!window.TerrainDesign) {
        throw new Error("Najprv musí byť načítaný terrain-design.js.");
    }

    const morphologyPending = new Set(["G11", "G13"]);

    const createLegendItem = function (family, definition) {
        const item = document.createElement("div");
        item.className = "legend-item";

        const swatch = document.createElement("i");
        swatch.className = "legend-swatch";
        swatch.style.background = definition.hex;

        const text = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = family + " · " + definition.name;

        const detail = document.createElement("span");
        detail.textContent = definition.colorName + (
            morphologyPending.has(family)
                ? " · automatické priradenie čaká na morfologickú vrstvu"
                : ""
        );

        text.append(title, detail);
        item.append(swatch, text);
        return item;
    };

    const createGroupTitle = function (text) {
        const title = document.createElement("div");
        title.className = "terrain-design-legend-group";
        title.textContent = text;
        return title;
    };

    const createContourItem = function (major) {
        const item = document.createElement("div");
        item.className = "legend-item";

        const line = document.createElement("i");
        line.className = major ? "legend-line major" : "legend-line";

        const text = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = major ? "Hlavná vrstevnica" : "Vrstevnica";
        const detail = document.createElement("span");
        detail.textContent = major
            ? "Hrubšia tmavošedá čiara každých 50 m."
            : "Tmavošedá čiara každých 10 m.";

        text.append(title, detail);
        item.append(line, text);
        return item;
    };

    const installStyles = function () {
        if (document.getElementById("terrain-design-ui-style")) return;

        const style = document.createElement("style");
        style.id = "terrain-design-ui-style";
        style.textContent = `
            #legend{width:340px;height:min(760px,calc(100vh - 24px))}
            .terrain-design-legend-group{
                margin:11px 0 5px;
                color:#70e8ff;
                font-size:12px;
                font-weight:700;
                text-transform:uppercase;
                letter-spacing:.04em
            }
            #legend .legend-item{margin:6px 0}
            #legend .legend-item strong{font-size:12px}
            #legend .legend-item span{font-size:11px}
            .terrain-design-color-card{
                margin:0 0 12px;
                padding:9px 10px;
                border:1px solid #426277;
                border-radius:6px;
                background:rgba(16,33,43,.7)
            }
            .terrain-design-color-row{
                display:grid;
                grid-template-columns:minmax(145px,auto) 1fr;
                gap:4px 12px
            }
            .terrain-design-color-row b{color:#8fa9b8;font-weight:400}
            .terrain-design-color-row span{color:#fff;font-variant-numeric:tabular-nums}
            @media (max-width:760px){
                #legend{width:auto;height:56vh}
            }
        `;
        document.head.appendChild(style);
    };

    const renderLegend = function () {
        const legend = document.getElementById("legend");
        if (!legend) return;

        const title = legend.querySelector(".window-title");
        const body = legend.querySelector(".window-body");
        if (!body) return;

        if (title) title.textContent = "Legenda terénneho dizajnu · G01–G16";
        legend.setAttribute("aria-label", "Legenda terénneho dizajnu G01 až G16");

        const groups = [
            ["Roviny a svahy", ["G01", "G02", "G03", "G04"]],
            ["Konvexné tvary", ["G05", "G06", "G07", "G08"]],
            ["Konkávne tvary", ["G09", "G10", "G11", "G12"]],
            ["Prechody a zlomy", ["G13", "G14", "G15", "G16"]]
        ];

        const content = [];
        groups.forEach(([groupName, families]) => {
            content.push(createGroupTitle(groupName));
            families.forEach((family) => {
                content.push(createLegendItem(family, TerrainDesign.palette[family]));
            });
        });

        content.push(createGroupTitle("Vrstevnice"));
        content.push(createContourItem(false), createContourItem(true));

        const note = document.createElement("p");
        note.className = "legend-note";
        note.textContent = "Farebné body používajú paletu G01–G16 a zosilnený kontrast V2. Slabý geometrický prejav je svetlejší, silný prejav alebo zlom tmavší a sýtejší. Výškové tieňovanie podľa relatívnej polohy v kopci, hrebeni, žľabe alebo doline sa zapne až po morfologickej vrstve.";
        content.push(note);

        body.replaceChildren(...content);
    };

    const installDiagnosticColorCard = function () {
        const original = window.showCellDiagnostics;
        if (typeof original !== "function" || original.__terrainDesignWrapped) return;

        const wrapped = function (cell) {
            original(cell);

            const body = document.getElementById("cellDiagnosticsBody");
            const color = cell?.color;
            if (!body || !color) return;

            const card = document.createElement("section");
            card.className = "terrain-design-color-card";

            const heading = document.createElement("h3");
            heading.textContent = "Skutočne vykreslená farba";
            heading.style.margin = "0 0 7px";
            heading.style.color = "#70e8ff";
            heading.style.fontSize = "13px";

            const rows = document.createElement("div");
            rows.className = "terrain-design-color-row";

            const addRow = function (label, value) {
                const key = document.createElement("b");
                const data = document.createElement("span");
                key.textContent = label;
                data.textContent = value;
                rows.append(key, data);
            };

            addRow("Farebná rodina", color.family + " · " + color.familyName);
            addRow("Základná farba", color.baseHex);
            addRow("Vykreslený odtieň", color.finalHex);
            addRow("Svetlosť", Number(color.lightnessPercent).toFixed(1) + " %");
            addRow("Sýtosť", Number(color.saturationPercent).toFixed(1) + " %");
            addRow("Výsledný kontrast", Number(color.contrastRel).toFixed(2));
            addRow("Sila geometrie kRel", Number(color.kRel).toFixed(2));
            addRow("Relatívny sklon sRel", Number(color.sRel).toFixed(2));
            addRow("Intenzita zlomu bRel", Number(color.bRel).toFixed(2));
            addRow("Metóda odtieňa", color.shadeMethod);

            card.append(heading, rows);
            const intro = body.querySelector(".diagnostic-intro");
            intro?.insertAdjacentElement("afterend", card);

            const pending = body.querySelector(".diagnostic-pending");
            if (pending) {
                pending.textContent = "Morfologická rola širšieho terénneho celku a skutočná relatívna výška alebo hĺbka ostávajú zatiaľ null. Preto ešte nepoužívame výškové tieňovanie hRel/dRel.";
            }
        };

        wrapped.__terrainDesignWrapped = true;
        window.showCellDiagnostics = wrapped;
    };

    const installStatus = function () {
        if (TerrainAnalysis.__terrainDesignUiStatusInstalled) return;
        const original = TerrainAnalysis.zobrazDiagnostiku;

        TerrainAnalysis.zobrazDiagnostiku = function (viewer, result) {
            const collection = original.call(this, viewer, result);
            if (typeof window.logStatus === "function") {
                window.logStatus(
                    "Terénny dizajn: aktívna paleta G01–G16; zosilnený kontrast V2 podľa geometrie, sklonu a zlomu.",
                    "success"
                );
                window.logStatus(
                    "Výškové tieňovanie hRel/dRel ešte čaká na morfologickú vrstvu širšieho terénneho celku."
                );
            }
            return collection;
        };

        TerrainAnalysis.__terrainDesignUiStatusInstalled = true;
    };

    const initialize = function () {
        installStyles();
        renderLegend();
        installDiagnosticColorCard();
        installStatus();

        const hint = document.getElementById("aimHint");
        if (hint) {
            hint.textContent = "Nabehnutie = typ a výška · klik na farebný bod = diagnostika · klik na terén = nový stred";
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})();
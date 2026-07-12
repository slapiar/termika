// js/terrain-design.js
// TermikaXC v2.6 – pracovný farebný renderer geometrie reliéfu.
//
// Tento modul pripája lokálnu geometriu a doterajší morfologický kandidát
// k šestnástim základným farebným rodinám z TerenDizajnManual.md.
// Relatívna výška a hĺbka v rámci nadradeného terénneho celku sa ešte
// nepredstierajú. Aktuálny odtieň mení iba sila geometrie, sklon a intenzita
// zlomu, teda veličiny, ktoré už boli skutočne vypočítané.

(function () {
    if (!window.TerrainAnalysis) {
        throw new Error("Najprv musí byť načítaný terrain-analysis.js.");
    }

    const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
    const clamp01 = (value) => clamp(value, 0, 1);

    const palette = {
        G01: { name: "Rovina / plošina", colorName: "zelená", hex: "#2EBD59" },
        G02: { name: "Mierne zvlnená plocha / terasa", colorName: "svetlá zelená", hex: "#6EDC6A" },
        G03: { name: "Mierny svah", colorName: "žltá", hex: "#FFD54A" },
        G04: { name: "Výrazný svah", colorName: "jantárová", hex: "#FFB300" },
        G05: { name: "Konvexné telo svahu", colorName: "oranžová", hex: "#FF8C42" },
        G06: { name: "Vrcholová výduť / kupola", colorName: "oranžovočervená", hex: "#FF5A36" },
        G07: { name: "Hrebeň / rebro", colorName: "tmavočervená", hex: "#8B0000" },
        G08: { name: "Ostrá hrana / horný zlom", colorName: "karmínová", hex: "#C21807" },
        G09: { name: "Plytká konkávnosť", colorName: "tyrkysová", hex: "#2EC7C9" },
        G10: { name: "Žľab / zbernica", colorName: "azúrová", hex: "#00B7FF" },
        G11: { name: "Dolinová os / hlbšia línia", colorName: "modrá", hex: "#1E88E5" },
        G12: { name: "Depresia / kotlina", colorName: "indigová", hex: "#3949AB" },
        G13: { name: "Sedlo / prechod", colorName: "fialová", hex: "#8E44AD" },
        G14: { name: "Zmiešaný alebo neurčitý prechod", colorName: "svetlejšia fialová", hex: "#B155E0" },
        G15: { name: "Kolmá stena / extrémny zlom", colorName: "purpurová", hex: "#D81B60" },
        G16: { name: "Dolná hrana zlomu / pätový zlom", colorName: "malinová", hex: "#EC407A" }
    };

    const hexToHsl = function (hex) {
        const normalized = hex.replace("#", "");
        const r = parseInt(normalized.slice(0, 2), 16) / 255;
        const g = parseInt(normalized.slice(2, 4), 16) / 255;
        const b = parseInt(normalized.slice(4, 6), 16) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (delta > 0) {
            s = delta / (1 - Math.abs(2 * l - 1));
            if (max === r) h = 60 * (((g - b) / delta) % 6);
            else if (max === g) h = 60 * (((b - r) / delta) + 2);
            else h = 60 * (((r - g) / delta) + 4);
        }

        if (h < 0) h += 360;
        return { h, s: s * 100, l: l * 100 };
    };

    const hslToHex = function (h, s, l) {
        const hue = ((Number(h) % 360) + 360) % 360;
        const saturation = clamp(s, 0, 100) / 100;
        const lightness = clamp(l, 0, 100) / 100;
        const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
        const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
        const m = lightness - chroma / 2;
        let r = 0;
        let g = 0;
        let b = 0;

        if (hue < 60) [r, g, b] = [chroma, x, 0];
        else if (hue < 120) [r, g, b] = [x, chroma, 0];
        else if (hue < 180) [r, g, b] = [0, chroma, x];
        else if (hue < 240) [r, g, b] = [0, x, chroma];
        else if (hue < 300) [r, g, b] = [x, 0, chroma];
        else [r, g, b] = [chroma, 0, x];

        const toHex = (channel) => Math.round((channel + m) * 255)
            .toString(16)
            .padStart(2, "0")
            .toUpperCase();

        return "#" + toHex(r) + toHex(g) + toHex(b);
    };

    const familyForCell = function (cell) {
        const geometry = cell.geometry || {};
        const localClass = geometry.localClass;
        const convexity = Number(geometry.convexity) || 0;
        const concavity = Number(geometry.concavity) || 0;
        const slopeDeg = Number(cell.slopeDeg) || 0;

        if (localClass === "STENOVÁ") return "G15";

        if (localClass === "ZLOMOVÁ") {
            if (convexity > concavity * 1.05) return "G08";
            if (concavity > convexity * 1.05) return "G16";
            return "G14";
        }

        switch (cell.terrainShape) {
            case "ROVINA":
                return localClass === "ROVINNÁ" ? "G01" : "G02";

            case "SVAH":
                if (localClass === "KONVEXNÁ") return "G05";
                if (localClass === "KONKÁVNA") return "G09";
                return slopeDeg < 12 ? "G03" : "G04";

            case "REBRO_ALEBO_HRANA":
                return localClass === "ZLOMOVÁ" ? "G08" : "G07";

            case "VYVÝŠENINA":
                return "G06";

            case "ŽĽAB_ALEBO_ZBERNICA":
                return "G10";

            case "DEPRESIA":
                return "G12";

            case "PRECHODOVÝ_TERÉN":
                if (localClass === "ROVINNÁ") return "G02";
                if (localClass === "KONVEXNÁ") return "G05";
                if (localClass === "KONKÁVNA") return "G09";
                return "G14";

            default:
                if (localClass === "KONVEXNÁ") return "G05";
                if (localClass === "KONKÁVNA") return "G09";
                if (localClass === "ROVINNÁ") return "G02";
                return "G14";
        }
    };

    const shadeForCell = function (cell, family) {
        const base = palette[family] || palette.G14;
        const hsl = hexToHsl(base.hex);
        const geometry = cell.geometry || {};
        const convexity = clamp01(geometry.convexity);
        const concavity = clamp01(geometry.concavity);
        const kRel = Math.max(convexity, concavity);
        const bRel = clamp01(geometry.breakIntensity);
        const sRel = clamp01((Number(cell.slopeDeg) || 0) / 60);
        const contrastRel = clamp01(Math.max(kRel, bRel, 0.75 * sRel));
        let saturation = hsl.s;
        let lightness = hsl.l;

        // V2 používa podstatne širší svetlostný rozsah. Slabé prejavy sa
        // zosvetlia, silné geometrické prejavy a zlomy sa zreteľne stmavia.
        if (["G01", "G02", "G03", "G04"].includes(family)) {
            saturation += 16 * sRel;
            lightness += 12 - 24 * sRel;
        } else if (["G05", "G06", "G07"].includes(family)) {
            saturation += 22 * kRel + 14 * bRel;
            lightness += 16 - 30 * kRel - 14 * bRel;
        } else if (["G09", "G10", "G11", "G12"].includes(family)) {
            saturation += 22 * kRel + 14 * bRel;
            lightness += 16 - 30 * kRel - 14 * bRel;
        } else if (["G08", "G15", "G16"].includes(family)) {
            saturation += 28 * bRel + 8 * kRel;
            lightness += 10 - 28 * bRel - 8 * kRel;
        } else {
            saturation += 14 * kRel + 16 * bRel;
            lightness += 12 - 20 * Math.max(kRel, bRel);
        }

        saturation = clamp(saturation, 45, 100);
        lightness = clamp(lightness, 18, 82);

        const finalHex = hslToHex(hsl.h, saturation, lightness);
        return {
            family,
            familyName: base.name,
            baseHex: base.hex,
            finalHex,
            kRel,
            sRel,
            bRel,
            contrastRel,
            saturationPercent: saturation,
            lightnessPercent: lightness,
            relativeHeight: null,
            relativeDepth: null,
            shadeMethod: "GEOMETRY_CONTRAST_V2"
        };
    };

    const prepareResult = function (result) {
        if (!result?.cells?.length) return result;

        result.cells.forEach((cell) => {
            const family = familyForCell(cell);
            cell.geometry = cell.geometry || {};
            cell.geometry.family = family;
            cell.color = shadeForCell(cell, family);
        });

        result.design = {
            version: "2.6.0-alpha.2",
            palette: "G01-G16",
            familyMethod: "LOCAL_GEOMETRY_PLUS_LEGACY_CANDIDATE_V1",
            shadeMethod: "GEOMETRY_CONTRAST_V2",
            relativeHeightMethod: null,
            relativeDepthMethod: null
        };

        return result;
    };

    const colorForCell = function (cell) {
        const finalHex = cell?.color?.finalHex || palette.G14.hex;
        return Cesium.Color.fromCssColorString(finalHex).withAlpha(0.98);
    };

    window.TerrainDesign = {
        VERSION: "2.6.0-alpha.2",
        palette,
        familyForCell,
        shadeForCell,
        prepareResult,
        colorForCell
    };

    // Renderer nahrádza pôvodnú sedemfarebnú diagnostickú paletu skutočnou
    // pracovnou paletou G01–G16. Hover a klikateľná diagnostika zostávajú.
    TerrainAnalysis.zobrazDiagnostiku = function (viewer, result = this.lastResult) {
        this.overProstredie(viewer);
        if (!result?.cells?.length) {
            throw new Error("Nie je dostupný výsledok analýzy terénu.");
        }

        prepareResult(result);
        this.skryDiagnostiku(viewer);

        const collection = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
        const offsetM = result.config.diagnosticHeightOffsetM;

        result.cells.forEach((cell) => {
            const breakIntensity = clamp01(cell.geometry?.breakIntensity);
            const geometryStrength = Math.max(
                clamp01(cell.geometry?.convexity),
                clamp01(cell.geometry?.concavity)
            );

            collection.add({
                position: Cesium.Cartesian3.fromDegrees(
                    cell.lon,
                    cell.lat,
                    cell.heightM + offsetM
                ),
                pixelSize: 6 + 2.5 * breakIntensity + 0.8 * geometryStrength,
                color: colorForCell(cell),
                outlineColor: Cesium.Color.BLACK.withAlpha(0.65),
                outlineWidth: 1,
                id: {
                    type: "terrain-analysis-cell",
                    cell
                }
            });
        });

        this.diagnosticCollection = collection;
        if (typeof this.nainstalujHoverDiagnostiku === "function") {
            this.nainstalujHoverDiagnostiku(viewer);
        }
        return collection;
    };
})();
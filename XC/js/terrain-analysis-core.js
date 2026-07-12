// js/terrain-analysis-core.js
// TermikaXC v2.6 – modulárne jadro analýzy terénu.
//
// Jadro nevykonáva fyzikálne výpočty jednotlivých vrstiev. Spravuje register
// analytických modulov, spoločný kontext analýzy, poradie spúšťania a výslednú
// mapu. Prvotná oblasť je kruhový pohľad okolo zvoleného stredu.

window.TerrainAnalysisCore = {
    VERSION: "2.6.0-alpha.2",

    modules: new Map(),
    lastResult: null,

    defaultOptions: {
        center: null,
        radiusM: 400,
        spacingM: 40,
        enabledModules: ["geometry"],
        diagnosticHeightOffsetM: 6
    },

    registerModule: function (definition) {
        if (!definition || typeof definition !== "object") {
            throw new Error("Analytický modul musí byť objekt.");
        }

        const id = String(definition.id || "").trim();
        if (!id) {
            throw new Error("Analytický modul nemá identifikátor.");
        }
        if (typeof definition.run !== "function") {
            throw new Error("Analytický modul " + id + " nemá funkciu run().");
        }

        this.modules.set(id, {
            id,
            title: definition.title || id,
            description: definition.description || "",
            requires: Array.isArray(definition.requires) ? [...definition.requires] : [],
            run: definition.run
        });

        return this.modules.get(id);
    },

    listModules: function () {
        return Array.from(this.modules.values()).map((module) => ({
            id: module.id,
            title: module.title,
            description: module.description,
            requires: [...module.requires]
        }));
    },

    analyze: async function (viewer, options = {}) {
        const config = this.normalizeOptions(options);
        const executionOrder = this.resolveExecutionOrder(config.enabledModules);

        const context = {
            viewer,
            config,
            center: config.center,
            createdAt: new Date().toISOString(),
            layers: {},
            provenance: {},
            diagnostics: {},
            executionOrder
        };

        for (const moduleId of executionOrder) {
            const module = this.modules.get(moduleId);
            if (!module) {
                throw new Error("Analytický modul nie je registrovaný: " + moduleId);
            }

            const output = await module.run(context);
            if (output !== undefined) {
                context.layers[moduleId] = output;
            }
        }

        const result = {
            version: this.VERSION,
            createdAt: context.createdAt,
            center: context.center,
            config,
            executionOrder,
            layers: context.layers,
            provenance: context.provenance,
            diagnostics: context.diagnostics
        };

        this.lastResult = result;
        return result;
    },

    normalizeOptions: function (options) {
        const config = { ...this.defaultOptions, ...options };

        if (!config.center) {
            throw new Error("Nie je určený stred analýzy.");
        }

        const lat = Number(config.center.lat ?? config.center.latitude);
        const lon = Number(config.center.lon ?? config.center.lng ?? config.center.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            throw new Error("Stred analýzy musí obsahovať platné lat a lon.");
        }

        config.center = { lat, lon };
        config.radiusM = this.finiteNumber(config.radiusM, 40, 20000, "radiusM");
        config.spacingM = this.finiteNumber(config.spacingM, 5, 1000, "spacingM");
        config.diagnosticHeightOffsetM = this.finiteNumber(
            config.diagnosticHeightOffsetM,
            0,
            500,
            "diagnosticHeightOffsetM"
        );

        config.enabledModules = Array.isArray(config.enabledModules)
            ? [...new Set(config.enabledModules.map((id) => String(id).trim()).filter(Boolean))]
            : [];

        if (!config.enabledModules.length) {
            throw new Error("Nie je vybraný žiadny analytický modul.");
        }

        return config;
    },

    finiteNumber: function (value, min, max, name) {
        const number = Number(value);
        if (!Number.isFinite(number) || number < min || number > max) {
            throw new Error(
                "Neplatné nastavenie " + name + ". Očakávaný rozsah je " +
                min + " až " + max + "."
            );
        }
        return number;
    },

    resolveExecutionOrder: function (requestedIds) {
        const resolved = [];
        const visiting = new Set();
        const visited = new Set();

        const visit = (id) => {
            if (visited.has(id)) return;
            if (visiting.has(id)) {
                throw new Error("Cyklická závislosť analytických modulov pri: " + id);
            }

            const module = this.modules.get(id);
            if (!module) {
                throw new Error("Analytický modul nie je registrovaný: " + id);
            }

            visiting.add(id);
            module.requires.forEach(visit);
            visiting.delete(id);
            visited.add(id);
            resolved.push(id);
        };

        requestedIds.forEach(visit);
        return resolved;
    },

    gridSizeForCircle: function (radiusM, spacingM) {
        const halfSteps = Math.ceil(radiusM / spacingM) + 1;
        return halfSteps * 2 + 1;
    },

    applyCircularMask: function (terrainResult, radiusM) {
        const allCells = Array.isArray(terrainResult?.cells) ? terrainResult.cells : [];
        const cells = allCells.filter((cell) => {
            const distanceM = Math.hypot(Number(cell.eastM) || 0, Number(cell.northM) || 0);
            return distanceM <= radiusM;
        });

        return {
            ...terrainResult,
            areaShape: "CIRCLE",
            radiusM,
            allCells,
            cells,
            summary: window.TerrainAnalysis?.vytvorSuhrn
                ? window.TerrainAnalysis.vytvorSuhrn(cells)
                : terrainResult.summary
        };
    }
};
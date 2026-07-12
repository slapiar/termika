// js/terrain-analysis.js
// TermikaXC v2.6 – lokálna geometrická analýza skutočného Cesium terénu.
//
// Tento modul zatiaľ NEPOČÍTA hotspot. Jeho úlohou je vytvoriť fyzikálnu
// kostru krajiny: lokálnu výškovú mriežku a z nej odvodený sklon, orientáciu,
// gradient, zakrivenie a základný morfologický typ každej bunky.

window.TerrainAnalysis = {
    VERSION: "2.6.0-alpha.1",

    defaultOptions: {
        rows: 21,
        cols: 21,
        spacingM: 40,
        fallbackTerrainLevel: 14,
        diagnosticHeightOffsetM: 6
    },

    lastResult: null,
    diagnosticCollection: null,

    /**
     * Hlavný vstup modulu.
     *
     * @param {Cesium.Viewer} viewer
     * @param {Object} options
     * @returns {Promise<Object>} analyzovaná mriežka s metadátami
     */
    analyzujOblast: async function (viewer, options = {}) {
        this.overProstredie(viewer);

        const config = this.normalizujNastavenia(options);
        const center = this.urciStred(config);
        const grid = this.vytvorLokalnuMriezku(center, config);
        const terrain = await this.odoberVyskyTerenu(viewer, grid.points, config);

        this.doplnGeometriuBuniek(grid, config);

        const result = {
            version: this.VERSION,
            createdAt: new Date().toISOString(),
            source: {
                terrain: terrain.source,
                fallbackLevelUsed: terrain.fallbackLevelUsed,
                sampledPoints: terrain.sampledPoints,
                totalPoints: grid.points.length,
                dataOrigin: terrain.dataOrigin
            },
            center,
            config,
            bounds: grid.bounds,
            rows: grid.rows,
            cols: grid.cols,
            spacingM: config.spacingM,
            points: grid.points,
            cells: grid.cells,
            summary: this.vytvorSuhrn(grid.cells)
        };

        this.lastResult = result;

        if (typeof logStatus === "function") {
            logStatus(
                "Analýza terénu: " + result.cells.length + " buniek, rozostup " +
                config.spacingM + " m, priemerný sklon " +
                result.summary.meanSlopeDeg.toFixed(1) + "°.",
                "success"
            );
        }

        return result;
    },

    overProstredie: function (viewer) {
        if (typeof Cesium === "undefined") {
            throw new Error("TerrainAnalysis vyžaduje načítané Cesium.");
        }
        if (!viewer?.scene?.globe) {
            throw new Error("TerrainAnalysis nedostal pripravený Cesium Viewer.");
        }
    },

    normalizujNastavenia: function (options) {
        const config = { ...this.defaultOptions, ...options };

        config.rows = this.neparneCeleCislo(config.rows, 5, 101, "rows");
        config.cols = this.neparneCeleCislo(config.cols, 5, 101, "cols");
        config.spacingM = this.konecneCislo(config.spacingM, 5, 1000, "spacingM");
        config.fallbackTerrainLevel = Math.round(
            this.konecneCislo(config.fallbackTerrainLevel, 0, 20, "fallbackTerrainLevel")
        );
        config.diagnosticHeightOffsetM = this.konecneCislo(
            config.diagnosticHeightOffsetM,
            0,
            500,
            "diagnosticHeightOffsetM"
        );

        if (config.center) {
            config.center = this.normalizujPolohu(config.center);
        }

        return config;
    },

    neparneCeleCislo: function (value, min, max, name) {
        let number = Math.round(this.konecneCislo(value, min, max, name));
        if (number % 2 === 0) number += 1;
        if (number > max) number -= 2;
        return number;
    },

    konecneCislo: function (value, min, max, name) {
        const number = Number(value);
        if (!Number.isFinite(number) || number < min || number > max) {
            throw new Error(
                "Neplatné nastavenie " + name + ". Očakávaný rozsah je " +
                min + " až " + max + "."
            );
        }
        return number;
    },

    normalizujPolohu: function (position) {
        const lat = Number(position.lat ?? position.latitude);
        const lon = Number(position.lon ?? position.lng ?? position.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            throw new Error("Stred analýzy musí obsahovať platné lat a lon.");
        }
        if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
            throw new Error("Stred analýzy leží mimo platného rozsahu súradníc.");
        }

        return { lat, lon };
    },

    urciStred: function (config) {
        if (config.center) return { ...config.center, origin: "ZADANÉ" };

        const body = window.PilotNetwork?.letoveBody;
        const currentIndex = window.PilotNetwork?.currentIndex;
        const current = Array.isArray(body) && body.length
            ? body[Math.max(0, Math.min(body.length - 1, Number(currentIndex) || 0))]
            : null;

        if (current && Number.isFinite(current.lat) && Number.isFinite(current.lon)) {
            return {
                lat: current.lat,
                lon: current.lon,
                origin: "AKTUÁLNY BOD IGC"
            };
        }

        throw new Error(
            "Nie je určený stred analýzy. Zadaj options.center alebo najprv načítaj IGC let."
        );
    },

    vytvorLokalnuMriezku: function (center, config) {
        const halfRows = Math.floor(config.rows / 2);
        const halfCols = Math.floor(config.cols / 2);
        const points = [];
        const cells = [];

        const metersPerDegreeLat = 111132.92 -
            559.82 * Math.cos(2 * Cesium.Math.toRadians(center.lat)) +
            1.175 * Math.cos(4 * Cesium.Math.toRadians(center.lat));
        const metersPerDegreeLon = Math.max(
            1,
            111412.84 * Math.cos(Cesium.Math.toRadians(center.lat)) -
            93.5 * Math.cos(3 * Cesium.Math.toRadians(center.lat))
        );

        for (let row = 0; row < config.rows; row += 1) {
            const northM = (row - halfRows) * config.spacingM;
            const lat = center.lat + northM / metersPerDegreeLat;

            for (let col = 0; col < config.cols; col += 1) {
                const eastM = (col - halfCols) * config.spacingM;
                const lon = center.lon + eastM / metersPerDegreeLon;
                const index = row * config.cols + col;

                points.push({
                    index,
                    row,
                    col,
                    lat,
                    lon,
                    eastM,
                    northM,
                    heightM: null,
                    dataOrigin: "ČAKÁ NA TERÉN"
                });
            }
        }

        const bounds = {
            south: points[0].lat,
            west: points[0].lon,
            north: points[points.length - 1].lat,
            east: points[points.length - 1].lon,
            widthM: (config.cols - 1) * config.spacingM,
            heightM: (config.rows - 1) * config.spacingM
        };

        return {
            rows: config.rows,
            cols: config.cols,
            points,
            cells,
            bounds
        };
    },

    odoberVyskyTerenu: async function (viewer, points, config) {
        const provider = await this.cakajNaTerrainProvider(viewer);
        if (!provider) {
            throw new Error("Cesium terrain provider nie je dostupný.");
        }

        const cartographics = points.map((point) =>
            Cesium.Cartographic.fromDegrees(point.lon, point.lat)
        );

        let sampled = null;
        let fallbackLevelUsed = false;
        let source = "Cesium.sampleTerrainMostDetailed";

        try {
            sampled = await Cesium.sampleTerrainMostDetailed(provider, cartographics);
        } catch (error) {
            sampled = await Cesium.sampleTerrain(
                provider,
                config.fallbackTerrainLevel,
                cartographics
            );
            fallbackLevelUsed = true;
            source = "Cesium.sampleTerrain LOD " + config.fallbackTerrainLevel;

            if (typeof logStatus === "function") {
                logStatus(
                    "Najdetailnejšie vzorkovanie terénu zlyhalo. Používam záložnú úroveň LOD " +
                    config.fallbackTerrainLevel + "."
                );
            }
        }

        let sampledPoints = 0;
        sampled.forEach((cartographic, index) => {
            const height = Number(cartographic?.height);
            if (!Number.isFinite(height)) return;

            points[index].heightM = height;
            points[index].dataOrigin = "MERANÉ Z CESIUM TERÉNU";
            sampledPoints += 1;
        });

        if (sampledPoints !== points.length) {
            throw new Error(
                "Terén sa podarilo odčítať iba pre " + sampledPoints +
                " z " + points.length + " bodov mriežky."
            );
        }

        return {
            source,
            fallbackLevelUsed,
            sampledPoints,
            dataOrigin: fallbackLevelUsed
                ? "MODELOVÝ TERÉN CESIUM – PEVNÁ LOD"
                : "MODELOVÝ TERÉN CESIUM – NAJDETAILNEJŠIA DOSTUPNÁ ÚROVEŇ"
        };
    },

    cakajNaTerrainProvider: async function (viewer) {
        const timeoutAt = Date.now() + 10000;

        while (Date.now() < timeoutAt) {
            const provider = viewer?.scene?.globe?.terrainProvider || viewer?.terrainProvider || null;
            const name = provider?.constructor?.name || "";

            if (provider && name !== "EllipsoidTerrainProvider") {
                return provider;
            }

            await new Promise((resolve) => window.setTimeout(resolve, 150));
        }

        return null;
    },

    doplnGeometriuBuniek: function (grid, config) {
        const pointAt = (row, col) => grid.points[row * config.cols + col];
        const h = (row, col) => pointAt(row, col).heightM;
        const spacing = config.spacingM;

        for (let row = 1; row < config.rows - 1; row += 1) {
            for (let col = 1; col < config.cols - 1; col += 1) {
                const center = pointAt(row, col);
                const west = h(row, col - 1);
                const east = h(row, col + 1);
                const south = h(row - 1, col);
                const north = h(row + 1, col);

                const dzdx = (east - west) / (2 * spacing);
                const dzdy = (north - south) / (2 * spacing);
                const gradient = Math.hypot(dzdx, dzdy);
                const slopeRad = Math.atan(gradient);
                const slopeDeg = Cesium.Math.toDegrees(slopeRad);

                // Gradient ukazuje smerom nahor. Orientácia svahu (aspect)
                // je smer najväčšieho poklesu, meraný od severu v smere hodín.
                const aspectDeg = gradient < 1e-9
                    ? null
                    : this.normalizujAzimut(
                        Cesium.Math.toDegrees(Math.atan2(-dzdx, -dzdy))
                    );

                const d2zdx2 = (east - 2 * center.heightM + west) / (spacing * spacing);
                const d2zdy2 = (north - 2 * center.heightM + south) / (spacing * spacing);
                const laplacian = d2zdx2 + d2zdy2;

                // Profilové zakrivenie v smere gradientu. Pri takmer rovine
                // ostáva nulové, aby sa neznásoboval numerický šum.
                let profileCurvature = 0;
                if (gradient > 1e-9) {
                    const northEast = h(row + 1, col + 1);
                    const northWest = h(row + 1, col - 1);
                    const southEast = h(row - 1, col + 1);
                    const southWest = h(row - 1, col - 1);
                    const d2zdxdy = (
                        northEast - northWest - southEast + southWest
                    ) / (4 * spacing * spacing);

                    profileCurvature = (
                        d2zdx2 * dzdx * dzdx +
                        2 * d2zdxdy * dzdx * dzdy +
                        d2zdy2 * dzdy * dzdy
                    ) / (gradient * gradient);
                }

                const localReliefM = Math.max(west, east, south, north, center.heightM) -
                    Math.min(west, east, south, north, center.heightM);
                const shape = this.klasifikujTvar({
                    slopeDeg,
                    laplacian,
                    profileCurvature,
                    localReliefM,
                    spacingM: spacing
                });

                grid.cells.push({
                    index: center.index,
                    row,
                    col,
                    lat: center.lat,
                    lon: center.lon,
                    eastM: center.eastM,
                    northM: center.northM,
                    heightM: center.heightM,
                    slopeDeg,
                    aspectDeg,
                    gradient,
                    gradientEast: dzdx,
                    gradientNorth: dzdy,
                    curvature: laplacian,
                    profileCurvature,
                    localReliefM,
                    convexity: laplacian < -1e-5
                        ? "KONVEXNÁ"
                        : (laplacian > 1e-5 ? "KONKÁVNA" : "NEUTRÁLNA"),
                    terrainShape: shape.type,
                    terrainShapeConfidence: shape.confidence,
                    dataOrigin: "ODVODENÉ VÝPOČTOM"
                });
            }
        }
    },

    klasifikujTvar: function (metrics) {
        const curvatureScale = metrics.spacingM * metrics.spacingM;
        const scaledLaplacian = metrics.laplacian * curvatureScale;
        const scaledProfile = metrics.profileCurvature * curvatureScale;

        if (metrics.slopeDeg < 2 && metrics.localReliefM < 4) {
            return { type: "ROVINA", confidence: 0.8 };
        }

        if (scaledLaplacian <= -1.2 && scaledProfile <= -0.5) {
            return {
                type: metrics.slopeDeg >= 12 ? "REBRO_ALEBO_HRANA" : "VYVÝŠENINA",
                confidence: Math.min(1, 0.55 + Math.abs(scaledLaplacian) / 8)
            };
        }

        if (scaledLaplacian >= 1.2 && scaledProfile >= 0.5) {
            return {
                type: metrics.slopeDeg >= 8 ? "ŽĽAB_ALEBO_ZBERNICA" : "DEPRESIA",
                confidence: Math.min(1, 0.55 + Math.abs(scaledLaplacian) / 8)
            };
        }

        if (metrics.slopeDeg >= 5) {
            return { type: "SVAH", confidence: 0.65 };
        }

        return { type: "PRECHODOVÝ_TERÉN", confidence: 0.45 };
    },

    normalizujAzimut: function (degrees) {
        return ((degrees % 360) + 360) % 360;
    },

    vytvorSuhrn: function (cells) {
        if (!cells.length) {
            return {
                cellCount: 0,
                minHeightM: null,
                maxHeightM: null,
                reliefM: null,
                meanSlopeDeg: null,
                maxSlopeDeg: null,
                terrainShapes: {}
            };
        }

        const heights = cells.map((cell) => cell.heightM);
        const slopes = cells.map((cell) => cell.slopeDeg);
        const terrainShapes = {};

        cells.forEach((cell) => {
            terrainShapes[cell.terrainShape] = (terrainShapes[cell.terrainShape] || 0) + 1;
        });

        const minHeightM = Math.min(...heights);
        const maxHeightM = Math.max(...heights);

        return {
            cellCount: cells.length,
            minHeightM,
            maxHeightM,
            reliefM: maxHeightM - minHeightM,
            meanSlopeDeg: slopes.reduce((sum, value) => sum + value, 0) / slopes.length,
            maxSlopeDeg: Math.max(...slopes),
            terrainShapes
        };
    },

    /**
     * Dočasná diagnostická vrstva. Nie je súčasťou fyzikálneho výpočtu.
     * Farba vyjadruje základný geometrický typ bunky.
     */
    zobrazDiagnostiku: function (viewer, result = this.lastResult) {
        this.overProstredie(viewer);
        if (!result?.cells?.length) {
            throw new Error("Nie je dostupný výsledok analýzy terénu.");
        }

        this.skryDiagnostiku(viewer);
        const collection = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
        const offsetM = result.config.diagnosticHeightOffsetM;

        result.cells.forEach((cell) => {
            collection.add({
                position: Cesium.Cartesian3.fromDegrees(
                    cell.lon,
                    cell.lat,
                    cell.heightM + offsetM
                ),
                pixelSize: 5,
                color: this.farbaTvaru(cell.terrainShape),
                outlineColor: Cesium.Color.BLACK.withAlpha(0.55),
                outlineWidth: 1,
                id: {
                    type: "terrain-analysis-cell",
                    cell
                }
            });
        });

        this.diagnosticCollection = collection;
        return collection;
    },

    skryDiagnostiku: function (viewer) {
        if (this.diagnosticCollection && viewer?.scene?.primitives) {
            viewer.scene.primitives.remove(this.diagnosticCollection);
        }
        this.diagnosticCollection = null;
    },

    farbaTvaru: function (type) {
        const colors = {
            ROVINA: Cesium.Color.LIGHTGRAY.withAlpha(0.8),
            SVAH: Cesium.Color.GOLD.withAlpha(0.82),
            REBRO_ALEBO_HRANA: Cesium.Color.DARKRED.withAlpha(0.92),
            VYVÝŠENINA: Cesium.Color.ORANGERED.withAlpha(0.88),
            ŽĽAB_ALEBO_ZBERNICA: Cesium.Color.DEEPSKYBLUE.withAlpha(0.9),
            DEPRESIA: Cesium.Color.BLUE.withAlpha(0.86),
            PRECHODOVÝ_TERÉN: Cesium.Color.MEDIUMPURPLE.withAlpha(0.78)
        };

        return colors[type] || Cesium.Color.WHITE.withAlpha(0.8);
    }
};
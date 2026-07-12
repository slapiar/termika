// js/pilot-network.js
// Riadenie načítania IGC, časovej osi a prehrávania letu.
window.PilotNetwork = {
    playbackInterval: null,
    playbackDelayMs: 1000,
    isPlaying: false,
    currentIndex: 0,
    letoveBody: [],
    liveAtmosferaTEMP: [],
    viewer: null,
    bioChart: null,
    metadata: {},
    lclVyska: null,
    jeKominPostaveny: false,
    igcSourceName: "",
    terrainCalibration: null,
    aglStats: null,
    tempSourceName: "XCtrack/temp.json",

    spracujIgcSubor: async function (urlIgc, urlTemp, urlGlider, viewer, bioChart) {
        try {
            logStatus("Sťahujem IGC let, TEMP profil a aerodynamickú poláru...");

            const cacheBust = "?v=" + Date.now();
            const [resIgc, resTemp] = await Promise.all([
                fetch(urlIgc + cacheBust, { cache: "no-store" }),
                fetch(urlTemp + cacheBust, { cache: "no-store" }),
                GliderCore.inicializujPolaru(urlGlider + cacheBust)
            ]);

            if (!resIgc.ok) {
                throw new Error("IGC súbor sa nenačítal: HTTP " + resIgc.status);
            }
            if (!resTemp.ok) {
                throw new Error("TEMP profil sa nenačítal: HTTP " + resTemp.status);
            }

            const [igcText, liveAtmosferaTEMP] = await Promise.all([
                resIgc.text(),
                resTemp.json()
            ]);

            logStatus("Dátové súbory boli načítané do pamäte.", "success");
            this.tempSourceName = urlTemp;

            return await this.spracujIgcText(
                igcText,
                liveAtmosferaTEMP,
                viewer,
                bioChart,
                { sourceName: urlIgc, autoPlay: true }
            );
        } catch (error) {
            logStatus("FATÁLNE ZLYHANIE IGC PARSERA: " + error.message, "error");
            setMapState("CHYBA IGC", "error");
            throw error;
        }
    },

    nacitajLokalnyIgcSubor: async function (file, viewer, bioChart) {
        if (!(file instanceof File)) {
            throw new Error("Nebolo vybrané platné IGC.");
        }
        if (!file.name.toLowerCase().endsWith(".igc")) {
            throw new Error("Vybraný súbor nemá príponu .igc.");
        }
        if (!Array.isArray(this.liveAtmosferaTEMP) || this.liveAtmosferaTEMP.length === 0) {
            throw new Error("Najprv sa musí načítať základný TEMP profil aplikácie.");
        }

        this.pauzaPrehravanie({ silent: true });
        setMapState("NAČÍTAVAM IGC");
        logStatus("Načítavam lokálny IGC súbor „" + file.name + "“...");

        const igcText = await file.text();
        const result = await this.spracujIgcText(
            igcText,
            this.liveAtmosferaTEMP,
            viewer,
            bioChart,
            { sourceName: file.name, autoPlay: false }
        );

        logStatus("Let „" + file.name + "“ je pripravený na prehrávanie.", "success");
        return result;
    },

    nacitajLokalnyTempSubor: async function (file) {
        if (!(file instanceof File)) {
            throw new Error("Nebol vybraný platný TEMP súbor.");
        }

        const allowed = [".json", ".txt", ".csv", ".temp", ".snd"];
        const lowerName = file.name.toLowerCase();
        if (!allowed.some((extension) => lowerName.endsWith(extension))) {
            throw new Error("TEMP musí byť vo formáte JSON alebo textovej tabuľky (.txt, .csv, .temp, .snd).");
        }

        const text = await file.text();
        const profile = this.parsujTempText(text);
        this.pauzaPrehravanie({ silent: true });
        this.liveAtmosferaTEMP = profile;
        this.tempSourceName = file.name;
        this.lclVyska = MeteoCore.vypocitajLclZProfily(profile);
        this.jeKominPostaveny = false;
        window.CesiumRender?.vymazKominy?.(this.viewer);
        window.SkewTRender?.setProfile(profile, file.name);
        this.aktualizujTempUi();

        if (this.letoveBody.length && this.viewer) {
            this.posunNaIndex(this.currentIndex, { obnovGraf: true });
        }

        const lcl = MeteoCore.vypocitajLclDetail(profile);
        logStatus(
            "TEMP „" + file.name + "“: " + profile.length +
            " hladín, LCL približne " + (lcl ? Math.round(lcl.z_m) + " m AMSL" : "neurčené") + ".",
            "success"
        );
        setMapState("TEMP NAČÍTANÝ", "success");
        return profile;
    },

    parsujTempText: function (text) {
        if (typeof text !== "string" || text.trim() === "") {
            throw new Error("TEMP súbor je prázdny.");
        }

        const trimmed = text.trim();
        let raw = null;
        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
            try {
                const parsed = JSON.parse(trimmed);
                raw = Array.isArray(parsed) ? parsed : (parsed.profile || parsed.levels || parsed.data);
            } catch (error) {
                throw new Error("TEMP JSON nie je platný: " + error.message);
            }
        } else {
            raw = [];
            for (const lineRaw of trimmed.split(/\r?\n/)) {
                const line = lineRaw.trim();
                if (!line || line.startsWith("#") || line.startsWith("//") || line.startsWith(";")) continue;
                let tokens;
                if (line.includes(";")) tokens = line.split(";");
                else if (line.includes("\t")) tokens = line.split(/\t+/);
                else if (line.includes(",") && !line.includes(" ")) tokens = line.split(",");
                else tokens = line.split(/\s+/);
                const values = tokens.map((value) => Number(String(value).trim().replace(",", ".")));
                if (values.length < 4 || !values.slice(0, 4).every(Number.isFinite)) continue;
                raw.push({
                    p_hpa: values[0],
                    z_m: values[1],
                    T_c: values[2],
                    Td_c: values[3],
                    w_dir_deg: Number.isFinite(values[4]) ? values[4] : 0,
                    w_speed_kts: Number.isFinite(values[5]) ? values[5] : 0
                });
            }
        }

        return this.normalizujTempProfil(raw);
    },

    normalizujTempProfil: function (raw) {
        if (!Array.isArray(raw)) {
            throw new Error("TEMP profil musí byť pole výškových hladín.");
        }

        const aliases = {
            p_hpa: ["p_hpa", "pressure", "pressure_hpa", "p", "pres"],
            z_m: ["z_m", "height", "height_m", "alt", "altitude", "geopotential_height"],
            T_c: ["T_c", "temperature", "temperature_c", "temp", "t"],
            Td_c: ["Td_c", "dewpoint", "dew_point", "dewpoint_c", "td"],
            w_dir_deg: ["w_dir_deg", "wind_direction", "wind_dir", "direction", "dd"],
            w_speed_kts: ["w_speed_kts", "wind_speed_kts", "wind_speed", "speed", "ff"]
        };

        const pick = (row, names) => {
            for (const name of names) {
                if (row && row[name] !== undefined && row[name] !== null && row[name] !== "") {
                    const value = Number(String(row[name]).trim().replace(",", "."));
                    if (Number.isFinite(value)) return value;
                }
            }
            return null;
        };

        const normalized = raw.map((row) => ({
            p_hpa: pick(row, aliases.p_hpa),
            z_m: pick(row, aliases.z_m),
            T_c: pick(row, aliases.T_c),
            Td_c: pick(row, aliases.Td_c),
            w_dir_deg: pick(row, aliases.w_dir_deg) ?? 0,
            w_speed_kts: pick(row, aliases.w_speed_kts) ?? 0
        })).filter((row) =>
            [row.p_hpa, row.z_m, row.T_c, row.Td_c].every(Number.isFinite) &&
            row.p_hpa >= 80 && row.p_hpa <= 1100 &&
            row.z_m > -1000 && row.z_m < 30000 &&
            row.T_c > -120 && row.T_c < 65 &&
            row.Td_c > -140 && row.Td_c < 65
        ).sort((a, b) => b.p_hpa - a.p_hpa);

        const unique = [];
        for (const row of normalized) {
            if (unique.length && Math.abs(unique[unique.length - 1].p_hpa - row.p_hpa) < 0.05) continue;
            unique.push(row);
        }

        if (unique.length < 2) {
            throw new Error("TEMP neobsahuje aspoň dve platné hladiny p, z, T a Td.");
        }

        return unique;
    },

    aktualizujTempUi: function () {
        const file = document.getElementById("pTempFile");
        const levels = document.getElementById("pTempLevels");
        if (file) {
            file.textContent = this.tempSourceName.split(/[\\/]/).pop() || this.tempSourceName;
            file.title = this.tempSourceName;
        }
        if (levels) levels.textContent = this.liveAtmosferaTEMP.length ? String(this.liveAtmosferaTEMP.length) : "--";
    },

    spracujIgcText: async function (igcText, liveAtmosferaTEMP, viewer, bioChart, options = {}) {
        if (typeof igcText !== "string" || igcText.trim() === "") {
            throw new Error("IGC súbor je prázdny.");
        }
        liveAtmosferaTEMP = this.normalizujTempProfil(liveAtmosferaTEMP);
        if (!Array.isArray(liveAtmosferaTEMP) || liveAtmosferaTEMP.length === 0) {
            throw new Error("TEMP profil je prázdny alebo nemá očakávaný formát poľa.");
        }

        const parsed = this.parsujIgc(igcText);
        const letoveBody = this.doplnVyhladeneVario(parsed.body);

        if (letoveBody.length === 0) {
            throw new Error("IGC neobsahuje žiadne platné GPS B-záznamy.");
        }

        // Každý bod porovnáme s najdetailnejším dostupným terénom Cesium.
        // Surová GPS výška z IGC ostáva zachovaná v alt_amsl; pre 3D render
        // používame osobitnú výšku render_alt_m a z nej počítame AGL.
        this.terrainCalibration = await this.doplnTerennuKalibraciu(letoveBody, viewer);
        this.aglStats = this.vyhodnotAglProfil(letoveBody);
        this.aktualizujAglDiagnostiku(this.aglStats);

        const sourceName = options.sourceName || "let.igc";
        this.igcSourceName = sourceName;

        logStatus("Úspešne načítaných " + letoveBody.length + " bodov letu.", "success");
        logStatus(
            "Prvý bod: " + letoveBody[0].lat.toFixed(5) + ", " +
            letoveBody[0].lon.toFixed(5) + ", " +
            Math.round(letoveBody[0].alt_amsl) + " m AMSL.",
            "success"
        );

        document.getElementById("pId").textContent = parsed.pilot || "Neznámy pilot";
        document.getElementById("pSite").textContent = parsed.site || "Neuvedené";
        document.getElementById("pIgcPoints").textContent = letoveBody.length.toLocaleString("sk-SK");

        const shortName = sourceName.split(/[\\/]/).pop() || sourceName;
        const igcNameTop = document.getElementById("igcFileName");
        const igcNamePanel = document.getElementById("pIgcFile");
        if (igcNameTop) {
            igcNameTop.textContent = sourceName;
            igcNameTop.title = sourceName;
        }
        if (igcNamePanel) {
            igcNamePanel.textContent = shortName;
            igcNamePanel.title = sourceName;
        }

        // Celý let sa zobrazí tenkou farebnou stopou podľa skutočného vária.
        CesiumRender.pripravCelyLet(viewer, letoveBody);
        CesiumRender.nastavRezimKamery(viewer, "overview", letoveBody, 0);
        setMapState("LET NAČÍTANÝ", "success");

        this.pripravPrehravanieLetu(letoveBody, liveAtmosferaTEMP, viewer, bioChart, parsed);

        if (options.autoPlay) {
            this.prehrat();
        } else {
            this.pauzaPrehravanie({ silent: true });
            setMapState("LET PRIPRAVENÝ", "success");
        }

        return { letoveBody, metadata: parsed, sourceName };
    },

    parsujIgc: function (igcText) {
        const riadky = igcText.split(/\r?\n/);
        const body = [];
        let pilot = "";
        let site = "";
        let glider = "";

        for (const raw of riadky) {
            const riadok = raw.trim();

            if (riadok.startsWith("HPPLTPILOT:")) pilot = riadok.slice(11).trim();
            if (riadok.startsWith("HOSITSite:")) site = riadok.slice(10).trim();
            if (riadok.startsWith("HPGTYGLIDERTYPE:")) glider = riadok.slice(16).trim();

            if (!riadok.startsWith("B") || riadok.length < 35) continue;
            if (riadok.charAt(24) === "V") continue;

            const latDeg = Number.parseInt(riadok.substring(7, 9), 10);
            const latMin = Number.parseInt(riadok.substring(9, 14), 10) / 1000;
            const lonDeg = Number.parseInt(riadok.substring(15, 18), 10);
            const lonMin = Number.parseInt(riadok.substring(18, 23), 10) / 1000;

            let lat = latDeg + latMin / 60;
            let lon = lonDeg + lonMin / 60;
            if (riadok.charAt(14) === "S") lat *= -1;
            if (riadok.charAt(23) === "W") lon *= -1;

            const pressureAlt = Number.parseInt(riadok.substring(25, 30), 10);
            const gpsAlt = Number.parseInt(riadok.substring(30, 35), 10);

            // IGC B-záznam má dve výšky: 25–29 tlaková, 30–34 GPS.
            const altAmsl = Number.isFinite(gpsAlt) ? gpsAlt : pressureAlt;

            const hh = Number.parseInt(riadok.substring(1, 3), 10);
            const mm = Number.parseInt(riadok.substring(3, 5), 10);
            const ss = Number.parseInt(riadok.substring(5, 7), 10);
            const timeS = hh * 3600 + mm * 60 + ss;

            if (![lat, lon, altAmsl, timeS].every(Number.isFinite)) continue;
            if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;

            body.push({
                lat,
                lon,
                alt_amsl: altAmsl,
                alt_amsl_raw: altAmsl,
                pressure_alt_m: pressureAlt,
                terrain_height_m: null,
                agl_m: null,
                render_alt_m: altAmsl,
                vertical_correction_m: 0,
                time_s: timeS,
                vario_ms: 0
            });
        }

        return { body, pilot, site, glider };
    },

    doplnTerennuKalibraciu: async function (body, viewer) {
        const fallback = {
            status: "fallback",
            mode: "Bez terénnej kalibrácie",
            sampledPoints: 0,
            totalPoints: body.length,
            startCorrectionM: 0,
            endCorrectionM: 0,
            medianCorrectionM: 0
        };

        if (!viewer || !viewer.scene?.globe || typeof Cesium === "undefined") {
            logStatus("Terénnu kalibráciu nemožno spustiť: Cesium Viewer nie je pripravený.", "error");
            return fallback;
        }

        const provider = await this.cakajNaTerrainProvider(viewer);
        if (!provider) {
            logStatus("Terénny provider nie je dostupný. Let ostáva v pôvodnej IGC výške.", "error");
            return fallback;
        }

        setMapState("ODČÍTAVAM TERÉN");
        logStatus("Odčítavam výšku 3D terénu pod každým bodom letu...");

        const chunkSize = 650;
        let sampledPoints = 0;
        let fallbackLevelUsed = false;
        let nextProgressLog = 25;

        for (let start = 0; start < body.length; start += chunkSize) {
            const end = Math.min(body.length, start + chunkSize);
            const chunk = body.slice(start, end);
            const cartographics = chunk.map((bod) =>
                Cesium.Cartographic.fromDegrees(bod.lon, bod.lat)
            );

            let sampled = null;
            try {
                sampled = await Cesium.sampleTerrainMostDetailed(provider, cartographics);
            } catch (mostDetailedError) {
                try {
                    // Záloha pre provider bez availability. Úroveň 14 je stále
                    // dostatočne jemná na prvotnú lokálnu AGL analýzu.
                    sampled = await Cesium.sampleTerrain(provider, 14, cartographics);
                    fallbackLevelUsed = true;
                } catch (fallbackError) {
                    logStatus(
                        "Úsek terénu " + (start + 1) + "–" + end +
                        " sa nepodarilo odčítať: " + fallbackError.message,
                        "error"
                    );
                    sampled = cartographics;
                }
            }

            sampled.forEach((cartographic, localIndex) => {
                const bod = body[start + localIndex];
                const terrainHeight = Number(cartographic?.height);
                if (Number.isFinite(terrainHeight)) {
                    bod.terrain_height_m = terrainHeight;
                    sampledPoints += 1;
                }
            });

            const percent = Math.round((end / body.length) * 100);
            setMapState("TERÉN " + percent + " %");
            if (percent >= nextProgressLog || percent === 100) {
                logStatus("Odčítanie terénu: " + percent + " %.");
                while (nextProgressLog <= percent) nextProgressLog += 25;
            }
        }

        this.doplnChybajuceVyskyTerenu(body);

        const platne = body.filter((bod) => Number.isFinite(bod.terrain_height_m));
        if (platne.length < Math.max(10, body.length * 0.5)) {
            logStatus(
                "Terén sa podarilo odčítať iba pre " + sampledPoints +
                " z " + body.length + " bodov. Používam pôvodné IGC výšky.",
                "error"
            );
            body.forEach((bod) => {
                bod.render_alt_m = bod.alt_amsl;
                bod.vertical_correction_m = 0;
                bod.agl_m = Number.isFinite(bod.terrain_height_m)
                    ? bod.alt_amsl - bod.terrain_height_m
                    : null;
            });
            return { ...fallback, sampledPoints };
        }

        const clearanceM = 2.0;
        const startIndices = this.vyberStartKotvy(body);
        const finishIndices = this.vyberPristavacieKotvy(body);

        const startCorrections = startIndices
            .map((i) => body[i])
            .filter((bod) => Number.isFinite(bod.terrain_height_m))
            .map((bod) => bod.terrain_height_m + clearanceM - bod.alt_amsl);
        const finishCorrections = finishIndices
            .map((i) => body[i])
            .filter((bod) => Number.isFinite(bod.terrain_height_m))
            .map((bod) => bod.terrain_height_m + clearanceM - bod.alt_amsl);

        // Prvý a posledný IGC bod kotvíme priamo na miestny terén.
        // Okolité body používame ako kontrolnú vzorku proti náhodnému šumu.
        const firstPoint = body[0];
        const lastPoint = body[body.length - 1];
        const startCorrectionM = firstPoint.terrain_height_m + clearanceM - firstPoint.alt_amsl;
        const endCorrectionM = lastPoint.terrain_height_m + clearanceM - lastPoint.alt_amsl;
        const allCorrections = [...startCorrections, ...finishCorrections];
        const medianCorrectionM = this.median(allCorrections);

        if (![startCorrectionM, endCorrectionM, medianCorrectionM].every(Number.isFinite)) {
            logStatus("Nepodarilo sa vytvoriť spoľahlivé terénne kotvy. Používam pôvodné IGC výšky.", "error");
            body.forEach((bod) => {
                bod.render_alt_m = bod.alt_amsl;
                bod.vertical_correction_m = 0;
                bod.agl_m = Number.isFinite(bod.terrain_height_m)
                    ? bod.alt_amsl - bod.terrain_height_m
                    : null;
            });
            return { ...fallback, sampledPoints };
        }

        // Štart a pristátie sú dve nezávislé výškové kotvy. Medzi nimi
        // korigujeme pomalý drift GPS výšky lineárne v čase. Surová IGC
        // výška sa nemení; korekcia žije iba v interpretačnej vrstve.
        const anchorDifferenceM = endCorrectionM - startCorrectionM;
        const useLinearDrift = true;
        const firstTime = body[0].time_s;
        const totalTime = Math.max(1, this.rozdielCasov(body[body.length - 1].time_s, firstTime));

        body.forEach((bod) => {
            const elapsed = Math.max(0, Math.min(totalTime, this.rozdielCasov(bod.time_s, firstTime)));
            const progress = elapsed / totalTime;
            const correction = useLinearDrift
                ? startCorrectionM + anchorDifferenceM * progress
                : medianCorrectionM;

            bod.vertical_correction_m = correction;
            bod.render_alt_m = bod.alt_amsl + correction;
            bod.agl_m = bod.render_alt_m - bod.terrain_height_m;
            bod.raw_agl_m = bod.alt_amsl - bod.terrain_height_m;
        });

        const mode = "Terén + štart/pristátie + drift";

        const first = body[0];
        const last = body[body.length - 1];
        logStatus(
            "Terénna kalibrácia hotová: " + sampledPoints + "/" + body.length +
            " bodov, korekcia štart " + this.formatSigned(startCorrectionM, 1) +
            " m, pristátie " + this.formatSigned(endCorrectionM, 1) + " m.",
            "success"
        );
        logStatus(
            "Kontrola AGL: štart " + Math.round(first.agl_m) +
            " m, pristátie " + Math.round(last.agl_m) + " m nad terénom.",
            "success"
        );
        if (fallbackLevelUsed) {
            logStatus("Časť terénu bola odčítaná záložnou úrovňou LOD 14.");
        }
        if (Math.abs(anchorDifferenceM) > 18) {
            logStatus(
                "Pozor: štartová a pristávacia korekcia sa líšia o " +
                Math.abs(anchorDifferenceM).toFixed(1) +
                " m. Aplikácia tento rozdiel interpretuje ako pomalý drift GPS výšky.",
                "error"
            );
        }

        return {
            status: "ok",
            mode,
            sampledPoints,
            totalPoints: body.length,
            startCorrectionM,
            endCorrectionM,
            medianCorrectionM,
            anchorDifferenceM,
            fallbackLevelUsed
        };
    },

    cakajNaTerrainProvider: async function (viewer) {
        const timeoutAt = Date.now() + 10000;
        let provider = null;

        while (Date.now() < timeoutAt) {
            provider = viewer?.scene?.globe?.terrainProvider || viewer?.terrainProvider || null;
            const name = provider?.constructor?.name || "";
            if (provider && name !== "EllipsoidTerrainProvider") {
                return provider;
            }
            await new Promise((resolve) => window.setTimeout(resolve, 120));
        }

        return provider;
    },

    doplnChybajuceVyskyTerenu: function (body) {
        let lastValid = null;
        for (let i = 0; i < body.length; i += 1) {
            if (Number.isFinite(body[i].terrain_height_m)) {
                lastValid = body[i].terrain_height_m;
            } else if (Number.isFinite(lastValid)) {
                body[i].terrain_height_m = lastValid;
            }
        }

        let nextValid = null;
        for (let i = body.length - 1; i >= 0; i -= 1) {
            if (Number.isFinite(body[i].terrain_height_m)) {
                nextValid = body[i].terrain_height_m;
            } else if (Number.isFinite(nextValid)) {
                body[i].terrain_height_m = nextValid;
            }
        }
    },

    vyberStartKotvy: function (body) {
        const indices = [];
        const startTime = body[0].time_s;
        for (let i = 0; i < body.length; i += 1) {
            if (this.rozdielCasov(body[i].time_s, startTime) > 5) break;
            indices.push(i);
        }
        return indices.length ? indices : [0];
    },

    vyberPristavacieKotvy: function (body) {
        const result = [];
        const lastIndex = body.length - 1;
        const lastTime = body[lastIndex].time_s;
        const searchStart = Math.max(0, lastIndex - 120);

        for (let i = searchStart; i <= lastIndex; i += 1) {
            const age = this.rozdielCasov(lastTime, body[i].time_s);
            if (age > 35) continue;
            const speed = this.horizontalSpeedMs(body, i);
            if (speed <= 2.5 && Math.abs(body[i].vario_ms || 0) <= 1.5) {
                result.push(i);
            }
        }

        if (result.length >= 6) return result;
        const fallbackStart = Math.max(0, lastIndex - 12);
        return Array.from({ length: lastIndex - fallbackStart + 1 }, (_, k) => fallbackStart + k);
    },

    horizontalSpeedMs: function (body, index) {
        if (body.length < 2) return 0;
        const i0 = Math.max(0, index - 1);
        const i1 = Math.min(body.length - 1, index + 1);
        if (i0 === i1) return 0;

        const a = body[i0];
        const b = body[i1];
        const lat1 = a.lat * Math.PI / 180;
        const lat2 = b.lat * Math.PI / 180;
        const dLat = lat2 - lat1;
        const dLon = (b.lon - a.lon) * Math.PI / 180;
        const hav = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
        const distance = 6371008.8 * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(Math.max(0, 1 - hav)));
        const dt = this.rozdielCasov(b.time_s, a.time_s);
        return dt > 0 ? distance / dt : 0;
    },

    median: function (values) {
        const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
        if (!sorted.length) return NaN;
        const middle = Math.floor(sorted.length / 2);
        return sorted.length % 2
            ? sorted[middle]
            : (sorted[middle - 1] + sorted[middle]) / 2;
    },

    formatSigned: function (value, digits = 1) {
        if (!Number.isFinite(value)) return "--";
        return (value >= 0 ? "+" : "") + value.toFixed(digits);
    },

    vyhodnotAglProfil: function (body) {
        let minM = Infinity;
        let maxM = -Infinity;
        let negativeCount = 0;
        let belowFiveCount = 0;
        let validCount = 0;
        let minIndex = -1;

        body.forEach((point, index) => {
            const value = point.agl_m;
            if (!Number.isFinite(value)) return;
            validCount += 1;
            if (value < minM) {
                minM = value;
                minIndex = index;
            }
            if (value > maxM) maxM = value;
            if (value < -1) negativeCount += 1;
            if (value < 5) belowFiveCount += 1;
        });

        if (!validCount) {
            return { valid: false, minM: null, maxM: null, negativeCount: 0, belowFiveCount: 0 };
        }

        const startM = body[0]?.agl_m;
        const finishM = body[body.length - 1]?.agl_m;
        const result = {
            valid: true,
            minM,
            maxM,
            negativeCount,
            belowFiveCount,
            startM,
            finishM,
            minIndex
        };

        const message =
            "Kontrola AGL: štart " + (Number.isFinite(startM) ? Math.round(startM) + " m" : "--") +
            ", pristátie " + (Number.isFinite(finishM) ? Math.round(finishM) + " m" : "--") +
            ", minimum " + Math.round(minM) +
            " m, bodov pod terénom " + negativeCount + ".";
        logStatus(message, negativeCount > 0 ? "error" : "success");
        return result;
    },

    aktualizujAglDiagnostiku: function (stats) {
        const startFinish = document.getElementById("pAglStartFinish");
        const minimum = document.getElementById("pAglMin");
        const negative = document.getElementById("pAglNegative");

        if (startFinish) {
            startFinish.textContent = stats?.valid && Number.isFinite(stats.startM) && Number.isFinite(stats.finishM)
                ? Math.round(stats.startM) + " / " + Math.round(stats.finishM) + " m"
                : "--";
        }
        if (minimum) {
            minimum.textContent = stats?.valid ? Math.round(stats.minM) + " m AGL" : "--";
            minimum.className = "val" + (stats?.valid && stats.minM < -1 ? " danger" : "");
        }
        if (negative) {
            negative.textContent = stats?.valid ? String(stats.negativeCount) : "--";
            negative.className = "val" + (stats?.valid && stats.negativeCount > 0 ? " danger" : "");
        }
    },

    doplnVyhladeneVario: function (body) {
        if (!Array.isArray(body) || body.length < 2) return body;

        // GPS výška po jednej sekunde prirodzene „skáče“. Preto farbu stopy
        // určujeme z približne sedemsekundového centrovaného okna.
        const polOkna = 3;

        for (let i = 0; i < body.length; i += 1) {
            const i0 = Math.max(0, i - polOkna);
            const i1 = Math.min(body.length - 1, i + polOkna);
            const dt = this.rozdielCasov(body[i1].time_s, body[i0].time_s);
            const vario = dt > 0 ? (body[i1].alt_amsl - body[i0].alt_amsl) / dt : 0;
            body[i].vario_ms = Math.max(-8, Math.min(8, vario));
        }

        return body;
    },

    rozdielCasov: function (novsiCas, starsiCas) {
        let dt = novsiCas - starsiCas;
        if (dt < 0) dt += 86400;
        return dt;
    },

    pripravPrehravanieLetu: function (letoveBody, liveAtmosferaTEMP, viewer, bioChart, metadata) {
        this.pauzaPrehravanie({ silent: true });

        this.letoveBody = letoveBody;
        this.liveAtmosferaTEMP = liveAtmosferaTEMP;
        this.viewer = viewer;
        this.bioChart = bioChart;
        this.metadata = metadata || {};
        this.currentIndex = 0;
        this.jeKominPostaveny = false;
        this.lclVyska = MeteoCore.vypocitajLclZProfily(liveAtmosferaTEMP);
        window.SkewTRender?.setProfile(liveAtmosferaTEMP, this.tempSourceName);
        this.aktualizujTempUi();

        this.nastavOvládaniePrehravania(true);
        this.posunNaIndex(0, { obnovGraf: true });
        logStatus("Časová os letu je pripravená na posun dopredu aj dozadu.", "success");
    },

    // Kompatibilný názov pre prípad, že ho použije starší index.php.
    spustiPrehravanieLetu: function (letoveBody, liveAtmosferaTEMP, viewer, bioChart, metadata) {
        this.pripravPrehravanieLetu(letoveBody, liveAtmosferaTEMP, viewer, bioChart, metadata);
        this.prehrat();
    },

    prepniPrehravanie: function () {
        if (this.isPlaying) {
            this.pauzaPrehravanie();
        } else {
            this.prehrat();
        }
    },

    prehrat: function () {
        if (!this.letoveBody.length || !this.viewer) return;

        if (this.currentIndex >= this.letoveBody.length - 1) {
            this.posunNaIndex(0, { obnovGraf: true });
        }

        this.pauzaPrehravanie({ silent: true });
        this.isPlaying = true;
        this.aktualizujTlacidlaPrehravania();
        setMapState("PREHRÁVAM LET", "success");
        logStatus("Prehrávanie IGC letu bolo spustené.", "success");

        this.playbackInterval = window.setInterval(() => {
            this.krokDopredu();
        }, this.playbackDelayMs);
    },

    pauzaPrehravanie: function (options = {}) {
        if (this.playbackInterval) {
            window.clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }

        const boloSpustene = this.isPlaying;
        this.isPlaying = false;
        this.aktualizujTlacidlaPrehravania();

        if (!options.silent && boloSpustene) {
            setMapState("LET POZASTAVENÝ");
            logStatus("Prehrávanie letu bolo pozastavené.");
        }
    },

    zastavPrehravanie: function () {
        if (!this.letoveBody.length) return;

        this.pauzaPrehravanie({ silent: true });
        this.posunNaIndex(0, { obnovGraf: true });
        document.getElementById("pStatus").textContent = "LET ZASTAVENÝ";
        document.getElementById("pStatus").style.color = "#ffeb3b";
        setMapState("LET ZASTAVENÝ");
        logStatus("Prehrávanie bolo zastavené a časová os sa vrátila na začiatok.");
    },

    krokDopredu: function () {
        if (!this.isPlaying || !this.letoveBody.length) return;

        if (this.currentIndex >= this.letoveBody.length - 1) {
            this.pauzaPrehravanie({ silent: true });
            document.getElementById("pStatus").textContent = "LET UKONČENÝ";
            document.getElementById("pStatus").style.color = "#00e676";
            logStatus("Simulácia IGC letu bola úspešne dokončená.", "success");
            setMapState("LET UKONČENÝ", "success");
            return;
        }

        this.posunNaIndex(this.currentIndex + 1, { pridajDoGrafu: true });
    },

    posunNaIndex: function (novyIndex, options = {}) {
        if (!this.letoveBody.length || !this.viewer) return;

        const maxIndex = this.letoveBody.length - 1;
        const index = Math.max(0, Math.min(maxIndex, Math.round(Number(novyIndex) || 0)));
        this.currentIndex = index;

        const liveData = this.vytvorLiveData(index);
        this.aktualizujUiPanely(liveData, this.lclVyska, this.bioChart, {
            pridajDoGrafu: Boolean(options.pridajDoGrafu)
        });

        if (!this.jeKominPostaveny) {
            this.postavPrvyKomin(liveData);
        }

        CesiumRender.vykresliPilotaNaIndexe(
            this.viewer,
            liveData,
            this.letoveBody,
            index
        );

        this.aktualizujCasovuOs();

        if (options.obnovGraf) {
            this.obnovBioGraf(index);
        }
    },

    vytvorLiveData: function (index) {
        const bod = this.letoveBody[index];
        const h0 = this.liveAtmosferaTEMP[0];
        const hpaTlakHladiny = h0.p_hpa - ((bod.alt_amsl - h0.z_m) * 0.11);
        const opadavanieStroja = GliderCore.getKorigovaneOpadavanie(bod.alt_amsl, hpaTlakHladiny);

        // Skutočné vario hovorí, či pilot podľa GPS stúpa alebo klesá.
        // Odhad pohybu vzduchovej hmoty je vario + vlastné opadanie stroja.
        const skutocneVario = bod.vario_ms || 0;
        const pohybVzduchu = skutocneVario + opadavanieStroja;

        return {
            pilot_id: this.metadata.pilot || "IGC pilot",
            lat: bod.lat,
            lon: bod.lon,
            alt_amsl: bod.alt_amsl,
            render_alt_m: bod.render_alt_m,
            terrain_height_m: bod.terrain_height_m,
            agl_m: bod.agl_m,
            vertical_correction_m: bod.vertical_correction_m,
            vertical_speed_ms: Math.round(skutocneVario * 10) / 10,
            airmass_vertical_ms: Math.round(pohybVzduchu * 10) / 10,
            heart_rate_bpm: Math.max(65, Math.min(190, Math.floor(125 + skutocneVario * 4))),
            blood_oxygen_spo2: Math.max(75, Math.min(99, Math.floor(97 - (bod.alt_amsl / 1000) * 2.5))),
            vzdialenost_k_ctr_m: 9999,
            time_s: bod.time_s
        };
    },

    postavPrvyKomin: function (liveData) {
        try {
            logStatus("Počítam orografiu a staviam 3D teleso termického komína...");
            const strukturaKomina = MeteoCore.vypocitaj3DDriftKomina(
                this.liveAtmosferaTEMP,
                liveData.lat,
                liveData.lon
            );
            CesiumRender.vykresli3DTeloKomina(this.viewer, strukturaKomina);
            this.jeKominPostaveny = true;
            logStatus("3D teleso komína bolo vztýčené pri trase letu.", "success");
        } catch (error) {
            logStatus("Chyba výpočtu tela komína: " + error.message, "error");
        }
    },

    nastavOvládaniePrehravania: function (enabled) {
        const timeline = document.getElementById("flightTimeline");
        const playButton = document.getElementById("playPauseButton");
        const stopButton = document.getElementById("stopPlaybackButton");

        if (timeline) {
            timeline.disabled = !enabled;
            timeline.min = "0";
            timeline.max = enabled ? String(Math.max(0, this.letoveBody.length - 1)) : "0";
            timeline.step = "1";
            timeline.value = "0";
        }
        if (playButton) playButton.disabled = !enabled;
        if (stopButton) stopButton.disabled = !enabled;

        this.aktualizujTlacidlaPrehravania();
        this.aktualizujCasovuOs();
    },

    aktualizujTlacidlaPrehravania: function () {
        const button = document.getElementById("playPauseButton");
        if (!button) return;

        button.textContent = this.isPlaying ? "⏸ Pauza" : "▶ Prehrať";
        button.title = this.isPlaying ? "Pozastaviť prehrávanie letu" : "Pokračovať v prehrávaní letu";
        button.classList.toggle("is-playing", this.isPlaying);
    },

    aktualizujCasovuOs: function () {
        const timeline = document.getElementById("flightTimeline");
        const currentTime = document.getElementById("flightCurrentTime");
        const endTime = document.getElementById("flightEndTime");
        const progress = document.getElementById("flightProgressText");

        if (!this.letoveBody.length) {
            if (currentTime) currentTime.textContent = "--:--:--";
            if (endTime) endTime.textContent = "--:--:--";
            if (progress) progress.textContent = "0 / 0";
            return;
        }

        const first = this.letoveBody[0];
        const current = this.letoveBody[this.currentIndex];
        const last = this.letoveBody[this.letoveBody.length - 1];
        const elapsed = this.rozdielCasov(current.time_s, first.time_s);

        if (timeline) timeline.value = String(this.currentIndex);
        if (currentTime) currentTime.textContent = this.formatujCas(current.time_s);
        if (endTime) endTime.textContent = this.formatujCas(last.time_s);
        if (progress) {
            progress.textContent =
                (this.currentIndex + 1).toLocaleString("sk-SK") + " / " +
                this.letoveBody.length.toLocaleString("sk-SK") +
                "  ·  +" + this.formatujTrvanie(elapsed);
        }
    },

    formatujCas: function (timeS) {
        const normalized = ((Math.round(timeS) % 86400) + 86400) % 86400;
        const hh = String(Math.floor(normalized / 3600)).padStart(2, "0");
        const mm = String(Math.floor((normalized % 3600) / 60)).padStart(2, "0");
        const ss = String(normalized % 60).padStart(2, "0");
        return hh + ":" + mm + ":" + ss;
    },

    formatujTrvanie: function (seconds) {
        const total = Math.max(0, Math.round(seconds));
        const hh = String(Math.floor(total / 3600)).padStart(2, "0");
        const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
        const ss = String(total % 60).padStart(2, "0");
        return hh + ":" + mm + ":" + ss;
    },

    aktualizujUiPanely: function (liveData, lclVyska, bioChart, options = {}) {
        document.getElementById("pId").textContent = liveData.pilot_id;
        document.getElementById("pHr").textContent = liveData.heart_rate_bpm + " BPM";
        document.getElementById("pSpo2").textContent = liveData.blood_oxygen_spo2 + " %";
        document.getElementById("pVario").textContent = liveData.vertical_speed_ms.toFixed(1) + " m/s";
        document.getElementById("pAlt").textContent = Math.round(liveData.alt_amsl) + " m AMSL";
        const terrainEl = document.getElementById("pTerrain");
        const aglEl = document.getElementById("pAgl");
        const correctionEl = document.getElementById("pAltCorrection");
        const terrainModeEl = document.getElementById("pTerrainMode");

        if (terrainEl) {
            terrainEl.textContent = Number.isFinite(liveData.terrain_height_m)
                ? Math.round(liveData.terrain_height_m) + " m"
                : "--";
        }
        if (aglEl) {
            aglEl.textContent = Number.isFinite(liveData.agl_m)
                ? Math.round(liveData.agl_m) + " m AGL"
                : "--";
            aglEl.className = "val" + (Number.isFinite(liveData.agl_m) && liveData.agl_m < 0 ? " danger" : "");
        }
        if (correctionEl) {
            correctionEl.textContent = Number.isFinite(liveData.vertical_correction_m)
                ? this.formatSigned(liveData.vertical_correction_m, 1) + " m"
                : "--";
        }
        if (terrainModeEl) {
            terrainModeEl.textContent = this.terrainCalibration?.mode || "Bez kalibrácie";
        }
        const positionEl = document.getElementById("pPosition");
        if (positionEl) {
            positionEl.textContent = liveData.lat.toFixed(6) + "°, " + liveData.lon.toFixed(6) + "°";
        }
        document.getElementById("pLcl").textContent = Number.isFinite(lclVyska)
            ? Math.round(lclVyska) + " m AMSL"
            : "--";

        const spo2Element = document.getElementById("pSpo2");
        const statusElement = document.getElementById("pStatus");

        if (liveData.blood_oxygen_spo2 < 90) {
            spo2Element.className = "val danger";
            statusElement.textContent = "HYPOXIA / APNOE";
            statusElement.style.color = "#ff1744";
        } else {
            spo2Element.className = "val";
            statusElement.textContent = liveData.heart_rate_bpm > 150 ? "VYSOKÝ STRES" : "STABILNÝ";
            statusElement.style.color = liveData.heart_rate_bpm > 150 ? "#ffeb3b" : "#00e676";
        }

        document.getElementById("pAirspace").textContent = "Bezpečný (Alpy)";
        document.getElementById("pAirspace").style.color = "#00e676";

        if (options.pridajDoGrafu && bioChart && bioChart.data) {
            if (bioChart.data.labels.length >= 30) {
                bioChart.data.labels.shift();
                bioChart.data.datasets[0].data.shift();
                bioChart.data.datasets[1].data.shift();
            }

            bioChart.data.labels.push(this.formatujCas(liveData.time_s));
            bioChart.data.datasets[0].data.push(liveData.blood_oxygen_spo2);
            bioChart.data.datasets[1].data.push(liveData.heart_rate_bpm);
            bioChart.update("none");
        }
    },

    obnovBioGraf: function (index) {
        if (!this.bioChart || !this.bioChart.data) return;

        const labels = [];
        const spo2 = [];
        const heartRate = [];
        const start = Math.max(0, index - 29);

        for (let i = start; i <= index; i += 1) {
            const data = this.vytvorLiveData(i);
            labels.push(this.formatujCas(data.time_s));
            spo2.push(data.blood_oxygen_spo2);
            heartRate.push(data.heart_rate_bpm);
        }

        this.bioChart.data.labels = labels;
        this.bioChart.data.datasets[0].data = spo2;
        this.bioChart.data.datasets[1].data = heartRate;
        this.bioChart.update("none");
    }
};

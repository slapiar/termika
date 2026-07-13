// js/terrain-camera-hud.js
// TermikaXC v2.6 – jednoduchý kamerový HUD pre 3D test analýzy terénu.
//
// HUD nemení analytické výsledky. Zobrazuje iba stav Cesium kamery:
// azimut, vertikálny uhol, roll, kartografickú výšku a dostupný odhad AGL.

(function () {
    if (window.TerrainCameraHUD) return;

    const VERSION = "2.6.0-camera-hud.1";
    const HEADING_STEP_DEG = 5;
    const HEADING_RANGE_DEG = 40;
    const PITCH_STEP_DEG = 5;
    const PITCH_RANGE_DEG = 35;
    const UPDATE_EPSILON_DEG = 0.05;
    const UPDATE_EPSILON_M = 0.5;

    let installed = false;
    let visible = true;
    let activeViewer = null;
    let removePreRenderListener = null;
    let root = null;
    let headingValue = null;
    let pitchValue = null;
    let rollValue = null;
    let heightValue = null;
    let aglValue = null;
    let headingTrack = null;
    let pitchTrack = null;
    let headingTicks = [];
    let pitchTicks = [];
    let visibilityInput = null;
    let retryCount = 0;

    const lastState = {
        headingDeg: null,
        pitchDeg: null,
        rollDeg: null,
        cameraHeightM: null,
        aglM: null
    };

    const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
    const normalize360 = (value) => ((Number(value) % 360) + 360) % 360;

    const signedAngleDifference = function (targetDeg, referenceDeg) {
        return ((targetDeg - referenceDeg + 540) % 360) - 180;
    };

    const formatAngle = function (value, digits = 1) {
        const number = Number(value);
        if (!Number.isFinite(number)) return "--.-°";
        return number.toLocaleString("sk-SK", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        }) + "°";
    };

    const formatHeight = function (value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return "-- m";
        return Math.round(number).toLocaleString("sk-SK") + " m";
    };

    const cardinalForHeading = function (headingDeg) {
        const labels = ["S", "SV", "V", "JV", "J", "JZ", "Z", "SZ"];
        return labels[Math.round(normalize360(headingDeg) / 45) % labels.length];
    };

    const cardinalForTick = function (headingDeg) {
        const normalized = Math.round(normalize360(headingDeg));
        const labels = {
            0: "S",
            45: "SV",
            90: "V",
            135: "JV",
            180: "J",
            225: "JZ",
            270: "Z",
            315: "SZ"
        };
        return labels[normalized] || null;
    };

    const resolveViewer = function () {
        if (window.terrainAnalysisViewer?.camera && window.terrainAnalysisViewer?.scene) {
            return window.terrainAnalysisViewer;
        }

        // terrain-analysis-test.php vytvára klasický globálny lexikálny binding
        // `const viewer`. Po vykonaní inline skriptu je dostupný aj neskôr
        // načítaným klasickým skriptom, hoci nie je vlastnosťou window.
        try {
            if (typeof viewer !== "undefined" && viewer?.camera && viewer?.scene) {
                return viewer;
            }
        } catch (error) {
            // Binding ešte nemusí byť pripravený. Inštalácia sa zopakuje.
        }

        return null;
    };

    const installStyles = function () {
        if (document.getElementById("terrain-camera-hud-style")) return;

        const style = document.createElement("style");
        style.id = "terrain-camera-hud-style";
        style.textContent = `
            :root{
                --terrain-hud-green:#baff9a;
                --terrain-hud-green-strong:#d4ffbd;
                --terrain-hud-green-dim:rgba(186,255,154,.58);
                --terrain-hud-green-faint:rgba(186,255,154,.23);
                --terrain-hud-shadow:rgba(0,0,0,.78)
            }
            #terrainCameraHud{
                position:fixed;
                inset:0;
                z-index:13;
                overflow:hidden;
                pointer-events:none;
                color:var(--terrain-hud-green);
                font:600 12px/1.1 ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;
                text-shadow:0 1px 2px var(--terrain-hud-shadow),0 0 6px rgba(82,255,94,.36);
                user-select:none
            }
            #terrainCameraHud[hidden]{display:none!important}
            .terrain-hud-heading{
                position:absolute;
                top:48px;
                left:50%;
                width:min(650px,58vw);
                height:70px;
                transform:translateX(-50%)
            }
            .terrain-hud-heading-readout{
                position:absolute;
                top:0;
                left:50%;
                transform:translateX(-50%);
                padding:3px 10px 4px;
                border:1px solid var(--terrain-hud-green-dim);
                border-radius:3px;
                background:rgba(4,18,10,.48);
                color:var(--terrain-hud-green-strong);
                font-size:14px;
                letter-spacing:.08em;
                white-space:nowrap
            }
            .terrain-hud-heading-ruler{
                position:absolute;
                inset:27px 0 0;
                overflow:hidden;
                border-top:1px solid var(--terrain-hud-green-faint)
            }
            .terrain-hud-heading-ruler::before,
            .terrain-hud-heading-ruler::after{
                content:"";
                position:absolute;
                top:0;
                bottom:0;
                width:72px;
                z-index:2;
                pointer-events:none
            }
            .terrain-hud-heading-ruler::before{
                left:0;
                background:linear-gradient(90deg,rgba(7,16,24,.72),transparent)
            }
            .terrain-hud-heading-ruler::after{
                right:0;
                background:linear-gradient(270deg,rgba(7,16,24,.72),transparent)
            }
            .terrain-hud-heading-track,
            .terrain-hud-pitch-track{
                position:absolute;
                inset:0
            }
            .terrain-hud-heading-tick{
                position:absolute;
                top:0;
                width:1px;
                height:13px;
                background:var(--terrain-hud-green-dim);
                transform:translateX(-50%)
            }
            .terrain-hud-heading-tick.is-major{height:20px;background:var(--terrain-hud-green)}
            .terrain-hud-heading-tick.is-cardinal{height:25px;background:var(--terrain-hud-green-strong)}
            .terrain-hud-heading-tick span{
                position:absolute;
                top:22px;
                left:50%;
                transform:translateX(-50%);
                color:var(--terrain-hud-green-dim);
                font-size:10px;
                white-space:nowrap
            }
            .terrain-hud-heading-tick.is-major span{color:var(--terrain-hud-green)}
            .terrain-hud-heading-tick.is-cardinal span{
                top:27px;
                color:var(--terrain-hud-green-strong);
                font-size:12px;
                font-weight:800
            }
            .terrain-hud-heading-index{
                position:absolute;
                top:24px;
                left:50%;
                width:0;
                height:0;
                z-index:4;
                transform:translateX(-50%);
                border-left:6px solid transparent;
                border-right:6px solid transparent;
                border-top:9px solid var(--terrain-hud-green-strong);
                filter:drop-shadow(0 0 4px rgba(82,255,94,.55))
            }
            .terrain-hud-pitch{
                position:absolute;
                top:50%;
                left:calc(50% + min(31vw,340px));
                width:90px;
                height:min(410px,48vh);
                transform:translateY(-50%)
            }
            .terrain-hud-pitch-readout{
                position:absolute;
                top:50%;
                right:0;
                min-width:70px;
                transform:translateY(-50%);
                padding:4px 7px;
                border:1px solid var(--terrain-hud-green-dim);
                border-radius:3px;
                background:rgba(4,18,10,.48);
                color:var(--terrain-hud-green-strong);
                text-align:center;
                font-size:13px
            }
            .terrain-hud-pitch-ruler{
                position:absolute;
                top:0;
                bottom:0;
                left:0;
                width:48px;
                overflow:hidden;
                border-left:1px solid var(--terrain-hud-green-faint)
            }
            .terrain-hud-pitch-tick{
                position:absolute;
                left:0;
                width:11px;
                height:1px;
                background:var(--terrain-hud-green-dim);
                transform:translateY(-50%)
            }
            .terrain-hud-pitch-tick.is-major{width:19px;background:var(--terrain-hud-green)}
            .terrain-hud-pitch-tick.is-zero{width:27px;background:var(--terrain-hud-green-strong)}
            .terrain-hud-pitch-tick span{
                position:absolute;
                top:50%;
                left:23px;
                transform:translateY(-50%);
                color:var(--terrain-hud-green-dim);
                font-size:10px;
                white-space:nowrap
            }
            .terrain-hud-pitch-tick.is-major span{color:var(--terrain-hud-green)}
            .terrain-hud-pitch-tick.is-zero span{color:var(--terrain-hud-green-strong);font-size:11px}
            .terrain-hud-pitch-index{
                position:absolute;
                top:50%;
                left:-8px;
                width:40px;
                height:1px;
                z-index:4;
                background:var(--terrain-hud-green-strong);
                box-shadow:0 0 5px rgba(82,255,94,.5)
            }
            .terrain-hud-pitch-index::before{
                content:"";
                position:absolute;
                left:0;
                top:-4px;
                width:7px;
                height:7px;
                border-left:1px solid var(--terrain-hud-green-strong);
                border-bottom:1px solid var(--terrain-hud-green-strong);
                transform:rotate(45deg)
            }
            .terrain-hud-data{
                position:absolute;
                top:123px;
                left:50%;
                display:flex;
                gap:13px;
                transform:translateX(-50%);
                padding:5px 10px;
                border-top:1px solid var(--terrain-hud-green-dim);
                border-bottom:1px solid var(--terrain-hud-green-faint);
                background:rgba(4,18,10,.34);
                white-space:nowrap
            }
            .terrain-hud-data-item{display:flex;gap:5px;align-items:baseline}
            .terrain-hud-data-item b{
                color:var(--terrain-hud-green-dim);
                font-size:9px;
                font-weight:600;
                letter-spacing:.08em
            }
            .terrain-hud-data-item span{color:var(--terrain-hud-green-strong);font-size:12px}
            .terrain-hud-reticle{
                position:absolute;
                top:50%;
                left:50%;
                width:70px;
                height:34px;
                transform:translate(-50%,-50%);
                opacity:.82
            }
            .terrain-hud-reticle::before,
            .terrain-hud-reticle::after{
                content:"";
                position:absolute;
                background:var(--terrain-hud-green-dim)
            }
            .terrain-hud-reticle::before{
                top:50%;
                left:0;
                width:27px;
                height:1px;
                box-shadow:43px 0 0 var(--terrain-hud-green-dim)
            }
            .terrain-hud-reticle::after{
                top:0;
                left:50%;
                width:1px;
                height:11px;
                box-shadow:0 23px 0 var(--terrain-hud-green-dim)
            }
            .terrain-hud-reticle-center{
                position:absolute;
                top:50%;
                left:50%;
                width:5px;
                height:5px;
                transform:translate(-50%,-50%);
                border:1px solid var(--terrain-hud-green-strong);
                border-radius:50%;
                box-shadow:0 0 5px rgba(82,255,94,.55)
            }
            @media (max-width:1000px){
                .terrain-hud-heading{width:52vw}
                .terrain-hud-data{gap:8px;font-size:10px}
                .terrain-hud-pitch{left:auto;right:14px}
            }
            @media (max-width:760px){
                .terrain-hud-heading{top:44px;width:72vw}
                .terrain-hud-data{top:118px;max-width:88vw;flex-wrap:wrap;justify-content:center}
                .terrain-hud-pitch{right:8px;height:38vh;opacity:.9}
                .terrain-hud-data-item b{font-size:8px}
                .terrain-hud-data-item span{font-size:10px}
            }
        `;
        document.head.appendChild(style);
    };

    const createTick = function (className) {
        const tick = document.createElement("i");
        tick.className = className;
        const label = document.createElement("span");
        tick.appendChild(label);
        return { element: tick, label };
    };

    const createHud = function () {
        if (root) return root;

        installStyles();

        root = document.createElement("div");
        root.id = "terrainCameraHud";
        root.setAttribute("aria-hidden", "true");

        const headingSection = document.createElement("section");
        headingSection.className = "terrain-hud-heading";

        headingValue = document.createElement("div");
        headingValue.className = "terrain-hud-heading-readout";
        headingValue.textContent = "AZIMUT 000.0° · S";

        const headingRuler = document.createElement("div");
        headingRuler.className = "terrain-hud-heading-ruler";
        headingTrack = document.createElement("div");
        headingTrack.className = "terrain-hud-heading-track";

        for (let index = -9; index <= 9; index += 1) {
            const tick = createTick("terrain-hud-heading-tick");
            headingTicks.push(tick);
            headingTrack.appendChild(tick.element);
        }

        const headingIndex = document.createElement("div");
        headingIndex.className = "terrain-hud-heading-index";
        headingRuler.append(headingTrack, headingIndex);
        headingSection.append(headingValue, headingRuler);

        const pitchSection = document.createElement("section");
        pitchSection.className = "terrain-hud-pitch";

        const pitchRuler = document.createElement("div");
        pitchRuler.className = "terrain-hud-pitch-ruler";
        pitchTrack = document.createElement("div");
        pitchTrack.className = "terrain-hud-pitch-track";

        for (let index = -8; index <= 8; index += 1) {
            const tick = createTick("terrain-hud-pitch-tick");
            pitchTicks.push(tick);
            pitchTrack.appendChild(tick.element);
        }

        const pitchIndex = document.createElement("div");
        pitchIndex.className = "terrain-hud-pitch-index";
        pitchRuler.append(pitchTrack, pitchIndex);

        pitchValue = document.createElement("div");
        pitchValue.className = "terrain-hud-pitch-readout";
        pitchValue.textContent = "0.0°";
        pitchSection.append(pitchRuler, pitchValue);

        const data = document.createElement("div");
        data.className = "terrain-hud-data";

        const createDataItem = function (labelText) {
            const item = document.createElement("div");
            item.className = "terrain-hud-data-item";
            const label = document.createElement("b");
            label.textContent = labelText;
            const value = document.createElement("span");
            value.textContent = "--";
            item.append(label, value);
            data.appendChild(item);
            return value;
        };

        rollValue = createDataItem("ROLL");
        heightValue = createDataItem("VÝŠKA KAMERY");
        aglValue = createDataItem("AGL");

        const reticle = document.createElement("div");
        reticle.className = "terrain-hud-reticle";
        const reticleCenter = document.createElement("i");
        reticleCenter.className = "terrain-hud-reticle-center";
        reticle.appendChild(reticleCenter);

        root.append(headingSection, pitchSection, data, reticle);
        document.body.appendChild(root);
        return root;
    };

    const installToggle = function () {
        visibilityInput = document.getElementById("cameraHudVisible");
        if (!visibilityInput) {
            const meshInput = document.getElementById("meshVisible");
            const contoursInput = document.getElementById("contoursVisible");
            const anchorLabel = meshInput?.closest("label") || contoursInput?.closest("label");
            if (!anchorLabel) return;

            const label = document.createElement("label");
            visibilityInput = document.createElement("input");
            visibilityInput.id = "cameraHudVisible";
            visibilityInput.type = "checkbox";
            visibilityInput.checked = visible;
            label.append(visibilityInput, document.createTextNode(" Zobraziť HUD kamery"));
            anchorLabel.insertAdjacentElement("afterend", label);
        }

        if (!visibilityInput.__terrainCameraHudBound) {
            visibilityInput.addEventListener("change", () => setVisible(visibilityInput.checked));
            visibilityInput.__terrainCameraHudBound = true;
        }
    };

    const updateHeadingRuler = function (headingDeg) {
        const base = Math.floor(headingDeg / HEADING_STEP_DEG) * HEADING_STEP_DEG;

        headingTicks.forEach((tick, index) => {
            const offsetIndex = index - Math.floor(headingTicks.length / 2);
            const tickValue = normalize360(base + offsetIndex * HEADING_STEP_DEG);
            const relativeDeg = signedAngleDifference(tickValue, headingDeg);
            const leftPercent = 50 + 50 * relativeDeg / HEADING_RANGE_DEG;
            const rounded = Math.round(tickValue) % 360;
            const cardinal = cardinalForTick(rounded);
            const major = rounded % 10 === 0;

            tick.element.hidden = Math.abs(relativeDeg) > HEADING_RANGE_DEG + HEADING_STEP_DEG;
            tick.element.style.left = leftPercent + "%";
            tick.element.className = "terrain-hud-heading-tick" +
                (major ? " is-major" : "") +
                (cardinal ? " is-cardinal" : "");
            tick.label.textContent = cardinal || (major ? String(rounded).padStart(3, "0") + "°" : "");
        });
    };

    const updatePitchRuler = function (pitchDeg) {
        const base = Math.floor(pitchDeg / PITCH_STEP_DEG) * PITCH_STEP_DEG;

        pitchTicks.forEach((tick, index) => {
            const offsetIndex = index - Math.floor(pitchTicks.length / 2);
            const tickValue = base + offsetIndex * PITCH_STEP_DEG;
            const relativeDeg = tickValue - pitchDeg;
            const topPercent = 50 - 50 * relativeDeg / PITCH_RANGE_DEG;
            const major = Math.round(tickValue) % 10 === 0;
            const zero = Math.abs(tickValue) < 0.001;
            const inside = tickValue >= -90 && tickValue <= 90 &&
                Math.abs(relativeDeg) <= PITCH_RANGE_DEG + PITCH_STEP_DEG;

            tick.element.hidden = !inside;
            tick.element.style.top = topPercent + "%";
            tick.element.className = "terrain-hud-pitch-tick" +
                (major ? " is-major" : "") +
                (zero ? " is-zero" : "");
            tick.label.textContent = major ? (tickValue > 0 ? "+" : "") + tickValue + "°" : "";
        });
    };

    const shouldUpdate = function (nextState) {
        const changedAngle = ["headingDeg", "pitchDeg", "rollDeg"].some((key) =>
            lastState[key] == null || Math.abs(nextState[key] - lastState[key]) >= UPDATE_EPSILON_DEG
        );
        const changedHeight = ["cameraHeightM", "aglM"].some((key) => {
            const before = lastState[key];
            const after = nextState[key];
            if (before == null && after == null) return false;
            if (before == null || after == null) return true;
            return Math.abs(after - before) >= UPDATE_EPSILON_M;
        });
        return changedAngle || changedHeight;
    };

    const readCameraState = function () {
        if (!activeViewer?.camera) return null;

        const camera = activeViewer.camera;
        const cartographic = camera.positionCartographic;
        const cameraHeightM = Number(cartographic?.height);
        let terrainHeightM = null;
        let aglM = null;

        if (cartographic && activeViewer.scene?.globe?.getHeight) {
            const sampledTerrainHeight = activeViewer.scene.globe.getHeight(cartographic);
            if (Number.isFinite(sampledTerrainHeight)) {
                terrainHeightM = sampledTerrainHeight;
                if (Number.isFinite(cameraHeightM)) aglM = cameraHeightM - terrainHeightM;
            }
        }

        return {
            headingDeg: normalize360(Cesium.Math.toDegrees(camera.heading)),
            pitchDeg: clamp(Cesium.Math.toDegrees(camera.pitch), -90, 90),
            rollDeg: Cesium.Math.toDegrees(camera.roll),
            cameraHeightM: Number.isFinite(cameraHeightM) ? cameraHeightM : null,
            terrainHeightM,
            aglM: Number.isFinite(aglM) ? aglM : null
        };
    };

    const renderState = function (state) {
        if (!root || !state || !shouldUpdate(state)) return;

        headingValue.textContent = "AZIMUT " + formatAngle(state.headingDeg) + " · " +
            cardinalForHeading(state.headingDeg);
        pitchValue.textContent = formatAngle(state.pitchDeg);
        rollValue.textContent = formatAngle(state.rollDeg);
        heightValue.textContent = formatHeight(state.cameraHeightM);
        aglValue.textContent = formatHeight(state.aglM);
        aglValue.title = state.aglM == null
            ? "Výška terénu pod kamerou ešte nie je v Cesium dostupná."
            : "Orientačná výška kamery nad aktuálne načítaným terénom.";

        updateHeadingRuler(state.headingDeg);
        updatePitchRuler(state.pitchDeg);

        Object.assign(lastState, {
            headingDeg: state.headingDeg,
            pitchDeg: state.pitchDeg,
            rollDeg: state.rollDeg,
            cameraHeightM: state.cameraHeightM,
            aglM: state.aglM
        });
    };

    const update = function () {
        if (!visible || !root || root.hidden) return;
        renderState(readCameraState());
    };

    const setVisible = function (value) {
        visible = Boolean(value);
        if (root) root.hidden = !visible;
        if (visibilityInput && visibilityInput.checked !== visible) {
            visibilityInput.checked = visible;
        }
        if (visible) update();
    };

    const bindViewer = function (viewerInstance) {
        if (!viewerInstance?.scene || !viewerInstance?.camera) return false;

        if (removePreRenderListener) {
            removePreRenderListener();
            removePreRenderListener = null;
        }

        activeViewer = viewerInstance;
        const remove = activeViewer.scene.preRender.addEventListener(update);
        removePreRenderListener = typeof remove === "function" ? remove : null;
        update();
        return true;
    };

    const install = function () {
        if (installed) return true;

        // Modul je v hlavnej aplikácii načítaný automatickým globom. Inštaluje
        // sa však iba na samostatnej testovacej stránke analýzy terénu.
        if (!document.getElementById("radiusInput") || !document.getElementById("cesiumContainer")) {
            return false;
        }

        const viewerInstance = resolveViewer();
        if (!viewerInstance) {
            if (retryCount < 60) {
                retryCount += 1;
                window.setTimeout(install, 100);
            }
            return false;
        }

        installed = true;
        createHud();
        installToggle();
        bindViewer(viewerInstance);
        setVisible(visibilityInput ? visibilityInput.checked : true);
        return true;
    };

    window.TerrainCameraHUD = {
        VERSION,
        install,
        bindViewer,
        setVisible,
        update,
        get visible() { return visible; },
        get viewer() { return activeViewer; }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", install, { once: true });
    } else {
        install();
    }
})();

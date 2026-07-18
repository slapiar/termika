(() => {
    "use strict";

    const state = {
        viewer: null,
        cloudCollection: null,
        skyEnabled: true,
        cloudsEnabled: true,
        instrumentsEnabled: true,
        instruments: null,
        postRenderRemove: null,
        lastScaleUpdate: 0,
        cloudRecords: []
    };

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

    function getViewer() {
        try {
            if (typeof viewer !== "undefined" && viewer?.scene) return viewer;
        } catch (_) {}
        if (window.viewer?.scene) return window.viewer;
        if (window.TermikaCC?.viewer?.scene) return window.TermikaCC.viewer;
        return null;
    }

    function setButtonState(id, active) {
        const button = document.getElementById(id);
        if (!button) return;
        button.classList.toggle("is-active", Boolean(active));
        button.setAttribute("aria-pressed", active ? "true" : "false");
    }

    function configureSky(enabled) {
        const activeViewer = state.viewer;
        if (!activeViewer) return;
        state.skyEnabled = Boolean(enabled);
        activeViewer.scene.globe.enableLighting = state.skyEnabled;
        activeViewer.scene.skyAtmosphere.show = state.skyEnabled;
        activeViewer.scene.sun.show = state.skyEnabled;
        activeViewer.scene.moon.show = state.skyEnabled;
        activeViewer.scene.light = state.skyEnabled ? new Cesium.SunLight() : new Cesium.DirectionalLight({
            direction: new Cesium.Cartesian3(0.2, 0.3, -1)
        });
        activeViewer.clock.shouldAnimate = true;
        setButtonState("quickSkyToggleButton", state.skyEnabled);
        activeViewer.scene.requestRender();
    }

    function ensureCloudCollection() {
        if (state.cloudCollection || !state.viewer) return state.cloudCollection;
        state.cloudCollection = state.viewer.scene.primitives.add(new Cesium.CloudCollection({ show: true }));
        return state.cloudCollection;
    }

    function cloudColor(record) {
        const opacity = clamp(finite(record.opacity, 0.88), 0.05, 1);
        const shade = clamp(finite(record.shade, 1), 0.45, 1.15);
        return new Cesium.Color(shade, shade, shade, opacity);
    }

    function addCloudRecord(record, index) {
        const collection = ensureCloudCollection();
        if (!collection) return;

        const lat = finite(record.lat);
        const lon = finite(record.lon);
        const base = Math.max(0, finite(record.baseAltitude, record.altitude ?? 1500));
        const top = Math.max(base + 50, finite(record.topAltitude, base + finite(record.height, 500)));
        const width = Math.max(80, finite(record.width, 900));
        const depth = Math.max(80, finite(record.depth, width * 0.7));
        const height = Math.max(50, top - base);
        const density = clamp(finite(record.density, 0.65), 0.05, 1);
        const development = clamp(finite(record.development, 0.5), 0, 1);
        const puffCount = Math.max(1, Math.min(12, Math.round(finite(record.puffs, 3 + development * 6))));
        const seed = Math.abs(Math.trunc(finite(record.seed, index * 7919 + 17)));

        for (let puffIndex = 0; puffIndex < puffCount; puffIndex += 1) {
            const phase = seed * 0.017 + puffIndex * 2.399963;
            const radial = puffIndex === 0 ? 0 : Math.sqrt(puffIndex / puffCount);
            const east = Math.cos(phase) * radial * width * 0.32;
            const north = Math.sin(phase) * radial * depth * 0.32;
            const up = base + height * (0.3 + 0.55 * (puffIndex / Math.max(1, puffCount - 1)));
            const latitudeOffset = north / 111320;
            const longitudeOffset = east / Math.max(1, 111320 * Math.cos(Cesium.Math.toRadians(lat)));
            const sizeFactor = puffIndex === 0 ? 1 : 0.55 + 0.35 * ((Math.sin(phase * 1.7) + 1) / 2);

            collection.add({
                position: Cesium.Cartesian3.fromDegrees(lon + longitudeOffset, lat + latitudeOffset, up),
                scale: new Cesium.Cartesian2(width * sizeFactor, depth * sizeFactor),
                maximumSize: new Cesium.Cartesian3(width, depth, height * (0.65 + development * 0.9)),
                color: cloudColor(record),
                brightness: clamp(finite(record.brightness, 1.02), 0, 1.5),
                slice: clamp(0.18 + density * 0.52, 0.05, 0.9)
            });
        }
    }

    function setClouds(records = []) {
        state.cloudRecords = Array.isArray(records) ? records.map(record => ({ ...record })) : [];
        const collection = ensureCloudCollection();
        if (!collection) return 0;
        collection.removeAll();
        state.cloudRecords.forEach(addCloudRecord);
        collection.show = state.cloudsEnabled;
        state.viewer.scene.requestRender();
        return collection.length;
    }

    function setCloudsEnabled(enabled) {
        state.cloudsEnabled = Boolean(enabled);
        const collection = ensureCloudCollection();
        if (collection) collection.show = state.cloudsEnabled;
        setButtonState("quickCloudToggleButton", state.cloudsEnabled);
        state.viewer?.scene.requestRender();
    }

    function createInstruments() {
        if (state.instruments || !state.viewer) return;
        const root = document.createElement("div");
        root.className = "termika-map-instruments";
        root.innerHTML = `
            <button type="button" class="termika-compass" title="Natočiť mapu na sever" aria-label="Natočiť mapu na sever">
                <span class="termika-compass-rose"></span>
            </button>
            <div class="termika-scale" aria-label="Mapová mierka">
                <div class="termika-scale-line"></div>
                <div class="termika-scale-label">—</div>
            </div>`;
        document.body.appendChild(root);

        root.querySelector(".termika-compass")?.addEventListener("click", () => {
            const camera = state.viewer.camera;
            camera.setView({
                orientation: {
                    heading: 0,
                    pitch: camera.pitch,
                    roll: 0
                }
            });
        });

        state.instruments = {
            root,
            rose: root.querySelector(".termika-compass-rose"),
            scale: root.querySelector(".termika-scale"),
            scaleLine: root.querySelector(".termika-scale-line"),
            scaleLabel: root.querySelector(".termika-scale-label")
        };

        state.postRenderRemove = state.viewer.scene.postRender.addEventListener(updateInstruments);
        updateInstruments();
    }

    function niceDistance(meters) {
        if (!Number.isFinite(meters) || meters <= 0) return null;
        const magnitude = 10 ** Math.floor(Math.log10(meters));
        const normalized = meters / magnitude;
        const nice = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
        return nice * magnitude;
    }

    function formatDistance(meters) {
        if (meters >= 1000) {
            const km = meters / 1000;
            return `${km >= 10 ? Math.round(km) : km.toFixed(1).replace(".0", "")} km`;
        }
        return `${Math.round(meters)} m`;
    }

    function updateScale() {
        const now = performance.now();
        if (now - state.lastScaleUpdate < 180) return;
        state.lastScaleUpdate = now;

        const scene = state.viewer.scene;
        const canvas = scene.canvas;
        const y = Math.max(0, canvas.clientHeight - 72);
        const centerX = canvas.clientWidth * 0.5;
        const samplePixels = 100;
        const leftRay = state.viewer.camera.getPickRay(new Cesium.Cartesian2(centerX - samplePixels / 2, y));
        const rightRay = state.viewer.camera.getPickRay(new Cesium.Cartesian2(centerX + samplePixels / 2, y));
        const left = leftRay ? scene.globe.pick(leftRay, scene) : null;
        const right = rightRay ? scene.globe.pick(rightRay, scene) : null;
        if (!left || !right) {
            state.instruments.scaleLabel.textContent = "—";
            return;
        }

        const leftCartographic = Cesium.Cartographic.fromCartesian(left);
        const rightCartographic = Cesium.Cartographic.fromCartesian(right);
        const geodesic = new Cesium.EllipsoidGeodesic(leftCartographic, rightCartographic);
        const sampleDistance = geodesic.surfaceDistance;
        const targetDistance = niceDistance(sampleDistance);
        if (!targetDistance) return;
        const pixelWidth = clamp(samplePixels * targetDistance / sampleDistance, 42, 150);
        state.instruments.scale.style.width = `${Math.round(pixelWidth + 16)}px`;
        state.instruments.scaleLine.style.width = `${Math.round(pixelWidth)}px`;
        state.instruments.scaleLabel.textContent = formatDistance(targetDistance);
    }

    function updateInstruments() {
        if (!state.instruments || !state.viewer) return;
        const headingDegrees = Cesium.Math.toDegrees(state.viewer.camera.heading || 0);
        state.instruments.rose.style.transform = `rotate(${-headingDegrees}deg)`;
        updateScale();
    }

    function setInstrumentsEnabled(enabled) {
        state.instrumentsEnabled = Boolean(enabled);
        createInstruments();
        if (state.instruments) state.instruments.root.hidden = !state.instrumentsEnabled;
        setButtonState("quickMapInstrumentsToggleButton", state.instrumentsEnabled);
    }

    function bindButtons() {
        document.getElementById("quickSkyToggleButton")?.addEventListener("click", () => configureSky(!state.skyEnabled));
        document.getElementById("quickCloudToggleButton")?.addEventListener("click", () => setCloudsEnabled(!state.cloudsEnabled));
        document.getElementById("quickMapInstrumentsToggleButton")?.addEventListener("click", () => setInstrumentsEnabled(!state.instrumentsEnabled));
    }

    function initialize(activeViewer) {
        if (state.viewer) return;
        state.viewer = activeViewer;
        configureSky(true);
        ensureCloudCollection();
        createInstruments();
        setCloudsEnabled(true);
        setInstrumentsEnabled(true);
        bindButtons();

        window.dispatchEvent(new CustomEvent("termika:sky-ready", {
            detail: { api: window.TermikaSkyTools }
        }));
    }

    window.TermikaSkyTools = Object.freeze({
        initialize,
        setClouds,
        updateClouds: setClouds,
        clearClouds: () => setClouds([]),
        setSkyEnabled: configureSky,
        setCloudsEnabled,
        setInstrumentsEnabled,
        getState: () => ({
            skyEnabled: state.skyEnabled,
            cloudsEnabled: state.cloudsEnabled,
            instrumentsEnabled: state.instrumentsEnabled,
            cloudRecordCount: state.cloudRecords.length,
            renderedCloudCount: state.cloudCollection?.length ?? 0,
            time: state.viewer ? Cesium.JulianDate.toIso8601(state.viewer.clock.currentTime) : null
        })
    });

    window.addEventListener("termika:cloud-field", event => {
        setClouds(event.detail?.clouds ?? event.detail ?? []);
    });

    const waitForViewer = window.setInterval(() => {
        const activeViewer = getViewer();
        if (!activeViewer) return;
        window.clearInterval(waitForViewer);
        initialize(activeViewer);
    }, 120);

    window.setTimeout(() => window.clearInterval(waitForViewer), 30000);
})();

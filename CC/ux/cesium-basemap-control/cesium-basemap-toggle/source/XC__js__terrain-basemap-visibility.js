// js/terrain-basemap-visibility.js
// TermikaXC – prepínanie základnej obrazovej mapy Cesium bez vypnutia 3D reliéfu.

(function () {
    if (window.TerrainBasemapVisibility) return;

    const VERSION = "1.0.0";
    const HIDDEN_GLOBE_COLOR = "#101417";

    let installed = false;
    let visible = true;
    let activeViewer = null;
    let visibilityInput = null;
    let retryCount = 0;
    let removeLayerAddedListener = null;
    let originalBaseColor = null;
    const savedLayerVisibility = new Map();

    const resolveViewer = function () {
        if (window.terrainAnalysisViewer?.scene && window.terrainAnalysisViewer?.imageryLayers) {
            return window.terrainAnalysisViewer;
        }

        try {
            if (typeof viewer !== "undefined" && viewer?.scene && viewer?.imageryLayers) {
                return viewer;
            }
        } catch (error) {
            // Viewer ešte nemusí byť pripravený.
        }

        return null;
    };

    const rememberAndHideLayer = function (layer) {
        if (!layer) return;
        if (!savedLayerVisibility.has(layer)) {
            savedLayerVisibility.set(layer, layer.show !== false);
        }
        layer.show = false;
    };

    const restoreLayer = function (layer) {
        if (!layer) return;
        layer.show = savedLayerVisibility.has(layer)
            ? savedLayerVisibility.get(layer)
            : true;
        savedLayerVisibility.delete(layer);
    };

    const apply = function () {
        if (!activeViewer?.imageryLayers) return false;

        const layers = activeViewer.imageryLayers;
        for (let index = 0; index < layers.length; index += 1) {
            const layer = layers.get(index);
            if (visible) restoreLayer(layer);
            else rememberAndHideLayer(layer);
        }

        const globe = activeViewer.scene?.globe;
        if (globe) {
            if (!originalBaseColor && globe.baseColor) {
                originalBaseColor = Cesium.Color.clone(globe.baseColor);
            }
            globe.baseColor = visible
                ? Cesium.Color.clone(originalBaseColor || Cesium.Color.BLACK)
                : Cesium.Color.fromCssColorString(HIDDEN_GLOBE_COLOR);
        }

        activeViewer.scene?.requestRender?.();
        return true;
    };

    const setVisible = function (value) {
        visible = Boolean(value);
        if (visibilityInput && visibilityInput.checked !== visible) {
            visibilityInput.checked = visible;
        }
        apply();
    };

    const bindViewer = function (viewerInstance) {
        if (!viewerInstance?.scene || !viewerInstance?.imageryLayers) return false;

        if (removeLayerAddedListener) {
            removeLayerAddedListener();
            removeLayerAddedListener = null;
        }

        activeViewer = viewerInstance;
        const globe = activeViewer.scene.globe;
        if (globe?.baseColor) originalBaseColor = Cesium.Color.clone(globe.baseColor);

        const remove = activeViewer.imageryLayers.layerAdded.addEventListener((layer) => {
            if (!visible) {
                rememberAndHideLayer(layer);
                activeViewer.scene?.requestRender?.();
            }
        });
        removeLayerAddedListener = typeof remove === "function" ? remove : null;
        apply();
        return true;
    };

    const installToggle = function () {
        visibilityInput = document.getElementById("cesiumBasemapVisible");
        if (!visibilityInput) {
            const contoursInput = document.getElementById("contoursVisible");
            const anchorLabel = contoursInput?.closest("label");
            if (!anchorLabel) return false;

            const label = document.createElement("label");
            visibilityInput = document.createElement("input");
            visibilityInput.id = "cesiumBasemapVisible";
            visibilityInput.type = "checkbox";
            visibilityInput.checked = visible;
            label.append(visibilityInput, document.createTextNode(" Zobraziť základnú mapu Cesium"));
            anchorLabel.insertAdjacentElement("afterend", label);
        }

        if (!visibilityInput.__terrainBasemapBound) {
            visibilityInput.addEventListener("change", () => setVisible(visibilityInput.checked));
            visibilityInput.__terrainBasemapBound = true;
        }
        return true;
    };

    const install = function () {
        if (installed) return true;
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
        installToggle();
        bindViewer(viewerInstance);
        setVisible(visibilityInput ? visibilityInput.checked : true);
        return true;
    };

    const destroy = function () {
        setVisible(true);
        if (removeLayerAddedListener) removeLayerAddedListener();
        removeLayerAddedListener = null;
        activeViewer = null;
        installed = false;
    };

    window.TerrainBasemapVisibility = {
        VERSION,
        install,
        bindViewer,
        setVisible,
        apply,
        destroy,
        get visible() { return visible; },
        get viewer() { return activeViewer; }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", install, { once: true });
    } else {
        install();
    }
})();
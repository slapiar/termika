(() => {
    'use strict';

    if (window.__termikaExplorerAnalysisBridgeLoaded) return;
    window.__termikaExplorerAnalysisBridgeLoaded = true;

    const STORAGE_KEY = 'termikaXC.explorer.analysisContext.v1';
    const MAX_CONTEXT_AGE_MS = 12 * 60 * 60 * 1000;
    const ANALYSIS_URL = 'analysis.php?from=explorer';
    const ROUTE_LAYER_NAME = 'Trať z Prieskumníka';

    const delay = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

    function finiteNumber(value, fallback = null) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function validCoordinate(point) {
        const lat = finiteNumber(point?.lat);
        const lon = finiteNumber(point?.lon);
        return lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    }

    function normalizePoint(point, index = 0) {
        if (!validCoordinate(point)) return null;
        return {
            lat: Number(point.lat),
            lon: Number(point.lon),
            name: String(point.name || `TP${index + 1}`).trim() || `TP${index + 1}`,
            radius: Math.max(0, finiteNumber(point.radius, 0))
        };
    }

    function routeCoordinatesFromContext(context) {
        const points = Array.isArray(context?.points)
            ? context.points.map(normalizePoint).filter(Boolean)
            : [];
        const route = [];
        const startCenter = context?.start?.enabled && validCoordinate(context.start.center)
            ? { lat: Number(context.start.center.lat), lon: Number(context.start.center.lon) }
            : null;

        if (startCenter && points.length) route.push(startCenter);
        points.forEach((point) => route.push({ lat: point.lat, lon: point.lon }));
        if (context?.task?.closed && points.length > 1) {
            route.push({ lat: points[0].lat, lon: points[0].lon });
        }
        return route;
    }

    function centerOfCoordinates(points) {
        const valid = points.filter(validCoordinate);
        if (!valid.length) return null;
        if (valid.length === 1) return { lat: Number(valid[0].lat), lon: Number(valid[0].lon) };

        try {
            if (typeof Cesium !== 'undefined') {
                const positions = valid.map((point) => Cesium.Cartesian3.fromDegrees(Number(point.lon), Number(point.lat), 0));
                const sphere = Cesium.BoundingSphere.fromPoints(positions);
                const cartographic = Cesium.Cartographic.fromCartesian(sphere.center);
                if (cartographic) {
                    return {
                        lat: Cesium.Math.toDegrees(cartographic.latitude),
                        lon: Cesium.Math.toDegrees(cartographic.longitude)
                    };
                }
            }
        } catch (error) {
            console.warn('Stred trate cez Cesium sa nepodarilo určiť, používam priemer:', error);
        }

        const sum = valid.reduce((accumulator, point) => ({
            lat: accumulator.lat + Number(point.lat),
            lon: accumulator.lon + Number(point.lon)
        }), { lat: 0, lon: 0 });
        return { lat: sum.lat / valid.length, lon: sum.lon / valid.length };
    }

    function centerOfExplorerView() {
        try {
            if (typeof viewer === 'undefined' || !viewer?.scene || typeof Cesium === 'undefined') return null;
            const canvas = viewer.scene.canvas;
            const screenCenter = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
            const ray = viewer.camera.getPickRay(screenCenter);
            let cartesian = ray ? viewer.scene.globe.pick(ray, viewer.scene) : null;
            if (!cartesian) {
                cartesian = viewer.camera.pickEllipsoid(screenCenter, viewer.scene.globe.ellipsoid);
            }
            const cartographic = cartesian
                ? Cesium.Cartographic.fromCartesian(cartesian)
                : viewer.camera.positionCartographic;
            if (!cartographic) return null;
            return {
                lat: Cesium.Math.toDegrees(cartographic.latitude),
                lon: Cesium.Math.toDegrees(cartographic.longitude)
            };
        } catch (error) {
            console.warn('Stred aktuálneho pohľadu sa nepodarilo odčítať:', error);
            return null;
        }
    }

    function explorerCameraHeight() {
        try {
            if (typeof viewer === 'undefined') return null;
            return finiteNumber(viewer?.camera?.positionCartographic?.height);
        } catch (_) {
            return null;
        }
    }

    function createExplorerContext() {
        if (typeof state === 'undefined' || typeof ui === 'undefined') return null;

        const points = Array.isArray(state.points)
            ? state.points.map(normalizePoint).filter(Boolean)
            : [];
        const startCenter = validCoordinate(state.start?.center)
            ? { lat: Number(state.start.center.lat), lon: Number(state.start.center.lon) }
            : null;
        const start = {
            enabled: Boolean(state.start?.enabled && startCenter),
            center: startCenter,
            length: Math.max(50, finiteNumber(state.start?.length, 1000)),
            altitude: Math.max(0, finiteNumber(state.start?.altitude, 0)),
            tolerance: Math.max(0, finiteNumber(state.start?.tolerance, 0)),
            courseMode: state.start?.courseMode === 'manual' ? 'manual' : 'first',
            manualHeading: ((finiteNumber(state.start?.manualHeading, 0) % 360) + 360) % 360
        };
        const task = {
            name: String(ui.taskName?.value || 'Trať z Prieskumníka').trim() || 'Trať z Prieskumníka',
            pilot: String(ui.pilotName?.value || '').trim(),
            date: String(ui.flightDate?.value || '').trim(),
            closed: Boolean(ui.closedTask?.checked)
        };
        const route = [];
        if (start.enabled && start.center && points.length) route.push(start.center);
        points.forEach((point) => route.push(point));
        if (task.closed && points.length > 1) route.push(points[0]);

        const center = route.length
            ? centerOfCoordinates(route)
            : (centerOfExplorerView() || { lat: 48.95, lon: 19.35 });

        return {
            version: 1,
            createdAt: Date.now(),
            source: 'explorer',
            center,
            cameraHeight: explorerCameraHeight(),
            task,
            points,
            start
        };
    }

    function saveContext(context) {
        const serialized = JSON.stringify(context);
        let saved = false;
        try {
            sessionStorage.setItem(STORAGE_KEY, serialized);
            saved = true;
        } catch (error) {
            console.warn('Kontext pre Analýzu sa nepodarilo uložiť do sessionStorage:', error);
        }
        try {
            localStorage.setItem(STORAGE_KEY, serialized);
            saved = true;
        } catch (error) {
            console.warn('Kontext pre Analýzu sa nepodarilo uložiť do localStorage:', error);
        }
        return saved;
    }

    function clearContext() {
        try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    }

    function readContext() {
        let serialized = null;
        try {
            serialized = sessionStorage.getItem(STORAGE_KEY);
        } catch (_) {}
        if (!serialized) {
            try {
                serialized = localStorage.getItem(STORAGE_KEY);
            } catch (_) {}
        }
        if (!serialized) return null;

        try {
            const context = JSON.parse(serialized);
            const createdAt = finiteNumber(context?.createdAt, 0);
            if (!createdAt || Date.now() - createdAt > MAX_CONTEXT_AGE_MS) return null;
            if (!validCoordinate(context?.center)) return null;
            return context;
        } catch (error) {
            console.warn('Kontext z Prieskumníka sa nepodarilo načítať:', error);
            return null;
        }
    }

    function installExplorerTransfer() {
        const button = document.querySelector('[data-explorer-route="terrain"]');
        if (!button || button.dataset.analysisBridgeBound === 'true') return false;
        button.dataset.analysisBridgeBound = 'true';
        button.title = 'Otvoriť Analýzu s aktuálnou traťou alebo stredom mapy';

        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            const context = createExplorerContext();
            const saved = context ? saveContext(context) : false;
            if (!saved && typeof setStatus === 'function') {
                setStatus('Analýzu otváram bez prenesenia kontextu; úložisko prehliadača nie je dostupné.', 'warn');
            }
            window.location.href = ANALYSIS_URL;
        }, true);
        return true;
    }

    function destinationPoint(origin, bearingDeg, distanceMeters) {
        const radius = 6371008.8;
        const angular = distanceMeters / radius;
        const bearing = Cesium.Math.toRadians(bearingDeg);
        const lat1 = Cesium.Math.toRadians(origin.lat);
        const lon1 = Cesium.Math.toRadians(origin.lon);
        const sinLat2 = Math.sin(lat1) * Math.cos(angular)
            + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing);
        const lat2 = Math.asin(Math.max(-1, Math.min(1, sinLat2)));
        const lon2 = lon1 + Math.atan2(
            Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
            Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2)
        );
        return {
            lat: Cesium.Math.toDegrees(lat2),
            lon: ((Cesium.Math.toDegrees(lon2) + 540) % 360) - 180
        };
    }

    function bearingDegrees(a, b) {
        const lat1 = Cesium.Math.toRadians(a.lat);
        const lat2 = Cesium.Math.toRadians(b.lat);
        const deltaLon = Cesium.Math.toRadians(b.lon - a.lon);
        const y = Math.sin(deltaLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2)
            - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
        return (Cesium.Math.toDegrees(Math.atan2(y, x)) + 360) % 360;
    }

    function addRoutePoint(dataSource, point, index) {
        const position = Cesium.Cartesian3.fromDegrees(point.lon, point.lat, 0);
        const label = `${index + 1}. ${point.name || `TP${index + 1}`}`;
        dataSource.entities.add({
            name: label,
            position,
            point: {
                pixelSize: 12,
                color: Cesium.Color.fromCssColorString('#35d8ff'),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            label: {
                text: label,
                font: '700 13px system-ui',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 4,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -23),
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });

        if (point.radius > 0) {
            dataSource.entities.add({
                name: `${label} – valec`,
                position,
                ellipse: {
                    semiMajorAxis: point.radius,
                    semiMinorAxis: point.radius,
                    material: Cesium.Color.fromCssColorString('#35d8ff').withAlpha(0.10),
                    outline: true,
                    outlineColor: Cesium.Color.fromCssColorString('#35d8ff').withAlpha(0.9),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                }
            });
        }
    }

    function addStartLine(dataSource, context) {
        const start = context?.start;
        const points = Array.isArray(context?.points) ? context.points.map(normalizePoint).filter(Boolean) : [];
        if (!start?.enabled || !validCoordinate(start.center)) return;

        let heading = finiteNumber(start.manualHeading, 0);
        if (start.courseMode !== 'manual' && points.length) {
            heading = bearingDegrees(start.center, points[0]);
        }
        heading = ((heading % 360) + 360) % 360;
        const halfLength = Math.max(25, finiteNumber(start.length, 1000) / 2);
        const altitude = Math.max(0, finiteNumber(start.altitude, 0));
        const left = destinationPoint(start.center, heading - 90, halfLength);
        const right = destinationPoint(start.center, heading + 90, halfLength);
        const linePositions = [
            Cesium.Cartesian3.fromDegrees(left.lon, left.lat, altitude),
            Cesium.Cartesian3.fromDegrees(right.lon, right.lat, altitude)
        ];

        dataSource.entities.add({
            name: 'Štartová páska z Prieskumníka',
            polyline: {
                positions: linePositions,
                width: 5,
                material: new Cesium.PolylineGlowMaterialProperty({
                    glowPower: 0.22,
                    color: Cesium.Color.fromCssColorString('#ffe16a')
                })
            }
        });
        dataSource.entities.add({
            name: 'Stred štartovej pásky',
            position: Cesium.Cartesian3.fromDegrees(start.center.lon, start.center.lat, altitude),
            point: {
                pixelSize: 11,
                color: Cesium.Color.fromCssColorString('#ffe16a'),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            },
            label: {
                text: `ŠTART · ${Math.round(altitude)} m AMSL · ±${Math.round(finiteNumber(start.tolerance, 0))} m`,
                font: '700 12px system-ui',
                fillColor: Cesium.Color.fromCssColorString('#fff4a6'),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 4,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -22),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });
    }

    async function renderExplorerRouteInAnalysis(context) {
        if (typeof viewer === 'undefined' || !viewer?.dataSources || typeof Cesium === 'undefined') return null;

        if (window.__explorerAnalysisRouteLayer) {
            try {
                viewer.dataSources.remove(window.__explorerAnalysisRouteLayer, true);
            } catch (_) {}
            window.__explorerAnalysisRouteLayer = null;
        }

        const points = Array.isArray(context?.points)
            ? context.points.map(normalizePoint).filter(Boolean)
            : [];
        const route = routeCoordinatesFromContext(context);
        const dataSource = new Cesium.CustomDataSource(ROUTE_LAYER_NAME);

        if (route.length >= 2) {
            dataSource.entities.add({
                name: ROUTE_LAYER_NAME,
                polyline: {
                    positions: route.map((point) => Cesium.Cartesian3.fromDegrees(point.lon, point.lat, 0)),
                    width: 5,
                    clampToGround: true,
                    material: new Cesium.PolylineGlowMaterialProperty({
                        glowPower: 0.18,
                        color: Cesium.Color.fromCssColorString('#35d8ff')
                    })
                }
            });
        }

        points.forEach((point, index) => addRoutePoint(dataSource, point, index));
        addStartLine(dataSource, context);
        await viewer.dataSources.add(dataSource);
        window.__explorerAnalysisRouteLayer = dataSource;
        return { dataSource, route, points };
    }

    function applyAnalysisCenter(context) {
        const center = { lat: Number(context.center.lat), lon: Number(context.center.lon) };
        selectedCenter = center;
        previewCenter = { ...center };
        if (typeof syncCenterUi === 'function') syncCenterUi(center);
        if (typeof selectedPoint !== 'undefined' && selectedPoint) {
            selectedPoint.position = Cesium.Cartesian3.fromDegrees(center.lon, center.lat, 0);
        }
        const sourceLabel = context.points?.length
            ? `Prieskumník · ${context.task?.name || 'plánovaná trať'}`
            : 'Stred mapy z Prieskumníka';
        if (typeof loadedIgcName !== 'undefined' && loadedIgcName) {
            loadedIgcName.textContent = sourceLabel;
            loadedIgcName.title = sourceLabel;
        }
        return center;
    }

    function focusAnalysisView(context, rendered) {
        const route = rendered?.route || [];
        if (route.length >= 2) {
            const positions = route.map((point) => Cesium.Cartesian3.fromDegrees(point.lon, point.lat, 0));
            const sphere = Cesium.BoundingSphere.fromPoints(positions);
            viewer.camera.flyToBoundingSphere(sphere, {
                duration: 1.8,
                offset: new Cesium.HeadingPitchRange(
                    0,
                    Cesium.Math.toRadians(-42),
                    Math.max(2600, sphere.radius * 2.75)
                )
            });
            return;
        }

        const center = context.center;
        const inheritedHeight = finiteNumber(context.cameraHeight, 9000);
        const height = Math.max(2200, Math.min(50000, inheritedHeight));
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(center.lon, center.lat, height),
            duration: 1.4
        });
    }

    async function installAnalysisContext() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('from') !== 'explorer') return false;
        const context = readContext();
        if (!context) return false;

        for (let attempt = 0; attempt < 100; attempt += 1) {
            try {
                if (typeof viewer !== 'undefined'
                    && viewer?.scene
                    && typeof selectedCenter !== 'undefined'
                    && typeof previewCenter !== 'undefined'
                    && typeof selectedPoint !== 'undefined') {
                    const center = applyAnalysisCenter(context);
                    const rendered = await renderExplorerRouteInAnalysis(context);
                    focusAnalysisView(context, rendered);
                    if (typeof setActiveNavSection === 'function') setActiveNavSection('analysis', false);
                    if (typeof toggleNavDrawer === 'function') toggleNavDrawer(false);
                    if (typeof logStatus === 'function') {
                        const pointCount = Array.isArray(context.points) ? context.points.length : 0;
                        logStatus(
                            pointCount
                                ? `Z Prieskumníka bola načítaná trať „${context.task?.name || 'bez názvu'}“ · ${pointCount} bodov · stred ${center.lat.toFixed(5)}, ${center.lon.toFixed(5)}.`
                                : `Z Prieskumníka bol prevzatý stred mapy ${center.lat.toFixed(5)}, ${center.lon.toFixed(5)}.`,
                            'success'
                        );
                    }
                    clearContext();
                    return true;
                }
            } catch (error) {
                console.error('Prenesenie Prieskumníka do Analýzy zlyhalo:', error);
                if (typeof logStatus === 'function') {
                    logStatus('Trať z Prieskumníka sa nepodarilo zobraziť: ' + (error?.message || String(error)), 'error');
                }
                return false;
            }
            await delay(100);
        }
        return false;
    }

    function initialize() {
        const isExplorer = Boolean(document.getElementById('explorerNavShell'));
        const isAnalysis = Boolean(document.getElementById('navShell'));
        if (isExplorer) installExplorerTransfer();
        if (isAnalysis) installAnalysisContext();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();

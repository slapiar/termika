(() => {
    'use strict';

    if (window.__termikaExplorerProfileFollowLoaded) return;
    window.__termikaExplorerProfileFollowLoaded = true;

    const STORAGE_KEY = 'termikaXC.explorer.profileMapFollow.v1';
    const section = document.querySelector('[data-explorer-panel="profile"]');
    const toolbar = section?.querySelector('.explorer-profile-toolbar');
    const profileCanvas = document.getElementById('explorerProfileCanvas');
    const bottomDock = document.getElementById('explorerProfileBottomDock');
    const dockButton = document.getElementById('explorerProfileDockToggle');

    if (!section || !toolbar || !profileCanvas || !bottomDock) return;
    if (document.getElementById('explorerProfileFollowToggle')) return;

    const followButton = document.createElement('button');
    followButton.id = 'explorerProfileFollowToggle';
    followButton.type = 'button';
    if (dockButton?.parentElement === toolbar) toolbar.insertBefore(followButton, dockButton);
    else toolbar.appendChild(followButton);

    let enabled = readSavedState();
    let lastCameraMoveAt = 0;
    let followFrame = 0;
    let pendingFollow = null;
    let manualSuspendUntil = 0;

    const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

    function readSavedState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved === null ? true : saved !== 'false';
        } catch (_) {
            return true;
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
        } catch (_) {
            // Nastavenie ostane platné aspoň do obnovenia stránky.
        }
    }

    function updateButton() {
        followButton.classList.toggle('is-active', enabled);
        followButton.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        followButton.textContent = enabled ? '◎ Sledovať mapou' : '○ Voľná mapa';
        followButton.title = enabled
            ? 'Mapa jemne sleduje guličku, až keď sa blíži k okraju alebo ju prekrýva panel'
            : 'Automatické sledovanie mapou je vypnuté';
    }

    function routeNodes() {
        if (typeof state === 'undefined' || typeof ui === 'undefined') return [];
        const nodes = [];

        if (state.start?.enabled && state.start?.center) {
            nodes.push({ lat: Number(state.start.center.lat), lon: Number(state.start.center.lon) });
        }
        state.points.forEach((point) => {
            nodes.push({ lat: Number(point.lat), lon: Number(point.lon) });
        });
        if (ui.closedTask?.checked && state.points.length > 1) {
            nodes.push({ lat: Number(state.points[0].lat), lon: Number(state.points[0].lon) });
        }

        return nodes.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
    }

    function routeGeometry() {
        if (typeof Cesium === 'undefined') return null;
        const nodes = routeNodes();
        if (nodes.length < 2) return null;

        const segments = [];
        let totalDistance = 0;
        for (let index = 1; index < nodes.length; index += 1) {
            const start = Cesium.Cartographic.fromDegrees(nodes[index - 1].lon, nodes[index - 1].lat);
            const end = Cesium.Cartographic.fromDegrees(nodes[index].lon, nodes[index].lat);
            const geodesic = new Cesium.EllipsoidGeodesic(start, end);
            const distance = Number(geodesic.surfaceDistance) || 0;
            if (!(distance > 0)) continue;
            segments.push({ geodesic, distance, startDistance: totalDistance });
            totalDistance += distance;
        }
        return totalDistance > 0 ? { segments, totalDistance } : null;
    }

    function positionAtDistance(geometry, distance) {
        const target = clamp(distance, 0, geometry.totalDistance);
        const segment = geometry.segments.find((candidate, index) => {
            const last = index === geometry.segments.length - 1;
            return target <= candidate.startDistance + candidate.distance || last;
        });
        if (!segment) return null;

        const localDistance = clamp(target - segment.startDistance, 0, segment.distance);
        return segment.geodesic.interpolateUsingFraction(
            segment.distance > 0 ? localDistance / segment.distance : 0
        );
    }

    function routeHeading(geometry, distance) {
        const delta = clamp(geometry.totalDistance * 0.012, 80, 1200);
        let before = positionAtDistance(geometry, distance - delta * 0.35);
        let after = positionAtDistance(geometry, distance + delta);
        if (distance + delta >= geometry.totalDistance) {
            before = positionAtDistance(geometry, distance - delta);
            after = positionAtDistance(geometry, distance);
        }
        if (!before || !after) return 0;

        const deltaLongitude = after.longitude - before.longitude;
        const y = Math.sin(deltaLongitude) * Math.cos(after.latitude);
        const x = Math.cos(before.latitude) * Math.sin(after.latitude)
            - Math.sin(before.latitude) * Math.cos(after.latitude) * Math.cos(deltaLongitude);
        return Math.atan2(y, x);
    }

    function terrainCartesian(cartographic, heightOffset = 24) {
        if (!cartographic || typeof viewer === 'undefined') return null;
        const terrainHeight = viewer.scene?.globe?.getHeight(cartographic);
        const height = Number.isFinite(terrainHeight) ? terrainHeight + heightOffset : heightOffset;
        return Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, height);
    }

    function projectToCanvas(cartesian) {
        const transforms = Cesium.SceneTransforms;
        const projector = transforms?.worldToWindowCoordinates || transforms?.wgs84ToWindowCoordinates;
        if (typeof projector !== 'function') return null;
        try {
            const projected = projector.call(transforms, viewer.scene, cartesian);
            return projected && Number.isFinite(projected.x) && Number.isFinite(projected.y)
                ? projected
                : null;
        } catch (_) {
            return null;
        }
    }

    function safeMapRect() {
        const sceneCanvas = viewer?.scene?.canvas;
        if (!sceneCanvas) return null;
        const canvasRect = sceneCanvas.getBoundingClientRect();
        let left = 26;
        let top = 22;
        let right = Math.max(66, canvasRect.width - 28);
        let bottom = Math.max(62, canvasRect.height - 28);

        if (!bottomDock.hidden) {
            const dockRect = bottomDock.getBoundingClientRect();
            bottom = Math.min(bottom, dockRect.top - canvasRect.top - 22);
        }

        const navShell = document.getElementById('explorerNavShell');
        const navBar = navShell?.querySelector('.explorer-nav-bar');
        if (navShell && navBar) {
            const navRect = navBar.getBoundingClientRect();
            const dock = navShell.dataset.dock || 'top';
            if (dock === 'top') top = Math.max(top, navRect.bottom - canvasRect.top + 18);
            if (dock === 'bottom') bottom = Math.min(bottom, navRect.top - canvasRect.top - 18);
            if (dock === 'left') left = Math.max(left, navRect.right - canvasRect.left + 18);
            if (dock === 'right') right = Math.min(right, navRect.left - canvasRect.left - 18);
        }

        return { left, top, right, bottom, canvasRect };
    }

    function isOccluded(screenPosition, canvasRect) {
        if (typeof document.elementsFromPoint !== 'function') return false;
        const elements = document.elementsFromPoint(
            canvasRect.left + screenPosition.x,
            canvasRect.top + screenPosition.y
        );
        const selector = [
            '#explorerProfileBottomDock',
            '#explorerNavShell .explorer-nav-bar',
            '#sidebar.explorer-nav-drawer.is-open',
            '#mapOverlay',
            '.cesium-viewer-toolbar',
            '.cesium-baseLayerPicker-dropDown',
            '.cesium-navigation-help'
        ].join(',');
        return elements.some((element) => Boolean(element.closest?.(selector)));
    }

    function needsCameraMove(cartographic) {
        const safe = safeMapRect();
        const projected = projectToCanvas(terrainCartesian(cartographic));
        if (!safe || !projected) return true;

        const outside = projected.x < safe.left
            || projected.x > safe.right
            || projected.y < safe.top
            || projected.y > safe.bottom;
        return outside || isOccluded(projected, safe.canvasRect);
    }

    function moveCamera(geometry, distance, cartographic) {
        if (!enabled || document.body.dataset.explorerProfilePlacement !== 'bottom') return;
        if (performance.now() < manualSuspendUntil) return;
        if (typeof viewer === 'undefined' || !viewer?.camera || typeof Cesium === 'undefined') return;
        if (!needsCameraMove(cartographic)) return;

        const now = performance.now();
        if (now - lastCameraMoveAt < 280) return;
        lastCameraMoveAt = now;

        const cameraHeight = Number(viewer.camera.positionCartographic?.height) || 5000;
        const maximumLookAhead = Math.min(5200, geometry.totalDistance * 0.08);
        const lookAhead = clamp(cameraHeight * 0.24, Math.min(180, maximumLookAhead), maximumLookAhead);
        const focus = positionAtDistance(
            geometry,
            Math.min(geometry.totalDistance, distance + Math.max(0, lookAhead))
        ) || cartographic;
        const focusCartesian = terrainCartesian(focus, 8);
        if (!focusCartesian) return;

        if (viewer.scene.mode === Cesium.SceneMode.SCENE3D) {
            const currentPitch = Number(viewer.camera.pitch);
            const pitch = Number.isFinite(currentPitch)
                ? clamp(currentPitch, Cesium.Math.toRadians(-82), Cesium.Math.toRadians(-28))
                : Cesium.Math.toRadians(-48);
            viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(focusCartesian, 1), {
                duration: 0.42,
                offset: new Cesium.HeadingPitchRange(
                    routeHeading(geometry, distance),
                    pitch,
                    clamp(cameraHeight * 1.08, 900, 120000)
                )
            });
        } else {
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromRadians(
                    focus.longitude,
                    focus.latitude,
                    clamp(cameraHeight, 900, 180000)
                ),
                duration: 0.36
            });
        }
    }

    function scheduleMove(geometry, distance, cartographic) {
        pendingFollow = { geometry, distance, cartographic };
        if (followFrame) return;
        followFrame = window.requestAnimationFrame(() => {
            followFrame = 0;
            const next = pendingFollow;
            pendingFollow = null;
            if (next) moveCamera(next.geometry, next.distance, next.cartographic);
        });
    }

    function handleProfilePointer(event) {
        if (!enabled || document.body.dataset.explorerProfilePlacement !== 'bottom') return;
        if (!document.getElementById('explorerProfileEmpty')?.hidden) return;
        const geometry = routeGeometry();
        if (!geometry) return;

        const rect = profileCanvas.getBoundingClientRect();
        const leftPadding = 58;
        const rightPadding = 18;
        const plotWidth = Math.max(1, rect.width - leftPadding - rightPadding);
        const x = clamp(event.clientX - rect.left, leftPadding, rect.width - rightPadding);
        const distance = ((x - leftPadding) / plotWidth) * geometry.totalDistance;
        const cartographic = positionAtDistance(geometry, distance);
        if (cartographic) scheduleMove(geometry, distance, cartographic);
    }

    followButton.addEventListener('click', () => {
        enabled = !enabled;
        saveState();
        updateButton();
        if (!enabled && followFrame) {
            window.cancelAnimationFrame(followFrame);
            followFrame = 0;
            pendingFollow = null;
        }
    });

    profileCanvas.addEventListener('pointermove', handleProfilePointer, { passive: true });
    profileCanvas.addEventListener('pointerleave', () => {
        pendingFollow = null;
    }, { passive: true });

    const sceneCanvas = typeof viewer !== 'undefined' ? viewer?.scene?.canvas : null;
    sceneCanvas?.addEventListener('pointerdown', () => {
        manualSuspendUntil = performance.now() + 1600;
    }, { passive: true });

    updateButton();
})();
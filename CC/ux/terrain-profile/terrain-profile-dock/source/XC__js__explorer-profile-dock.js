(() => {
    'use strict';

    const STORAGE_KEY = 'termikaXC.explorer.profilePlacement.v1';
    const section = document.querySelector('#sidebarScroll [data-explorer-panel="profile"]');
    const toolbar = section?.querySelector('.explorer-profile-toolbar');
    const canvas = document.getElementById('explorerProfileCanvas');
    const mapWrap = document.getElementById('mapWrap');
    const sidebarScroll = document.getElementById('sidebarScroll');

    if (!section || !toolbar || !canvas || !mapWrap || !sidebarScroll) return;
    if (document.getElementById('explorerProfileBottomDock')) return;

    const dockHost = document.createElement('aside');
    dockHost.id = 'explorerProfileBottomDock';
    dockHost.setAttribute('aria-label', 'Výškový profil trate pri spodnom okraji');
    dockHost.hidden = true;
    mapWrap.appendChild(dockHost);

    const dockButton = document.createElement('button');
    dockButton.id = 'explorerProfileDockToggle';
    dockButton.type = 'button';
    dockButton.textContent = '↓ Pripnúť dole';
    dockButton.title = 'Zobraziť profil súčasne s mapou pri spodnom okraji';
    toolbar.appendChild(dockButton);

    let docked = false;
    let mapMarker = null;

    function readSavedPlacement() {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'bottom' ? 'bottom' : 'drawer';
        } catch (error) {
            console.warn('Umiestnenie profilu sa nepodarilo načítať:', error);
            return 'drawer';
        }
    }

    function savePlacement(value) {
        try {
            localStorage.setItem(STORAGE_KEY, value);
        } catch (error) {
            console.warn('Umiestnenie profilu sa nepodarilo uložiť:', error);
        }
    }

    function updateDockOffset() {
        if (!docked) return;
        const navShell = document.getElementById('explorerNavShell');
        const navBar = navShell?.querySelector('.explorer-nav-bar');
        const isBottom = navShell?.dataset.dock === 'bottom';
        const offset = isBottom && navBar ? Math.ceil(navBar.getBoundingClientRect().height) : 0;
        dockHost.style.setProperty('--explorer-profile-bottom-offset', `${offset}px`);
    }

    function dispatchProfileEvent(name) {
        document.dispatchEvent(new CustomEvent(name, {
            detail: { panelId: 'profile', placement: docked ? 'bottom' : 'drawer' }
        }));
    }

    function profileTab() {
        return document.querySelector('[data-explorer-panel-target="profile"]');
    }

    function returnSectionToDrawer() {
        const exportSection = sidebarScroll.querySelector('[data-explorer-panel="export"]');
        if (exportSection) sidebarScroll.insertBefore(section, exportSection);
        else sidebarScroll.appendChild(section);
    }

    function applyPlacement(nextPlacement, { persist = true, openDrawer = true } = {}) {
        const nextDocked = nextPlacement === 'bottom';
        if (nextDocked === docked && section.parentElement === (nextDocked ? dockHost : sidebarScroll)) return;

        if (nextDocked) {
            docked = true;
            dockHost.appendChild(section);
            dockHost.hidden = false;
            document.body.dataset.explorerProfilePlacement = 'bottom';
            dockButton.textContent = '↑ Vrátiť do rolety';
            dockButton.title = 'Vrátiť výškový profil do navigačnej rolety';

            document.getElementById('explorerNavClose')?.click();
            window.requestAnimationFrame(() => {
                updateDockOffset();
                dispatchProfileEvent('termikaxc:explorer-panel-open');
                window.dispatchEvent(new Event('resize'));
            });
        } else {
            docked = false;
            dispatchProfileEvent('termikaxc:explorer-panel-close');
            returnSectionToDrawer();
            dockHost.hidden = true;
            delete document.body.dataset.explorerProfilePlacement;
            dockButton.textContent = '↓ Pripnúť dole';
            dockButton.title = 'Zobraziť profil súčasne s mapou pri spodnom okraji';
            hideMapMarker();

            if (openDrawer) {
                window.requestAnimationFrame(() => {
                    const tab = profileTab();
                    if (tab && tab.getAttribute('aria-selected') !== 'true') tab.click();
                    else dispatchProfileEvent('termikaxc:explorer-panel-open');
                    window.dispatchEvent(new Event('resize'));
                });
            }
        }

        if (persist) savePlacement(nextDocked ? 'bottom' : 'drawer');
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

        return nodes.filter((node) => Number.isFinite(node.lat) && Number.isFinite(node.lon));
    }

    function routeGeometry() {
        if (typeof Cesium === 'undefined') return null;
        const nodes = routeNodes();
        if (nodes.length < 2) return null;

        let totalDistance = 0;
        const segments = [];

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
        const target = Math.max(0, Math.min(geometry.totalDistance, distance));
        const segment = geometry.segments.find((candidate, index) => {
            const isLast = index === geometry.segments.length - 1;
            return target <= candidate.startDistance + candidate.distance || isLast;
        });
        if (!segment) return null;

        const localDistance = Math.max(0, Math.min(segment.distance, target - segment.startDistance));
        const fraction = segment.distance > 0 ? localDistance / segment.distance : 0;
        return segment.geodesic.interpolateUsingFraction(fraction);
    }

    function ensureMapMarker() {
        if (mapMarker) return mapMarker;
        if (typeof viewer === 'undefined' || !viewer?.entities || typeof Cesium === 'undefined') return null;

        mapMarker = viewer.entities.add({
            name: 'Poloha vo výškovom profile',
            show: false,
            position: Cesium.Cartesian3.ZERO,
            point: {
                pixelSize: 16,
                color: Cesium.Color.fromCssColorString('#ffad3b'),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 3,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        });
        return mapMarker;
    }

    function showMapMarker(cartographic) {
        const marker = ensureMapMarker();
        if (!marker || !cartographic) return;
        marker.position = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);
        marker.show = true;
        viewer.scene?.requestRender?.();
    }

    function hideMapMarker() {
        if (!mapMarker) return;
        mapMarker.show = false;
        if (typeof viewer !== 'undefined') viewer.scene?.requestRender?.();
    }

    function syncMarkerFromPointer(event) {
        if (!document.getElementById('explorerProfileEmpty')?.hidden) {
            hideMapMarker();
            return;
        }

        const geometry = routeGeometry();
        if (!geometry) {
            hideMapMarker();
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const leftPadding = 58;
        const rightPadding = 18;
        const plotWidth = Math.max(1, rect.width - leftPadding - rightPadding);
        const x = Math.max(leftPadding, Math.min(rect.width - rightPadding, event.clientX - rect.left));
        const distance = ((x - leftPadding) / plotWidth) * geometry.totalDistance;
        showMapMarker(positionAtDistance(geometry, distance));
    }

    dockButton.addEventListener('click', () => {
        applyPlacement(docked ? 'drawer' : 'bottom');
    });

    canvas.addEventListener('pointermove', syncMarkerFromPointer, { passive: true });
    canvas.addEventListener('pointerleave', hideMapMarker, { passive: true });
    canvas.addEventListener('pointercancel', hideMapMarker, { passive: true });

    const navShell = document.getElementById('explorerNavShell');
    if (navShell) {
        const dockObserver = new MutationObserver(updateDockOffset);
        dockObserver.observe(navShell, { attributes: true, attributeFilter: ['data-dock'] });
        if ('ResizeObserver' in window) {
            const resizeObserver = new ResizeObserver(updateDockOffset);
            const navBar = navShell.querySelector('.explorer-nav-bar');
            if (navBar) resizeObserver.observe(navBar);
        }
    }

    window.addEventListener('resize', updateDockOffset, { passive: true });

    applyPlacement(readSavedPlacement(), { persist: false, openDrawer: false });
})();

(() => {
    'use strict';

    const section = document.querySelector('#sidebarScroll [data-explorer-panel="profile"]');
    const canvas = document.getElementById('explorerProfileCanvas');
    const chartWrap = document.getElementById('explorerProfileChartWrap');
    const tooltip = document.getElementById('explorerProfileTooltip');
    const emptyState = document.getElementById('explorerProfileEmpty');
    const statusBox = document.getElementById('explorerProfileStatus');
    const sampleSelect = document.getElementById('explorerProfileSamples');
    const refreshButton = document.getElementById('explorerProfileRefresh');

    if (!section || !canvas || !chartWrap || !tooltip || !emptyState || !statusBox || !sampleSelect || !refreshButton) return;

    const stats = {
        distance: document.getElementById('profileDistance'),
        min: document.getElementById('profileMinHeight'),
        max: document.getElementById('profileMaxHeight'),
        ascent: document.getElementById('profileAscent'),
        descent: document.getElementById('profileDescent')
    };

    const numberFormat = new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 0 });
    const distanceFormat = new Intl.NumberFormat('sk-SK', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    let profileData = null;
    let active = false;
    let dirty = true;
    let hoverIndex = null;
    let requestSerial = 0;
    let debounceTimer = null;

    function setProfileStatus(message, kind = 'info') {
        statusBox.textContent = message;
        statusBox.dataset.kind = kind;
    }

    function resetStats() {
        Object.values(stats).forEach((node) => {
            if (node) node.textContent = '—';
        });
    }

    function routeNodes() {
        if (typeof state === 'undefined' || typeof ui === 'undefined') return [];

        const nodes = [];
        if (state.start?.enabled && state.start?.center) {
            nodes.push({
                lat: Number(state.start.center.lat),
                lon: Number(state.start.center.lon),
                label: 'ŠTART',
                kind: 'start'
            });
        }

        state.points.forEach((point, index) => {
            nodes.push({
                lat: Number(point.lat),
                lon: Number(point.lon),
                label: String(point.name || `TP${index + 1}`).trim() || `TP${index + 1}`,
                kind: 'point'
            });
        });

        if (ui.closedTask?.checked && state.points.length > 1) {
            nodes.push({
                lat: Number(state.points[0].lat),
                lon: Number(state.points[0].lon),
                label: 'CIEĽ',
                kind: 'finish'
            });
        }

        return nodes.filter((node) => Number.isFinite(node.lat) && Number.isFinite(node.lon));
    }

    function buildSamplingPlan(nodes, desiredSamples) {
        const segments = [];
        const markerDistances = [0];
        let totalDistance = 0;

        for (let index = 1; index < nodes.length; index += 1) {
            const start = Cesium.Cartographic.fromDegrees(nodes[index - 1].lon, nodes[index - 1].lat);
            const end = Cesium.Cartographic.fromDegrees(nodes[index].lon, nodes[index].lat);
            const geodesic = new Cesium.EllipsoidGeodesic(start, end);
            const distance = Number(geodesic.surfaceDistance) || 0;
            segments.push({ geodesic, distance, startDistance: totalDistance });
            totalDistance += distance;
            markerDistances.push(totalDistance);
        }

        if (!(totalDistance > 0)) throw new Error('Trať nemá merateľnú dĺžku.');

        const positions = [];
        const distances = [];

        segments.forEach((segment, segmentIndex) => {
            const proportional = Math.round(desiredSamples * segment.distance / totalDistance);
            const segmentSamples = Math.max(2, proportional + 1);

            for (let sampleIndex = 0; sampleIndex < segmentSamples; sampleIndex += 1) {
                if (segmentIndex > 0 && sampleIndex === 0) continue;
                const fraction = sampleIndex / (segmentSamples - 1);
                const interpolated = segment.geodesic.interpolateUsingFraction(fraction);
                positions.push(new Cesium.Cartographic(interpolated.longitude, interpolated.latitude, 0));
                distances.push(segment.startDistance + segment.distance * fraction);
            }
        });

        return {
            positions,
            distances,
            totalDistance,
            markers: nodes.map((node, index) => ({
                ...node,
                distance: markerDistances[index] || 0
            }))
        };
    }

    async function sampleTerrainHeights(positions) {
        let sampled = positions;
        let source = 'maximum';

        try {
            sampled = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, positions);
        } catch (mostDetailedError) {
            console.warn('Najdetailnejšie vzorkovanie terénu zlyhalo, skúšam pevnú úroveň:', mostDetailedError);
            source = 'fallback';
            try {
                sampled = await Cesium.sampleTerrain(viewer.terrainProvider, 12, positions);
            } catch (fallbackError) {
                console.warn('Vzorkovanie terénu zlyhalo, používam výšky dostupné v glóbuse:', fallbackError);
                source = 'globe';
                sampled = positions;
            }
        }

        return {
            source,
            heights: sampled.map((position) => {
                if (Number.isFinite(position.height)) return Number(position.height);
                const globeHeight = viewer.scene?.globe?.getHeight(position);
                return Number.isFinite(globeHeight) ? Number(globeHeight) : 0;
            })
        };
    }

    function calculateStats(samples) {
        const heights = samples.map((sample) => sample.height);
        let ascent = 0;
        let descent = 0;

        for (let index = 1; index < heights.length; index += 1) {
            const difference = heights[index] - heights[index - 1];
            if (difference > 0) ascent += difference;
            if (difference < 0) descent += Math.abs(difference);
        }

        return {
            min: Math.min(...heights),
            max: Math.max(...heights),
            ascent,
            descent
        };
    }

    function updateStats(data) {
        stats.distance.textContent = `${distanceFormat.format(data.totalDistance / 1000)} km`;
        stats.min.textContent = `${numberFormat.format(data.stats.min)} m`;
        stats.max.textContent = `${numberFormat.format(data.stats.max)} m`;
        stats.ascent.textContent = `≈ ${numberFormat.format(data.stats.ascent)} m`;
        stats.descent.textContent = `≈ ${numberFormat.format(data.stats.descent)} m`;
    }

    function colors() {
        const light = document.body.dataset.explorerTheme !== 'dark';
        return light ? {
            background: '#f8fbfc',
            grid: 'rgba(86, 112, 124, 0.22)',
            axis: '#536b77',
            terrainTop: 'rgba(180, 193, 199, 0.72)',
            terrainBottom: 'rgba(105, 123, 132, 0.28)',
            line: '#f28c28',
            marker: '#007f9f',
            start: '#b88600',
            text: '#17313e',
            hover: '#b55b00'
        } : {
            background: '#071018',
            grid: 'rgba(180, 210, 222, 0.16)',
            axis: '#91a8b6',
            terrainTop: 'rgba(142, 158, 166, 0.72)',
            terrainBottom: 'rgba(46, 60, 68, 0.34)',
            line: '#ffad3b',
            marker: '#35d8ff',
            start: '#ffe16a',
            text: '#edf7fb',
            hover: '#ffe16a'
        };
    }

    function canvasSize() {
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(320, rect.width || chartWrap.clientWidth || 320);
        const height = Math.max(260, rect.height || 330);
        const ratio = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));

        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        const context = canvas.getContext('2d');
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        return { context, width, height };
    }

    function profileBounds(data) {
        const heightRange = Math.max(1, data.stats.max - data.stats.min);
        const margin = Math.max(35, heightRange * 0.09);
        let minHeight = Math.floor((data.stats.min - margin) / 100) * 100;
        let maxHeight = Math.ceil((data.stats.max + margin) / 100) * 100;
        if (maxHeight - minHeight < 100) {
            minHeight -= 50;
            maxHeight += 50;
        }
        return { minHeight, maxHeight };
    }

    function drawProfile() {
        const { context: ctx, width, height } = canvasSize();
        const palette = colors();
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = palette.background;
        ctx.fillRect(0, 0, width, height);

        if (!profileData?.samples?.length) return;

        const padding = { left: 58, right: 18, top: 30, bottom: 38 };
        const plotWidth = Math.max(10, width - padding.left - padding.right);
        const plotHeight = Math.max(10, height - padding.top - padding.bottom);
        const { minHeight, maxHeight } = profileBounds(profileData);
        const heightSpan = maxHeight - minHeight;

        const xForDistance = (distance) => padding.left + (distance / profileData.totalDistance) * plotWidth;
        const yForHeight = (terrainHeight) => padding.top + ((maxHeight - terrainHeight) / heightSpan) * plotHeight;

        ctx.font = '10px system-ui, sans-serif';
        ctx.lineWidth = 1;
        ctx.strokeStyle = palette.grid;
        ctx.fillStyle = palette.axis;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const horizontalTicks = 5;
        for (let tick = 0; tick <= horizontalTicks; tick += 1) {
            const ratio = tick / horizontalTicks;
            const y = padding.top + ratio * plotHeight;
            const value = maxHeight - ratio * heightSpan;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.fillText(`${numberFormat.format(value)} m`, padding.left - 7, y);
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const verticalTicks = 6;
        for (let tick = 0; tick <= verticalTicks; tick += 1) {
            const ratio = tick / verticalTicks;
            const x = padding.left + ratio * plotWidth;
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + plotHeight);
            ctx.stroke();
            ctx.fillText(`${distanceFormat.format(profileData.totalDistance * ratio / 1000)} km`, x, padding.top + plotHeight + 9);
        }

        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotHeight);
        gradient.addColorStop(0, palette.terrainTop);
        gradient.addColorStop(1, palette.terrainBottom);

        ctx.beginPath();
        ctx.moveTo(xForDistance(profileData.samples[0].distance), padding.top + plotHeight);
        profileData.samples.forEach((sample) => ctx.lineTo(xForDistance(sample.distance), yForHeight(sample.height)));
        ctx.lineTo(xForDistance(profileData.samples[profileData.samples.length - 1].distance), padding.top + plotHeight);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        profileData.samples.forEach((sample, index) => {
            const x = xForDistance(sample.distance);
            const y = yForHeight(sample.height);
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = palette.line;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.font = '700 10px system-ui, sans-serif';
        profileData.markers.forEach((marker, index) => {
            const x = xForDistance(marker.distance);
            const nearest = nearestSample(marker.distance);
            const y = nearest ? yForHeight(nearest.height) : padding.top + plotHeight;
            const markerColor = marker.kind === 'start' || marker.kind === 'finish' ? palette.start : palette.marker;

            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = markerColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + plotHeight);
            ctx.stroke();
            ctx.restore();

            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = markerColor;
            ctx.fill();

            const label = marker.label.length > 13 ? `${marker.label.slice(0, 12)}…` : marker.label;
            ctx.fillStyle = palette.text;
            ctx.textAlign = index === 0 ? 'left' : (index === profileData.markers.length - 1 ? 'right' : 'center');
            ctx.textBaseline = 'top';
            const labelX = index === 0 ? x + 4 : (index === profileData.markers.length - 1 ? x - 4 : x);
            ctx.fillText(label, labelX, padding.top + 4 + (index % 2) * 12);
        });

        if (hoverIndex !== null && profileData.samples[hoverIndex]) {
            const sample = profileData.samples[hoverIndex];
            const x = xForDistance(sample.distance);
            const y = yForHeight(sample.height);
            ctx.strokeStyle = palette.hover;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + plotHeight);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = palette.hover;
            ctx.fill();
            ctx.strokeStyle = palette.background;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        profileData.layout = { padding, plotWidth, plotHeight, minHeight, maxHeight, width, height };
    }

    function nearestSample(distance) {
        if (!profileData?.samples?.length) return null;
        let low = 0;
        let high = profileData.samples.length - 1;

        while (low < high) {
            const middle = Math.floor((low + high) / 2);
            if (profileData.samples[middle].distance < distance) low = middle + 1;
            else high = middle;
        }

        const after = profileData.samples[low];
        const before = profileData.samples[Math.max(0, low - 1)];
        return Math.abs(before.distance - distance) <= Math.abs(after.distance - distance) ? before : after;
    }

    function nearestSampleIndex(distance) {
        const sample = nearestSample(distance);
        return sample ? profileData.samples.indexOf(sample) : null;
    }

    async function generateProfile() {
        const currentRequest = ++requestSerial;
        dirty = false;
        hoverIndex = null;
        tooltip.hidden = true;

        if (typeof viewer === 'undefined' || !viewer?.terrainProvider) {
            dirty = true;
            setProfileStatus('3D terén sa ešte načítava. Profil skúsim o chvíľu.', 'warn');
            if (active) window.setTimeout(() => active && generateProfile(), 600);
            return;
        }

        const nodes = routeNodes();
        if (nodes.length < 2) {
            profileData = null;
            resetStats();
            emptyState.hidden = false;
            setProfileStatus('Pre výškový profil treba aspoň dva body trasy alebo štart a jeden otočný bod.', 'warn');
            drawProfile();
            return;
        }

        refreshButton.disabled = true;
        refreshButton.textContent = 'Počítam…';
        emptyState.hidden = true;
        setProfileStatus('Vzorkujem terén pozdĺž celej trate…', 'info');

        try {
            const desiredSamples = Math.max(60, Math.min(600, Number(sampleSelect.value) || 240));
            const plan = buildSamplingPlan(nodes, desiredSamples);
            const terrain = await sampleTerrainHeights(plan.positions);
            if (currentRequest !== requestSerial) return;

            const samples = plan.distances.map((distance, index) => ({
                distance,
                height: terrain.heights[index] ?? 0
            }));
            const calculated = calculateStats(samples);

            profileData = {
                samples,
                markers: plan.markers,
                totalDistance: plan.totalDistance,
                stats: calculated
            };

            updateStats(profileData);
            emptyState.hidden = true;
            drawProfile();

            const sourceNote = terrain.source === 'maximum'
                ? 'najdetailnejší dostupný model terénu'
                : (terrain.source === 'fallback' ? 'náhradná úroveň modelu terénu' : 'výšky aktuálne načítané v glóbuse');
            setProfileStatus(`Profil je vypočítaný z ${samples.length} vzoriek · ${sourceNote}.`, terrain.source === 'maximum' ? 'ok' : 'warn');
        } catch (error) {
            if (currentRequest !== requestSerial) return;
            console.error('Výpočet výškového profilu zlyhal:', error);
            profileData = null;
            resetStats();
            emptyState.hidden = false;
            emptyState.textContent = 'Výškový profil sa nepodarilo vypočítať.';
            setProfileStatus(error?.message || 'Výškový profil sa nepodarilo vypočítať.', 'error');
            drawProfile();
        } finally {
            if (currentRequest === requestSerial) {
                refreshButton.disabled = false;
                refreshButton.textContent = '↻ Prepočítať';
            }
        }
    }

    function scheduleProfile() {
        dirty = true;
        window.clearTimeout(debounceTimer);
        if (!active) return;
        debounceTimer = window.setTimeout(generateProfile, 350);
    }

    function pointerPosition(event) {
        const rect = canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top, rect };
    }

    canvas.addEventListener('pointermove', (event) => {
        if (!profileData?.layout) return;
        const { x, rect } = pointerPosition(event);
        const { padding, plotWidth, minHeight, maxHeight, plotHeight } = profileData.layout;
        const plotX = Math.max(padding.left, Math.min(padding.left + plotWidth, x));
        const distance = ((plotX - padding.left) / plotWidth) * profileData.totalDistance;
        hoverIndex = nearestSampleIndex(distance);
        const sample = hoverIndex === null ? null : profileData.samples[hoverIndex];
        if (!sample) return;

        drawProfile();
        const y = padding.top + ((maxHeight - sample.height) / (maxHeight - minHeight)) * plotHeight;
        tooltip.innerHTML = `<strong>${numberFormat.format(sample.height)} m</strong><span>${distanceFormat.format(sample.distance / 1000)} km od začiatku</span>`;
        tooltip.style.left = `${Math.max(56, Math.min(rect.width - 56, plotX))}px`;
        tooltip.style.top = `${Math.max(34, y)}px`;
        tooltip.hidden = false;
    });

    canvas.addEventListener('pointerleave', () => {
        hoverIndex = null;
        tooltip.hidden = true;
        drawProfile();
    });

    refreshButton.addEventListener('click', generateProfile);
    sampleSelect.addEventListener('change', generateProfile);

    document.addEventListener('termikaxc:explorer-panel-open', (event) => {
        if (event.detail?.panelId !== 'profile') return;
        active = true;
        window.requestAnimationFrame(() => {
            if (dirty || !profileData) generateProfile();
            else drawProfile();
        });
    });

    document.addEventListener('termikaxc:explorer-panel-close', (event) => {
        if (event.detail?.panelId !== 'profile') return;
        active = false;
        tooltip.hidden = true;
    });

    const taskObserver = new MutationObserver(scheduleProfile);
    ['summaryPoints', 'summaryDistance', 'summaryStart', 'pointList'].forEach((id) => {
        const target = document.getElementById(id);
        if (target) taskObserver.observe(target, { childList: true, characterData: true, subtree: true });
    });

    const themeObserver = new MutationObserver(() => {
        if (active && profileData) drawProfile();
    });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-explorer-theme'] });

    if ('ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(() => {
            if (active && profileData) drawProfile();
        });
        resizeObserver.observe(chartWrap);
    } else {
        window.addEventListener('resize', () => active && profileData && drawProfile(), { passive: true });
    }
})();

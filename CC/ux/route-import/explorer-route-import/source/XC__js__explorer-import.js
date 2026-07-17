(() => {
    'use strict';

    const routeSection = document.querySelector('#sidebarScroll [data-explorer-panel="route"]');
    if (!routeSection || document.getElementById('explorerIgcInput')) return;

    const importBox = document.createElement('div');
    importBox.className = 'explorer-import-box';
    importBox.innerHTML = `
        <div class="explorer-import-copy">
            <strong>Uložená trať</strong>
            <span>Načítaj plánovací IGC z počítača, uprav body alebo štartovú pásku a exportuj novú verziu.</span>
        </div>
        <button id="explorerIgcLoadButton" type="button">↑ Načítať .IGC</button>
        <input id="explorerIgcInput" type="file" accept=".igc,text/plain,application/octet-stream" hidden>
    `;

    const firstActionRow = routeSection.querySelector('.button-row');
    if (firstActionRow) {
        routeSection.insertBefore(importBox, firstActionRow);
    } else {
        routeSection.appendChild(importBox);
    }

    const loadButton = document.getElementById('explorerIgcLoadButton');
    const fileInput = document.getElementById('explorerIgcInput');

    function parseCoordinateRecord(line) {
        const match = /^C(\d{2})(\d{5})([NS])(\d{3})(\d{5})([EW])(.*)$/i.exec(line);
        if (!match) return null;

        const latMinutes = Number(match[2]) / 1000;
        const lonMinutes = Number(match[5]) / 1000;
        if (latMinutes >= 60 || lonMinutes >= 60) return null;

        let lat = Number(match[1]) + latMinutes / 60;
        let lon = Number(match[4]) + lonMinutes / 60;
        if (match[3].toUpperCase() === 'S') lat *= -1;
        if (match[6].toUpperCase() === 'W') lon *= -1;

        if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
            return null;
        }

        return {
            lat,
            lon,
            name: String(match[7] || '').trim()
        };
    }

    function parseFields(text) {
        const result = {};
        String(text || '').split(';').forEach((part) => {
            const separator = part.indexOf('=');
            if (separator <= 0) return;
            const key = part.slice(0, separator).trim().toUpperCase();
            const value = part.slice(separator + 1).trim();
            if (key) result[key] = value;
        });
        return result;
    }

    function parseDate(line) {
        const match = /^HFDTE(?:DATE:)?(\d{2})(\d{2})(\d{2})/i.exec(line);
        if (!match) return '';
        const year = 2000 + Number(match[3]);
        return `${year}-${match[2]}-${match[1]}`;
    }

    function parseNumber(value, fallback, min, max) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.min(max, Math.max(min, number));
    }

    function samePosition(a, b, tolerance = 0.00002) {
        return Boolean(a && b)
            && Math.abs(Number(a.lat) - Number(b.lat)) <= tolerance
            && Math.abs(Number(a.lon) - Number(b.lon)) <= tolerance;
    }

    function headingBetween(a, b) {
        const toRad = (value) => value * Math.PI / 180;
        const toDeg = (value) => value * 180 / Math.PI;
        const lat1 = toRad(a.lat);
        const lat2 = toRad(b.lat);
        const dLon = toRad(b.lon - a.lon);
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2)
            - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        return (toDeg(Math.atan2(y, x)) + 360) % 360;
    }

    function angularDifference(a, b) {
        return Math.abs((((a - b) % 360) + 540) % 360 - 180);
    }

    function fallbackTaskName(filename) {
        return String(filename || 'Načítaná trať')
            .replace(/\.igc$/i, '')
            .replace(/[_-]+/g, ' ')
            .trim() || 'Načítaná trať';
    }

    function parseIgc(text, filename) {
        const lines = String(text || '')
            .replace(/^\uFEFF/, '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        if (!lines.length) throw new Error('Vybraný súbor je prázdny.');

        const coordinates = [];
        const pointMetadata = [];
        let taskName = '';
        let pilot = '';
        let flightDate = '';
        let closed = false;
        let startMetadata = null;

        lines.forEach((line) => {
            const coordinate = parseCoordinateRecord(line);
            if (coordinate) {
                const isNullPlaceholder = Math.abs(coordinate.lat) < 1e-10 && Math.abs(coordinate.lon) < 1e-10;
                if (!isNullPlaceholder) coordinates.push(coordinate);
                return;
            }

            if (/^LXCETASK:/i.test(line)) {
                taskName = line.slice(line.indexOf(':') + 1).trim();
                return;
            }

            if (/^HFPLTPILOTINCHARGE:/i.test(line)) {
                pilot = line.slice(line.indexOf(':') + 1).trim();
                return;
            }

            if (/^HFDTE/i.test(line) && !flightDate) {
                flightDate = parseDate(line);
                return;
            }

            if (/^LXCECLOSED:/i.test(line)) {
                closed = /^(YES|ANO|TRUE|1)$/i.test(line.slice(line.indexOf(':') + 1).trim());
                return;
            }

            const pointMatch = /^LXCETP:(\d+);(.*)$/i.exec(line);
            if (pointMatch) {
                const fields = parseFields(pointMatch[2]);
                pointMetadata.push({
                    order: Number(pointMatch[1]),
                    radius: parseNumber(fields.RADIUS_M, 400, 10, 100000),
                    name: fields.NAME || ''
                });
                return;
            }

            if (/^LXCESTART:/i.test(line)) {
                const fields = parseFields(line.slice(line.indexOf(':') + 1));
                const centerMatch = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(fields.CENTER || '');
                if (!centerMatch) return;

                const lat = Number(centerMatch[1]);
                const lon = Number(centerMatch[2]);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

                startMetadata = {
                    center: { lat, lon },
                    length: parseNumber(fields.LENGTH_M, 1000, 50, 50000),
                    altitude: parseNumber(fields.ALT_AMSL_M, 1200, 0, 10000),
                    tolerance: parseNumber(fields.TOLERANCE_M, 50, 0, 2000),
                    heading: parseNumber(fields.COURSE_DEG, 0, 0, 359.9),
                    courseMode: String(fields.COURSE_MODE || '').toLowerCase()
                };
            }
        });

        if (!coordinates.length) {
            throw new Error('IGC neobsahuje deklarované body trate v C-záznamoch.');
        }
        if (coordinates.length > 500) {
            throw new Error('IGC obsahuje neprimerane veľa deklarovaných bodov.');
        }

        pointMetadata.sort((a, b) => a.order - b.order);
        let routeCoordinates = coordinates.slice();

        if (startMetadata && routeCoordinates.length && samePosition(routeCoordinates[0], startMetadata.center)) {
            routeCoordinates.shift();
        }

        if (pointMetadata.length) {
            routeCoordinates = routeCoordinates.slice(0, pointMetadata.length);
        }

        if (routeCoordinates.length > 1 && samePosition(routeCoordinates[0], routeCoordinates[routeCoordinates.length - 1])) {
            routeCoordinates.pop();
            closed = true;
        }

        if (!routeCoordinates.length) {
            throw new Error('V IGC sa nepodarilo nájsť upraviteľné body trate.');
        }

        const points = routeCoordinates.map((coordinate, index) => {
            const metadata = pointMetadata[index] || {};
            return {
                id: cryptoId(),
                name: sanitizeName(metadata.name || coordinate.name, `TP${index + 1}`),
                lat: coordinate.lat,
                lon: coordinate.lon,
                radius: parseNumber(metadata.radius, numberValue(ui.defaultRadius, 400, 10, 100000), 10, 100000)
            };
        });

        let importedStart = {
            enabled: false,
            center: null,
            length: 1000,
            altitude: 1200,
            tolerance: 50,
            courseMode: 'first',
            manualHeading: 0
        };

        if (startMetadata) {
            const autoHeading = points.length ? headingBetween(startMetadata.center, points[0]) : startMetadata.heading;
            const explicitMode = startMetadata.courseMode === 'manual' || startMetadata.courseMode === 'first'
                ? startMetadata.courseMode
                : null;
            const inferredMode = angularDifference(startMetadata.heading, autoHeading) <= 1 ? 'first' : 'manual';

            importedStart = {
                enabled: true,
                center: startMetadata.center,
                length: startMetadata.length,
                altitude: startMetadata.altitude,
                tolerance: startMetadata.tolerance,
                courseMode: explicitMode || inferredMode,
                manualHeading: startMetadata.heading
            };
        }

        return {
            taskName: taskName || fallbackTaskName(filename),
            pilot,
            flightDate,
            closed,
            points,
            start: importedStart,
            isTermika: pointMetadata.length > 0 || Boolean(startMetadata) || lines.some((line) => /^AXCETASK/i.test(line))
        };
    }

    function applyImportedTask(imported, filename) {
        const hasCurrentTask = state.points.length > 0 || Boolean(state.start?.center);
        if (hasCurrentTask && !window.confirm('Načítaním IGC sa nahradí aktuálne rozpracovaná trať. Pokračovať?')) {
            return false;
        }

        setMode('idle');
        ui.taskName.value = imported.taskName;
        ui.pilotName.value = imported.pilot || '';
        if (imported.flightDate) ui.flightDate.value = imported.flightDate;
        ui.closedTask.checked = imported.closed;

        state.points = imported.points;
        state.start = imported.start;

        ui.startEnabled.checked = imported.start.enabled;
        ui.startLength.value = imported.start.length;
        ui.startAltitude.value = imported.start.altitude;
        ui.startTolerance.value = imported.start.tolerance;
        ui.startCourseMode.value = imported.start.courseMode;
        ui.startHeading.value = imported.start.manualHeading;

        if (imported.points[0]) ui.defaultRadius.value = Math.round(imported.points[0].radius || 400);

        refresh();
        const details = imported.isTermika
            ? 'obnovené aj rozšírené údaje TermikaXC'
            : 'načítané štandardné C-záznamy trate';
        setStatus(`IGC „${filename}“ bol načítaný: ${imported.points.length} bodov, ${details}.`, 'ok');

        document.getElementById('explorerNavClose')?.click();
        window.setTimeout(() => focusTask(), 120);
        return true;
    }

    loadButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        fileInput.value = '';
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setStatus('Vybraný IGC je väčší než 5 MB. Pre plánovaciu deklaráciu je to neobvyklé.', 'error');
            return;
        }

        loadButton.disabled = true;
        loadButton.textContent = 'Načítavam…';

        try {
            const text = await file.text();
            const imported = parseIgc(text, file.name);
            applyImportedTask(imported, file.name);
        } catch (error) {
            console.error('Načítanie IGC zlyhalo:', error);
            setStatus(error?.message || 'IGC súbor sa nepodarilo načítať.', 'error');
        } finally {
            loadButton.disabled = false;
            loadButton.textContent = '↑ Načítať .IGC';
        }
    });
})();

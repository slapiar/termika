(function () {
    'use strict';

    function toNumberInt(value) {
        const n = Number.parseInt(String(value || ''), 10);
        return Number.isFinite(n) ? n : NaN;
    }

    function isValidAltitude(value) {
        return Number.isFinite(value) && value > -1500 && value < 20000;
    }

    function parseHeader(lines) {
        let pilot = '';
        let site = '';
        let glider = '';
        let flightDate = '';

        for (const raw of lines) {
            const line = String(raw || '').trim();
            if (!line) continue;

            if (line.startsWith('HPPLTPILOT:')) pilot = line.slice(11).trim();
            if (line.startsWith('HFPLTPILOTINCHARGE:') && !pilot) pilot = line.slice(19).trim();
            if (line.startsWith('HOSITSite:')) site = line.slice(10).trim();
            if (line.startsWith('HPGTYGLIDERTYPE:')) glider = line.slice(16).trim();

            if (!flightDate) {
                const m = /^HFDTE(?:DATE:)?(\d{2})(\d{2})(\d{2})/i.exec(line);
                if (m) {
                    const year = 2000 + Number(m[3]);
                    flightDate = year + '-' + m[2] + '-' + m[1];
                }
            }
        }

        return { pilot, site, glider, flightDate };
    }

    function parseBRecord(line) {
        const row = String(line || '').trim();
        if (!row.startsWith('B') || row.length < 35) return null;

        const validity = String(row.charAt(24) || '').toUpperCase();
        if (validity === 'V') return null;

        const latDeg = toNumberInt(row.substring(7, 9));
        const latMinRaw = toNumberInt(row.substring(9, 14));
        const lonDeg = toNumberInt(row.substring(15, 18));
        const lonMinRaw = toNumberInt(row.substring(18, 23));
        const latHem = String(row.charAt(14) || '').toUpperCase();
        const lonHem = String(row.charAt(23) || '').toUpperCase();

        if (![latDeg, latMinRaw, lonDeg, lonMinRaw].every(Number.isFinite)) return null;
        const latMin = latMinRaw / 1000;
        const lonMin = lonMinRaw / 1000;
        if (latMin >= 60 || lonMin >= 60) return null;

        let lat = latDeg + latMin / 60;
        let lon = lonDeg + lonMin / 60;
        if (latHem === 'S') lat *= -1;
        if (lonHem === 'W') lon *= -1;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

        const pressureAlt = toNumberInt(row.substring(25, 30));
        const gpsAlt = toNumberInt(row.substring(30, 35));

        const hh = toNumberInt(row.substring(1, 3));
        const mm = toNumberInt(row.substring(3, 5));
        const ss = toNumberInt(row.substring(5, 7));
        if (![hh, mm, ss].every(Number.isFinite)) return null;
        if (hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) return null;
        const timeS = hh * 3600 + mm * 60 + ss;

        const altAmsl = isValidAltitude(gpsAlt)
            ? gpsAlt
            : (isValidAltitude(pressureAlt) ? pressureAlt : NaN);
        if (!Number.isFinite(altAmsl)) return null;

        return {
            lat,
            lon,
            alt_amsl: altAmsl,
            alt_amsl_raw: altAmsl,
            gps_alt_m: Number.isFinite(gpsAlt) ? gpsAlt : null,
            pressure_alt_m: Number.isFinite(pressureAlt) ? pressureAlt : null,
            terrain_height_m: null,
            agl_m: null,
            render_alt_m: altAmsl,
            vertical_correction_m: 0,
            time_s: timeS,
            vario_ms: 0
        };
    }

    function normalizeDeltaSeconds(previousTime, currentTime) {
        if (!Number.isFinite(previousTime) || !Number.isFinite(currentTime)) return NaN;
        let delta = currentTime - previousTime;
        if (delta < 0) {
            delta += 24 * 3600;
        }
        return delta;
    }

    function enrichTrackVario(points) {
        if (!Array.isArray(points) || points.length === 0) return [];

        let previousVario = 0;

        for (let i = 0; i < points.length; i += 1) {
            const current = points[i];
            if (!current || i === 0) {
                current.vario_ms = 0;
                continue;
            }

            const previous = points[i - 1];
            const deltaAlt = Number(current.alt_amsl) - Number(previous.alt_amsl);
            const deltaTime = normalizeDeltaSeconds(previous.time_s, current.time_s);

            if (!Number.isFinite(deltaAlt) || !Number.isFinite(deltaTime) || deltaTime <= 0 || deltaTime > 300) {
                current.vario_ms = previousVario;
                continue;
            }

            const rawVario = deltaAlt / deltaTime;
            const boundedVario = Math.max(-15, Math.min(15, rawVario));
            current.vario_ms = Number.isFinite(boundedVario) ? boundedVario : previousVario;
            previousVario = current.vario_ms;
        }

        if (points.length > 1) {
            points[0].vario_ms = points[1].vario_ms;
        }

        return points;
    }

    function getTrackCenter(points) {
        if (!Array.isArray(points) || points.length === 0) return null;
        const center = points[Math.floor(points.length / 2)] || points[0];
        if (!center) return null;
        return {
            lat: Number(center.lat),
            lon: Number(center.lon)
        };
    }

    function parseBTrack(text) {
        const rows = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/);
        const header = parseHeader(rows);
        const body = [];

        for (const row of rows) {
            const point = parseBRecord(row);
            if (point) body.push(point);
        }

        enrichTrackVario(body);

        return {
            body,
            pilot: header.pilot,
            site: header.site,
            glider: header.glider,
            flightDate: header.flightDate,
            center: getTrackCenter(body)
        };
    }

    window.TermikaUxIgcParser = {
        parseBRecord,
        parseBTrack
    };
})();

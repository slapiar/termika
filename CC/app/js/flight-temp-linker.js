// js/flight-temp-linker.js
// TermikaXC v2.6 - prepája dátum letu (z IGC) s výberom/stiahnutím TEMP profilov podľa dosahu trate.
//
// Pravidlá (viď postupy/WIND-noty-v1.md): meteorologické hodnoty sa nesmú hádať ani nahrádzať
// vymyslenými fallback údajmi. Preto každý priradený TEMP profil nesie pôvod (source), deň
// platnosti (dayUtc) a príznak isMismatched, ak reálne nesedí s dátumom letu.
//
// Stratégia výberu TEMP pre bod trate:
//   1. Ak je let "čerstvý" (do FRESH_DAYS_THRESHOLD dní), skús živé Windy dáta.
//   2. Inak hľadaj v GENauto archíve (temp_profile_events) najbližší STARŠÍ záznam v dosahu REACH_KM.
//   3. Ak nič vhodné nie je, použi živé Windy dáta ako núdzový fallback, jasne označené ako
//      nezodpovedajúce dátumu letu (isMismatched = true).
//
// Dosah (REACH_KM) sa následne overuje voči celej trati letu: ak je časť trate mimo dosahu
// všetkých pripojených profilov, automaticky sa dotiahne ďalší profil pre najhoršie pokrytý bod.
(function () {
    'use strict';

    const REACH_KM = 100;
    const FRESH_DAYS_THRESHOLD = 2;
    const MAX_PROFILES = 6;
    const PALETTE = ['#70e8ff', '#ffb300', '#8bd450', '#ff6b9d', '#c792ea', '#ff8a65'];

    const state = {
        flightDate: null,
        route: [],
        profiles: [],
        reachEntities: [],
        reachVisible: false
    };

    function haversineKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function todayUtcDay() {
        return new Date().toISOString().slice(0, 10);
    }

    function dayDiffDays(dayA, dayB) {
        const a = Date.parse(dayA + 'T00:00:00Z');
        const b = Date.parse(dayB + 'T00:00:00Z');
        if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
        return Math.round((a - b) / 86400000);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function dirSpeedToUv(dirDeg, speedKts) {
        const speedMs = Number(speedKts) * 0.514444;
        const rad = (Number(dirDeg) * Math.PI) / 180;
        return { u: -Math.sin(rad) * speedMs, v: -Math.cos(rad) * speedMs };
    }

    function uvToDirSpeed(u, v) {
        const speedMs = Math.hypot(u, v);
        const speedKts = speedMs * 1.9438444924406;
        const dirDeg = ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360;
        return { w_dir_deg: dirDeg, w_speed_kts: speedKts };
    }

    async function genAutoRequest(action, payload) {
        const response = await fetch('genauto.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...payload })
        });

        let data = null;
        try {
            data = await response.json();
        } catch (_) {
            throw new Error('GENauto: neplatná odpoveď servera.');
        }

        if (!response.ok || data?.status !== 'success') {
            throw new Error(String(data?.message || 'GENauto: operácia zlyhala.'));
        }

        return data;
    }

    async function fetchTempProfileByHash(tempHash) {
        const response = await fetch('genauto.php?action=getTempProfile&temp_hash=' + encodeURIComponent(tempHash) + '&v=' + Date.now(), { cache: 'no-store' });
        const data = await response.json().catch(() => null);
        if (!response.ok || data?.status !== 'success' || !Array.isArray(data.profile)) {
            throw new Error(String(data?.message || 'GENauto: TEMP profil sa nepodarilo načítať podľa hash.'));
        }
        return data.profile;
    }

    async function saveLiveProfile(point, profile) {
        try {
            await genAutoRequest('saveTempProfile', {
                center: { lat: point.lat, lon: point.lon },
                manual_save: false,
                temp_profile: profile,
                temp_source: { sourceLabel: 'FlightTempLinker (Windy live fetch)', autoSaved: true }
            });
        } catch (error) {
            console.warn('[FlightTempLinker] TEMP sa nepodarilo uložiť do archívu:', error?.message || error);
        }
    }

    function buildWindySettings(overrides) {
        const template = (overrides && overrides.windyTempUrl) || 'windy-temp-proxy.php?lat=${lat}&lon=${lon}';
        return { windyTempUrl: template, windyTempUrlTemplate: template };
    }

    async function fetchLiveWindyProfile(point, overrides) {
        if (!window.WindTempLoader?.loadWindyProfile) {
            throw new Error('WindTempLoader nie je dostupný pre živé Windy dáta.');
        }
        return await window.WindTempLoader.loadWindyProfile(point, buildWindySettings(overrides));
    }

    async function selectProfileForPoint(point, flightDayUtc, settingsOverrides) {
        const todayDay = todayUtcDay();
        const daysSinceFlight = dayDiffDays(todayDay, flightDayUtc);
        const isFreshFlight = daysSinceFlight !== null && daysSinceFlight <= FRESH_DAYS_THRESHOLD && daysSinceFlight >= -1;

        if (isFreshFlight) {
            try {
                const profile = await fetchLiveWindyProfile(point, settingsOverrides);
                saveLiveProfile(point, profile);
                return {
                    lat: point.lat,
                    lon: point.lon,
                    profile,
                    dayUtc: todayDay,
                    source: 'windy-live',
                    isMismatched: false,
                    note: 'Aktuálna predpoveď Windy (let je čerstvý, do ' + FRESH_DAYS_THRESHOLD + ' dní).'
                };
            } catch (error) {
                console.warn('[FlightTempLinker] Živé Windy TEMP zlyhalo, skúšam archív:', error?.message || error);
            }
        }

        try {
            const found = await genAutoRequest('findTempNear', {
                center: { lat: point.lat, lon: point.lon },
                radius_km: REACH_KM,
                target_day_utc: flightDayUtc,
                limit: 1
            });
            const best = Array.isArray(found.candidates) ? found.candidates[0] : null;
            if (best) {
                const profile = await fetchTempProfileByHash(best.temp_hash);
                return {
                    lat: point.lat,
                    lon: point.lon,
                    profile,
                    dayUtc: best.day_utc,
                    source: 'archive-nearest-older',
                    isMismatched: best.day_diff_days !== 0,
                    distanceKm: best.distance_km,
                    dayDiffDays: best.day_diff_days,
                    note: 'Najbližší starší uložený TEMP (' + Math.abs(best.day_diff_days) + ' dní pred letom, ' + best.distance_km.toFixed(1) + ' km od bodu).'
                };
            }
        } catch (error) {
            console.warn('[FlightTempLinker] Vyhľadanie v archíve zlyhalo:', error?.message || error);
        }

        const profile = await fetchLiveWindyProfile(point, settingsOverrides);
        saveLiveProfile(point, profile);
        return {
            lat: point.lat,
            lon: point.lon,
            profile,
            dayUtc: todayDay,
            source: 'windy-live-fallback',
            isMismatched: true,
            note: 'POZOR: nenašiel sa archívny TEMP pre dátum letu ani v dosahu ' + REACH_KM + ' km – použitá je AKTUÁLNA predpoveď Windy, ktorá nezodpovedá dátumu letu.'
        };
    }

    function findWorstCoveredPoint(route, profiles) {
        let worstPoint = null;
        let worstDistance = -1;
        const step = Math.max(1, Math.floor(route.length / 400));

        for (let i = 0; i < route.length; i += step) {
            const p = route[i];
            const lat = Number(p?.lat);
            const lon = Number(p?.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

            let minDist = Infinity;
            profiles.forEach((profile) => {
                const d = haversineKm(lat, lon, profile.lat, profile.lon);
                if (d < minDist) minDist = d;
            });

            if (minDist > worstDistance) {
                worstDistance = minDist;
                worstPoint = { lat, lon };
            }
        }

        return { point: worstPoint, distanceKm: worstDistance };
    }

    async function handleIgcLoaded({ flightDate, route, viewer, settings }) {
        if (!Array.isArray(route) || route.length === 0) {
            throw new Error('Trať letu je prázdna, TEMP nemožno priradiť.');
        }

        const flightDayUtc = /^\d{4}-\d{2}-\d{2}$/.test(String(flightDate || ''))
            ? String(flightDate)
            : todayUtcDay();

        state.flightDate = flightDayUtc;
        state.route = route;
        state.profiles = [];
        clearReachEntities();

        const startLat = Number(route[0].lat);
        const startLon = Number(route[0].lon);
        if (!Number.isFinite(startLat) || !Number.isFinite(startLon)) {
            throw new Error('Miesto štartu z IGC nemá platné súradnice.');
        }
        const startPoint = { lat: startLat, lon: startLon };

        window.logStatus?.('TEMP podľa letu (' + flightDayUtc + '): vyhľadávam profil pre miesto štartu ' + startLat.toFixed(4) + ', ' + startLon.toFixed(4) + '...', 'info');

        let firstProfile;
        try {
            firstProfile = await selectProfileForPoint(startPoint, flightDayUtc, settings);
        } catch (error) {
            throw new Error('Nepodarilo sa získať TEMP pre miesto štartu: ' + (error?.message || String(error)));
        }
        state.profiles.push(firstProfile);
        window.logStatus?.('TEMP #1 (' + firstProfile.source + '): ' + firstProfile.note, firstProfile.isMismatched ? 'warning' : 'success');

        for (let iteration = 0; iteration < MAX_PROFILES - 1; iteration += 1) {
            const worst = findWorstCoveredPoint(route, state.profiles);
            if (!worst.point || worst.distanceKm <= REACH_KM) break;

            window.logStatus?.('Časť trate je ' + worst.distanceKm.toFixed(1) + ' km mimo dosahu existujúcich TEMP – dopĺňam ďalší profil...', 'info');
            try {
                const extraProfile = await selectProfileForPoint(worst.point, flightDayUtc, settings);
                state.profiles.push(extraProfile);
                window.logStatus?.('TEMP #' + state.profiles.length + ' (' + extraProfile.source + '): ' + extraProfile.note, extraProfile.isMismatched ? 'warning' : 'success');
            } catch (error) {
                window.logStatus?.('Doplnkový TEMP sa nepodarilo získať: ' + (error?.message || String(error)), 'error');
                break;
            }
        }

        if (state.reachVisible && viewer) {
            renderReachEntities(viewer);
        }

        window.logStatus?.('TEMP podľa IGC dokončené: pripojených profilov = ' + state.profiles.length + '.', 'success');
    }

    function clearReachEntities() {
        state.reachEntities.forEach((entry) => {
            entry.viewer.entities.remove(entry.entity);
        });
        state.reachEntities = [];
    }

    function renderReachEntities(viewer) {
        clearReachEntities();
        if (!viewer || typeof Cesium === 'undefined') return;

        state.profiles.forEach((profile, index) => {
            const color = Cesium.Color.fromCssColorString(PALETTE[index % PALETTE.length]);
            const entity = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(profile.lon, profile.lat),
                ellipse: {
                    semiMinorAxis: REACH_KM * 1000,
                    semiMajorAxis: REACH_KM * 1000,
                    material: color.withAlpha(0.10),
                    outline: true,
                    outlineColor: color,
                    outlineWidth: 2,
                    height: 0
                },
                label: {
                    text: 'TEMP #' + (index + 1) + (profile.isMismatched ? ' ⚠' : '') + '\n' + String(profile.dayUtc || ''),
                    font: '12px sans-serif',
                    fillColor: color,
                    pixelOffset: new Cesium.Cartesian2(0, -18),
                    showBackground: true,
                    backgroundColor: Cesium.Color.BLACK.withAlpha(0.55)
                },
                point: {
                    pixelSize: 8,
                    color
                }
            });
            state.reachEntities.push({ viewer, entity });
        });
    }

    function toggleReachOverlay(viewer) {
        state.reachVisible = !state.reachVisible;
        if (state.reachVisible) {
            renderReachEntities(viewer);
        } else {
            clearReachEntities();
        }
        return state.reachVisible;
    }

    function sampleProfileAtHeight(profile, z) {
        if (!Array.isArray(profile) || profile.length === 0) return null;
        if (z <= profile[0].z_m) {
            const uv = dirSpeedToUv(profile[0].w_dir_deg, profile[0].w_speed_kts);
            return { p_hpa: profile[0].p_hpa, T_c: profile[0].T_c, Td_c: profile[0].Td_c, u: uv.u, v: uv.v };
        }
        const last = profile[profile.length - 1];
        if (z >= last.z_m) {
            const uv = dirSpeedToUv(last.w_dir_deg, last.w_speed_kts);
            return { p_hpa: last.p_hpa, T_c: last.T_c, Td_c: last.Td_c, u: uv.u, v: uv.v };
        }

        for (let i = 0; i < profile.length - 1; i += 1) {
            const a = profile[i];
            const b = profile[i + 1];
            if (z >= a.z_m && z <= b.z_m) {
                const span = b.z_m - a.z_m;
                const t = span > 1e-6 ? (z - a.z_m) / span : 0;
                const uvA = dirSpeedToUv(a.w_dir_deg, a.w_speed_kts);
                const uvB = dirSpeedToUv(b.w_dir_deg, b.w_speed_kts);
                return {
                    p_hpa: lerp(a.p_hpa, b.p_hpa, t),
                    T_c: lerp(a.T_c, b.T_c, t),
                    Td_c: lerp(a.Td_c, b.Td_c, t),
                    u: lerp(uvA.u, uvB.u, t),
                    v: lerp(uvA.v, uvB.v, t)
                };
            }
        }
        return null;
    }

    // Priestorová interpolácia TEMP pre ľubovoľný bod trate: IDW (inverse distance weighting, power=2)
    // z pripojených profilov, previazaná na spoločnú množinu výšok. Výsledok nesie confidence
    // a provenance podľa postupy/WIND-noty-v1.md (žiadne tiché nahrádzanie/hádanie hodnôt).
    function interpolateAt(lat, lon) {
        if (!state.profiles.length) return null;

        const weighted = state.profiles.map((p) => {
            const distanceKm = haversineKm(lat, lon, p.lat, p.lon);
            const weight = 1 / Math.pow(Math.max(distanceKm, 0.25), 2);
            return { profile: p, distanceKm, weight };
        });

        const heights = new Set();
        weighted.forEach(({ profile }) => {
            (profile.profile || []).forEach((row) => heights.add(row.z_m));
        });
        const sortedHeights = Array.from(heights).sort((a, b) => a - b);
        if (!sortedHeights.length) return null;

        const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
        const nearest = weighted.reduce((min, w) => (w.distanceKm < min.distanceKm ? w : min), weighted[0]);

        const blended = sortedHeights.map((z) => {
            let pSum = 0, tSum = 0, tdSum = 0, uSum = 0, vSum = 0;
            weighted.forEach(({ profile, weight }) => {
                const sample = sampleProfileAtHeight(profile.profile, z);
                if (!sample) return;
                pSum += sample.p_hpa * weight;
                tSum += sample.T_c * weight;
                tdSum += sample.Td_c * weight;
                uSum += sample.u * weight;
                vSum += sample.v * weight;
            });
            const dirSpeed = uvToDirSpeed(uSum / totalWeight, vSum / totalWeight);
            return {
                z_m: z,
                p_hpa: pSum / totalWeight,
                T_c: tSum / totalWeight,
                Td_c: tdSum / totalWeight,
                w_dir_deg: dirSpeed.w_dir_deg,
                w_speed_kts: dirSpeed.w_speed_kts
            };
        });

        let confidence = 'low';
        if (nearest.distanceKm <= 25) confidence = 'high';
        else if (nearest.distanceKm <= REACH_KM) confidence = 'medium';
        if (state.profiles.some((p) => p.isMismatched)) confidence = 'low';

        return {
            profile: blended,
            confidence,
            contributingProfiles: weighted.map((w) => ({
                lat: w.profile.lat,
                lon: w.profile.lon,
                distanceKm: w.distanceKm,
                weight: w.weight / totalWeight,
                source: w.profile.source,
                dayUtc: w.profile.dayUtc,
                isMismatched: w.profile.isMismatched
            })),
            provenance: {
                flightDate: state.flightDate,
                generatedAtIso: new Date().toISOString(),
                method: 'inverse-distance-weighted (power=2)'
            }
        };
    }

    window.FlightTempLinker = {
        VERSION: '1.0.0',
        REACH_KM,
        handleIgcLoaded,
        toggleReachOverlay,
        interpolateAt,
        getActiveProfiles: () => state.profiles.slice(),
        getFlightDate: () => state.flightDate
    };
})();

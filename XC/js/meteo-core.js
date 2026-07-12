// js/meteo-core.js
// Termodynamické jadro TEMP profilu, LCL a pracovného modelu termiky.
const MeteoCore = {
    g: 9.80665,
    R: 287.05,
    Rv: 461.5,
    Cp: 1005.0,
    epsilon: 0.622,
    Lv: 2501000.0,
    METERS_PER_DEGREE: 111111.0,

    getSaturationVaporPressurePa: function (T_c) {
        return 611.2 * Math.exp((17.67 * T_c) / (T_c + 243.5));
    },

    getMiesaciPomer: function (T_c, p_hpa) {
        const e = this.getSaturationVaporPressurePa(T_c);
        const pPa = p_hpa * 100;
        return this.epsilon * (e / Math.max(1, pPa - e));
    },

    getMiesaciPomerZRosenhoBodu: function (Td_c, p_hpa) {
        const e = this.getSaturationVaporPressurePa(Td_c);
        const pPa = p_hpa * 100;
        return this.epsilon * (e / Math.max(1, pPa - e));
    },

    getVirtualnaTeplotaK: function (T_c, w_mix) {
        const T_k = T_c + 273.15;
        return T_k * (1.0 + 0.608 * w_mix);
    },

    interpolujVyskuPreTlak: function (profil, pressureHpa) {
        if (!Array.isArray(profil) || profil.length === 0 || !Number.isFinite(pressureHpa)) return null;
        const sorted = profil.slice().sort((a, b) => b.p_hpa - a.p_hpa);

        if (pressureHpa >= sorted[0].p_hpa) return sorted[0].z_m;
        if (pressureHpa <= sorted[sorted.length - 1].p_hpa) return sorted[sorted.length - 1].z_m;

        for (let i = 0; i < sorted.length - 1; i += 1) {
            const lower = sorted[i];
            const upper = sorted[i + 1];
            if (pressureHpa <= lower.p_hpa && pressureHpa >= upper.p_hpa) {
                const logP = Math.log(pressureHpa);
                const fraction = (logP - Math.log(lower.p_hpa)) /
                    (Math.log(upper.p_hpa) - Math.log(lower.p_hpa));
                return lower.z_m + fraction * (upper.z_m - lower.z_m);
            }
        }
        return null;
    },

    vypocitajLclDetail: function (profilTemp, parcelExcessC = 2.5) {
        if (!Array.isArray(profilTemp) || profilTemp.length === 0) return null;
        const h0 = profilTemp.slice().sort((a, b) => b.p_hpa - a.p_hpa)[0];
        if (![h0.p_hpa, h0.z_m, h0.T_c, h0.Td_c].every(Number.isFinite)) return null;

        const T0K = h0.T_c + parcelExcessC + 273.15;
        const Td0K = h0.Td_c + 273.15;
        // Boltonov praktický vzťah pre teplotu LCL.
        const TlclK = 1 / (1 / (Td0K - 56) + Math.log(T0K / Td0K) / 800) + 56;
        const kappa = this.R / this.Cp;
        const pLcl = h0.p_hpa * Math.pow(TlclK / T0K, 1 / kappa);

        let zLcl = this.interpolujVyskuPreTlak(profilTemp, pLcl);
        if (!Number.isFinite(zLcl)) {
            const meanTK = (T0K + TlclK) / 2;
            zLcl = h0.z_m + (this.R * meanTK / this.g) * Math.log(h0.p_hpa / pLcl);
        }

        return {
            p_hpa: pLcl,
            z_m: zLcl,
            T_c: TlclK - 273.15,
            parcel_surface_T_c: h0.T_c + parcelExcessC,
            surface_Td_c: h0.Td_c,
            parcelExcessC
        };
    },

    vypocitajLclZProfily: function (liveAtmosferaTEMP) {
        return this.vypocitajLclDetail(liveAtmosferaTEMP)?.z_m ?? null;
    },

    moistLapseRateKPerM: function (T_k, p_hpa) {
        const T_c = T_k - 273.15;
        const qs = this.getMiesaciPomer(T_c, p_hpa);
        const numerator = this.g * (1 + (this.Lv * qs) / (this.R * T_k));
        const denominator = this.Cp + (this.Lv * this.Lv * qs * this.epsilon) /
            (this.R * T_k * T_k);
        return numerator / denominator;
    },

    integrujNasýtenuAdiabat: function (startTempC, startPressureHpa, endPressureHpa, stepHpa = 5) {
        if (![startTempC, startPressureHpa, endPressureHpa, stepHpa].every(Number.isFinite)) return [];
        if (startPressureHpa <= endPressureHpa || stepHpa <= 0) return [];

        const points = [{ p_hpa: startPressureHpa, T_c: startTempC }];
        let p = startPressureHpa;
        let TK = startTempC + 273.15;

        while (p - stepHpa > endPressureHpa) {
            const nextP = Math.max(endPressureHpa, p - stepHpa);
            const pMidHpa = (p + nextP) / 2;
            const qs = this.getMiesaciPomer(TK - 273.15, pMidHpa);
            const Tv = TK * (1 + 0.608 * qs);
            const gammaM = this.moistLapseRateKPerM(TK, pMidHpa);
            const dpPa = (nextP - p) * 100;
            // hydrostatika: dz/dp = -Rd*Tv/(g*p)
            const dz = -(this.R * Tv / (this.g * pMidHpa * 100)) * dpPa;
            TK -= gammaM * dz;
            p = nextP;
            points.push({ p_hpa: p, T_c: TK - 273.15 });
        }

        return points;
    },

    vypocitajDrahuCastice: function (profilTemp, parcelExcessC = 2.5) {
        if (!Array.isArray(profilTemp) || profilTemp.length < 2) return [];
        const sorted = profilTemp.slice().sort((a, b) => b.p_hpa - a.p_hpa);
        const h0 = sorted[0];
        const lcl = this.vypocitajLclDetail(sorted, parcelExcessC);
        if (!lcl) return [];

        const kappa = this.R / this.Cp;
        const T0K = h0.T_c + parcelExcessC + 273.15;
        const theta = T0K * Math.pow(1000 / h0.p_hpa, kappa);
        const result = [];

        for (let p = h0.p_hpa; p >= lcl.p_hpa; p -= 5) {
            result.push({
                p_hpa: p,
                T_c: theta * Math.pow(p / 1000, kappa) - 273.15,
                phase: "dry"
            });
        }

        const moist = this.integrujNasýtenuAdiabat(
            lcl.T_c,
            lcl.p_hpa,
            sorted[sorted.length - 1].p_hpa,
            5
        );
        moist.forEach((point, index) => {
            if (index === 0 && result.length) return;
            result.push({ ...point, phase: "moist" });
        });
        return result;
    },

    vypocitaj3DDriftKomina: function (profilTemp, latStart, lonStart) {
        const h0 = profilTemp[0];
        const bodyKomina = [];
        let currentX = 0.0;
        let currentY = 0.0;
        const R0Radius = 60.0;
        const vyskaLcl = this.vypocitajLclZProfily(profilTemp);
        let TParcK = h0.T_c + 2.5 + 273.15;

        bodyKomina.push({
            alt: h0.z_m,
            lon: lonStart,
            lat: latStart,
            radius: R0Radius,
            stav: "KOMIN"
        });

        for (let i = 0; i < profilTemp.length - 1; i += 1) {
            const h1 = profilTemp[i];
            const h2 = profilTemp[i + 1];
            const dz = h2.z_m - h1.z_m;
            if (!(dz > 0)) continue;

            if (h1.z_m < vyskaLcl) TParcK -= (this.g / this.Cp) * dz;
            else TParcK -= 0.0065 * dz;

            const wEnv = this.getMiesaciPomerZRosenhoBodu(h2.Td_c, h2.p_hpa);
            const TvEnv = this.getVirtualnaTeplotaK(h2.T_c, wEnv);

            const TParcC = TParcK - 273.15;
            const wParc = this.getMiesaciPomer(TParcC, h2.p_hpa);
            const TvParc = TParcK * (1.0 + 0.608 * wParc);

            const aVztlak = this.g * ((TvParc - TvEnv) / TvEnv);
            const wAir = Math.max(0.2, Math.sqrt(Math.max(0, 2 * aVztlak * dz)));
            const dt = dz / wAir;

            const speedMs = h2.w_speed_kts * 0.514444;
            const rad = Cesium.Math.toRadians(h2.w_dir_deg);
            currentX += (-speedMs * Math.sin(rad)) * dt;
            currentY += (-speedMs * Math.cos(rad)) * dt;

            const r2 = R0Radius + 0.07 * (h2.z_m - h0.z_m);
            const segLon = lonStart + (currentX /
                (this.METERS_PER_DEGREE * Math.cos(latStart * Math.PI / 180.0)));
            const segLat = latStart + (currentY / this.METERS_PER_DEGREE);

            bodyKomina.push({
                alt: h2.z_m,
                lon: segLon,
                lat: segLat,
                radius: r2,
                stav: speedMs < wAir * 1.4 ? "KOMIN" : "BUBLINY"
            });
        }
        return bodyKomina;
    }
};

window.MeteoCore = MeteoCore;

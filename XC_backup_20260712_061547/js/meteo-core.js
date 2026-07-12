// js/meteo-core.js
const MeteoCore = {
    g: 9.81,
    R: 287.05,
    Cp: 1005.0,
    METERS_PER_DEGREE: 111111.0,

    getMiesaciPomer: function(T_c, p_hpa) {
        let e = 611.2 * Math.exp((17.67 * T_c) / (T_c + 243.5)); 
        let p_pa = p_hpa * 100;
        return 0.622 * (e / (p_pa - e)); 
    },

    getVirtualnaTeplotaK: function(T_c, w_mix) {
        let T_k = T_c + 273.15;
        return T_k * (1.0 + 0.608 * w_mix);
    },

    vypocitajLclZProfily: function(liveAtmosferaTEMP) {
        // FIX: Správne vytiahnutie prízemnej hladiny z nultého indexu JSON poľa
        let h0 = liveAtmosferaTEMP[0];
        let T0_k = h0.T_c + 2.5 + 273.15; 
        let Td0_k = h0.Td_c + 273.15;
        let T_lcl_k = Td0_k - (0.001296 * Td0_k + 0.1977) * (T0_k - Td0_k);
        let dz_lcl = (this.R * ((T0_k + T_lcl_k) / 2) / this.g) * Math.log(T0_k / T_lcl_k);
        return h0.z_m + dz_lcl;
    },

    vypocitaj3DDriftKomina: function(profilTemp, latStart, lonStart) {
        let h0 = profilTemp[0]; // FIX: Prístup k prízemnej hladine cez index 0
        let bodyKomina = [];
        let currentX = 0.0, currentY = 0.0;
        let R0_radius = 60.0;
        let vyskaLcl = this.vypocitajLclZProfily(profilTemp);
        let T_parc_k = h0.T_c + 2.5 + 273.15;

        bodyKomina.push({ alt: h0.z_m, lon: lonStart, lat: latStart, radius: R0_radius, stav: "KOMIN" });

        for (let i = 0; i < profilTemp.length - 1; i++) {
            let h1 = profilTemp[i]; let h2 = profilTemp[i+1];
            let dz = h2.z_m - h1.z_m;

            if (h1.z_m < vyskaLcl) T_parc_k -= (this.g / this.Cp) * dz;
            else T_parc_k -= 0.0065 * dz;

            let e_env = 611.2 * Math.exp((17.67 * h2.T_c) / (h2.T_c + 243.5));
            let w_env = 0.622 * (e_env / ((h2.p_hpa * 100) - e_env));
            let Tv_env = (h2.T_c + 273.15) * (1.0 + 0.608 * w_env);

            let T_parc_c = T_parc_k - 273.15;
            let e_parc = 611.2 * Math.exp((17.67 * T_parc_c) / (T_parc_c + 243.5));
            let w_parc = 0.622 * (e_parc / ((h2.p_hpa * 100) - e_parc));
            let Tv_parc = T_parc_k * (1.0 + 0.608 * w_parc);

            let a_vztlak = this.g * ((Tv_parc - Tv_env) / Tv_env);
            let w_air = Math.max(1.2, Math.sqrt(Math.abs(2 * a_vztlak * dz)));
            let dt = dz / w_air;

            let speed_ms = h2.w_speed_kts * 0.514444;
            let rad = Cesium.Math.toRadians(h2.w_dir_deg);
            currentX += (-speed_ms * Math.sin(rad)) * dt;
            currentY += (-speed_ms * Math.cos(rad)) * dt;

            let r2 = R0_radius + 0.07 * (h2.z_m - h0.z_m);
            let segLon = lonStart + (currentX / (this.METERS_PER_DEGREE * Math.cos(latStart * Math.PI / 180.0)));
            let segLat = latStart + (currentY / this.METERS_PER_DEGREE);

            bodyKomina.push({ alt: h2.z_m, lon: segLon, lat: segLat, radius: r2, stav: (speed_ms < w_air * 1.4) ? "KOMIN" : "BUBLINY" });
        }
        return bodyKomina;
    }
};

// js/glider-core.js
const GliderCore = {
    rho_0: 1.225, 
    polara: null,
    vBest: 90.0,

    inicializujPolaru: async function(urlGlider) {
        try {
            let response = await fetch(urlGlider);
            let config = await response.json();
            let model = config.zvoleny_model;
            this.polara = config.databaza[model];
            this.vBest = config.rychlost_ias_kmh;
            logStatus("Aerodynamika: Polára úspešne načítaná pre model " + model, "success");
        } catch (err) {
            logStatus("Chyba načítania poláry krídla: " + err.message, "error");
            this.polara = {"a": 0.00012, "b": -0.019, "c": 1.35};
        }
    },

    getKorigovaneOpadavanie: function(altAmsl, hpaTlak) {
        if (!this.polara) return 0.7; 
        let R = 287.05;
        let T_k = 288.15 - (0.0065 * altAmsl); 
        let rho = (hpaTlak * 100) / (R * T_k);
        let k_alt = Math.sqrt(this.rho_0 / rho);
        let w_sink_0 = this.polara.a * (this.vBest * this.vBest) + this.polara.b * this.vBest + this.polara.c;
        return Math.abs(w_sink_0 * k_alt);
    }
};

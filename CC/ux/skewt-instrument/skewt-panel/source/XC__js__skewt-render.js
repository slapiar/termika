// js/skewt-render.js
// Samostatný, pohyblivý Skew‑T / log‑P panel bez externej grafickej knižnice.
window.SkewTRender = {
    panel: null,
    canvas: null,
    ctx: null,
    profile: [],
    sourceName: "",
    resizeObserver: null,
    dragState: null,
    storageKey: "termikaXC.skewt.v25",

    init: function () {
        this.panel = document.getElementById("skewTPanel");
        this.canvas = document.getElementById("skewTCanvas");
        this.ctx = this.canvas?.getContext("2d") || null;

        if (!this.panel || !this.canvas || !this.ctx) return;

        document.getElementById("toggleSkewTButton")?.addEventListener("click", () => this.toggle());
        document.getElementById("closeSkewTButton")?.addEventListener("click", () => this.toggle(false));
        document.getElementById("resetSkewTViewButton")?.addEventListener("click", () => this.resetWindow());

        const header = this.panel.querySelector(".skewt-header");
        header?.addEventListener("pointerdown", (event) => this.startDrag(event, header));
        this.panel.addEventListener("pointerdown", () => this.bringToFront());

        this.resizeObserver = new ResizeObserver(() => {
            if (!this.panel.hidden) this.draw();
            this.saveWindow();
        });
        this.resizeObserver.observe(this.panel);

        this.restoreWindow();
        this.updateMeta();
        this.updateToggleButton();
        if (!this.panel.hidden) window.requestAnimationFrame(() => this.draw());
    },

    setProfile: function (profile, sourceName = "TEMP") {
        this.profile = Array.isArray(profile)
            ? profile.slice().sort((a, b) => b.p_hpa - a.p_hpa)
            : [];
        this.sourceName = sourceName || "TEMP";
        this.updateMeta();
        if (!this.panel?.hidden) this.draw();
    },

    toggle: function (forceVisible = null) {
        if (!this.panel) return;
        const shouldShow = forceVisible === null ? this.panel.hidden : Boolean(forceVisible);

        if (shouldShow) {
            this.panel.hidden = false;
            this.bringToFront();
            window.requestAnimationFrame(() => this.draw());
            window.logStatus?.("Skew‑T profil bol zobrazený.");
            this.saveWindow(false);
        } else {
            // Geometriu uložíme ešte pred display:none, aby sa nestratila poloha a rozmery.
            this.saveWindow(true);
            this.panel.hidden = true;
        }

        this.updateToggleButton();
    },

    updateToggleButton: function () {
        const button = document.getElementById("toggleSkewTButton");
        if (!button || !this.panel) return;
        button.textContent = this.panel.hidden ? "⌁ Zobraziť Skew‑T" : "⌁ Skryť Skew‑T";
        button.title = this.panel.hidden
            ? "Zobraziť TEMP v pohyblivom Skew‑T / log‑P grafe"
            : "Skryť Skew‑T / log‑P graf";
    },

    updateMeta: function () {
        const file = document.getElementById("skewTFileName");
        const levels = document.getElementById("skewTLevels");
        const surface = document.getElementById("skewTSurface");
        const top = document.getElementById("skewTTop");
        const lcl = document.getElementById("skewTLcl");

        const profile = this.profile;
        const first = profile[0];
        const last = profile[profile.length - 1];
        const lclInfo = window.MeteoCore?.vypocitajLclDetail?.(profile) || null;

        if (file) {
            file.textContent = this.sourceName || "TEMP";
            file.title = this.sourceName || "TEMP";
        }
        if (levels) levels.textContent = profile.length ? String(profile.length) : "--";
        if (surface) {
            surface.textContent = first
                ? `${Math.round(first.p_hpa)} hPa · ${Math.round(first.z_m)} m · ${first.T_c.toFixed(1)} °C`
                : "--";
        }
        if (top) {
            top.textContent = last
                ? `${Math.round(last.p_hpa)} hPa · ${Math.round(last.z_m)} m`
                : "--";
        }
        if (lcl) {
            lcl.textContent = lclInfo
                ? `${Math.round(lclInfo.z_m)} m AMSL · ${Math.round(lclInfo.p_hpa)} hPa`
                : "--";
        }
    },

    draw: function () {
        if (!this.canvas || !this.ctx || this.panel?.hidden) return;

        const rect = this.canvas.getBoundingClientRect();
        if (rect.width < 40 || rect.height < 40) return;

        const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
        const width = Math.max(1, Math.round(rect.width * dpr));
        const height = Math.max(1, Math.round(rect.height * dpr));
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }

        const ctx = this.ctx;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = "#071017";
        ctx.fillRect(0, 0, rect.width, rect.height);

        if (!this.profile.length) {
            ctx.fillStyle = "#9db0bc";
            ctx.font = "14px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Načítaj TEMP profil", rect.width / 2, rect.height / 2);
            return;
        }

        const margin = {
            left: Math.max(48, rect.width * 0.075),
            right: Math.max(78, rect.width * 0.15),
            top: 28,
            bottom: 36
        };
        const plot = {
            left: margin.left,
            top: margin.top,
            right: rect.width - margin.right,
            bottom: rect.height - margin.bottom
        };
        plot.width = Math.max(50, plot.right - plot.left);
        plot.height = Math.max(50, plot.bottom - plot.top);

        const pressures = this.profile.map((p) => p.p_hpa).filter(Number.isFinite);
        const pMaxRaw = Math.max(...pressures);
        const pMinRaw = Math.min(...pressures);
        const pMax = Math.max(1000, Math.ceil(pMaxRaw / 25) * 25);
        const pMin = Math.max(100, Math.floor(pMinRaw / 50) * 50);
        const logSpan = Math.log(pMax / pMin);
        const skewC = 38;

        const yNorm = (p) => Math.log(pMax / p) / logSpan;
        const yOf = (p) => plot.bottom - yNorm(p) * plot.height;

        const transformedProfile = [];
        for (const level of this.profile) {
            const n = yNorm(level.p_hpa);
            transformedProfile.push(level.T_c + skewC * n, level.Td_c + skewC * n);
        }
        const minTrans = Math.floor((Math.min(-55, ...transformedProfile) - 8) / 10) * 10;
        const maxTrans = Math.ceil((Math.max(45 + skewC, ...transformedProfile) + 8) / 10) * 10;
        const xOf = (tempC, p) => {
            const transformed = tempC + skewC * yNorm(p);
            return plot.left + ((transformed - minTrans) / (maxTrans - minTrans)) * plot.width;
        };

        ctx.save();
        ctx.beginPath();
        ctx.rect(plot.left, plot.top, plot.width, plot.height);
        ctx.clip();

        this.drawIsotherms(ctx, plot, pMax, pMin, xOf, yOf);
        this.drawDryAdiabats(ctx, plot, pMax, pMin, xOf, yOf);
        this.drawMoistAdiabats(ctx, plot, pMax, pMin, xOf, yOf);
        this.drawIsobars(ctx, plot, pMax, pMin, yOf);
        this.drawParcel(ctx, plot, pMax, pMin, xOf, yOf);
        this.drawProfileLine(ctx, this.profile, "T_c", "#ff5147", 2.4, xOf, yOf);
        this.drawProfileLine(ctx, this.profile, "Td_c", "#35e878", 2.2, xOf, yOf);
        ctx.restore();

        this.drawAxes(ctx, plot, pMax, pMin, xOf, yOf);
        this.drawWindColumn(ctx, plot, pMax, pMin, yOf);
        this.drawLegend(ctx, plot);
        this.drawLclLabel(ctx, plot, pMax, pMin, yOf);
    },

    drawIsobars: function (ctx, plot, pMax, pMin, yOf) {
        const levels = [1050, 1000, 950, 925, 900, 850, 800, 750, 700, 650, 600, 550, 500, 450, 400, 350, 300, 250, 200, 150, 100];
        ctx.lineWidth = 1;
        for (const p of levels) {
            if (p > pMax || p < pMin) continue;
            const major = [1000, 925, 850, 700, 500, 400, 300, 250, 200].includes(p);
            ctx.strokeStyle = major ? "rgba(198,217,228,0.30)" : "rgba(198,217,228,0.12)";
            ctx.beginPath();
            ctx.moveTo(plot.left, yOf(p));
            ctx.lineTo(plot.right, yOf(p));
            ctx.stroke();
        }
    },

    drawIsotherms: function (ctx, plot, pMax, pMin, xOf, yOf) {
        for (let t = -90; t <= 60; t += 10) {
            ctx.strokeStyle = t === 0 ? "rgba(89,195,255,0.45)" : "rgba(89,195,255,0.17)";
            ctx.lineWidth = t === 0 ? 1.25 : 1;
            ctx.beginPath();
            ctx.moveTo(xOf(t, pMax), yOf(pMax));
            ctx.lineTo(xOf(t, pMin), yOf(pMin));
            ctx.stroke();
        }
    },

    drawDryAdiabats: function (ctx, plot, pMax, pMin, xOf, yOf) {
        const kappa = 287.05 / 1005.0;
        ctx.strokeStyle = "rgba(255,179,71,0.16)";
        ctx.lineWidth = 1;

        for (let theta = 250; theta <= 460; theta += 10) {
            ctx.beginPath();
            let started = false;
            for (let p = pMax; p >= pMin; p -= Math.max(5, (pMax - pMin) / 90)) {
                const tempC = theta * Math.pow(p / 1000, kappa) - 273.15;
                const x = xOf(tempC, p);
                const y = yOf(p);
                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }
    },

    drawMoistAdiabats: function (ctx, plot, pMax, pMin, xOf, yOf) {
        ctx.strokeStyle = "rgba(76,224,160,0.12)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        for (let startC = -10; startC <= 40; startC += 5) {
            const points = window.MeteoCore?.integrujNasýtenuAdiabat?.(startC, pMax, pMin, 5) || [];
            if (points.length < 2) continue;
            ctx.beginPath();
            points.forEach((point, index) => {
                const x = xOf(point.T_c, point.p_hpa);
                const y = yOf(point.p_hpa);
                if (index === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }
        ctx.setLineDash([]);
    },

    drawProfileLine: function (ctx, profile, field, color, width, xOf, yOf) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        let started = false;

        for (const level of profile) {
            const value = Number(level[field]);
            if (!Number.isFinite(value) || !Number.isFinite(level.p_hpa)) continue;
            const x = xOf(value, level.p_hpa);
            const y = yOf(level.p_hpa);
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        ctx.fillStyle = color;
        for (const level of profile) {
            const value = Number(level[field]);
            if (!Number.isFinite(value) || !Number.isFinite(level.p_hpa)) continue;
            ctx.beginPath();
            ctx.arc(xOf(value, level.p_hpa), yOf(level.p_hpa), 2.2, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    drawParcel: function (ctx, plot, pMax, pMin, xOf, yOf) {
        const path = window.MeteoCore?.vypocitajDrahuCastice?.(this.profile, 2.5) || [];
        if (path.length < 2) return;

        ctx.strokeStyle = "#ffc247";
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 4]);
        ctx.beginPath();
        let started = false;
        path.forEach((point) => {
            if (point.p_hpa > pMax || point.p_hpa < pMin) return;
            const x = xOf(point.T_c, point.p_hpa);
            const y = yOf(point.p_hpa);
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        ctx.setLineDash([]);
    },

    drawAxes: function (ctx, plot, pMax, pMin, xOf, yOf) {
        ctx.strokeStyle = "rgba(214,231,240,0.65)";
        ctx.lineWidth = 1;
        ctx.strokeRect(plot.left, plot.top, plot.width, plot.height);

        ctx.font = "10px 'Courier New', monospace";
        ctx.fillStyle = "#c9d5dc";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        const pressureLabels = [1000, 925, 850, 700, 500, 400, 300, 250, 200, 150, 100];
        for (const p of pressureLabels) {
            if (p > pMax || p < pMin) continue;
            ctx.fillText(String(p), plot.left - 7, yOf(p));
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        for (let t = -60; t <= 50; t += 10) {
            const x = xOf(t, pMax);
            if (x < plot.left - 5 || x > plot.right + 5) continue;
            ctx.fillText(String(t), x, plot.bottom + 7);
        }

        ctx.save();
        ctx.translate(13, (plot.top + plot.bottom) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = "#8fa3af";
        ctx.font = "10px system-ui, sans-serif";
        ctx.fillText("tlak [hPa] · logaritmická os", 0, 0);
        ctx.restore();

        ctx.fillStyle = "#8fa3af";
        ctx.font = "10px system-ui, sans-serif";
        ctx.fillText("teplota [°C]", (plot.left + plot.right) / 2, plot.bottom + 21);
    },

    drawWindColumn: function (ctx, plot, pMax, pMin, yOf) {
        const x = plot.right + 38;
        ctx.font = "9px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#8fa3af";
        ctx.fillText("VIETOR", x, plot.top - 15);

        for (const level of this.profile) {
            if (level.p_hpa > pMax || level.p_hpa < pMin) continue;
            const dir = Number(level.w_dir_deg);
            const speed = Number(level.w_speed_kts);
            if (!Number.isFinite(dir) || !Number.isFinite(speed)) continue;

            const y = yOf(level.p_hpa);
            const toward = (dir + 180) * Math.PI / 180;
            const length = Math.min(25, 10 + speed * 0.25);
            const dx = Math.sin(toward) * length;
            const dy = -Math.cos(toward) * length;

            ctx.strokeStyle = "rgba(214,235,246,0.78)";
            ctx.fillStyle = "rgba(214,235,246,0.78)";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + dx, y + dy);
            ctx.stroke();

            const angle = Math.atan2(dy, dx);
            ctx.beginPath();
            ctx.moveTo(x + dx, y + dy);
            ctx.lineTo(x + dx - 5 * Math.cos(angle - 0.55), y + dy - 5 * Math.sin(angle - 0.55));
            ctx.lineTo(x + dx - 5 * Math.cos(angle + 0.55), y + dy - 5 * Math.sin(angle + 0.55));
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "#a9bac4";
            ctx.font = "8px 'Courier New', monospace";
            ctx.textAlign = "left";
            ctx.fillText(`${Math.round(speed)} kt`, plot.right + 63, y + 3);
        }
    },

    drawLegend: function (ctx, plot) {
        const entries = [
            ["#ff5147", "T"],
            ["#35e878", "Td"],
            ["#ffc247", "častica +2,5 °C"]
        ];
        let x = plot.left + 6;
        const y = plot.top - 17;
        ctx.font = "10px system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";

        for (const [color, label] of entries) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 18, y);
            ctx.stroke();
            x += 23;
            ctx.fillStyle = "#c9d5dc";
            ctx.fillText(label, x, y);
            x += ctx.measureText(label).width + 14;
        }
    },

    drawLclLabel: function (ctx, plot, pMax, pMin, yOf) {
        const lcl = window.MeteoCore?.vypocitajLclDetail?.(this.profile);
        if (!lcl || lcl.p_hpa > pMax || lcl.p_hpa < pMin) return;

        const y = yOf(lcl.p_hpa);
        ctx.save();
        ctx.strokeStyle = "rgba(0,229,255,0.75)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(plot.left, y);
        ctx.lineTo(plot.right, y);
        ctx.stroke();
        ctx.setLineDash([]);

        const label = `LCL ${Math.round(lcl.z_m)} m / ${Math.round(lcl.p_hpa)} hPa`;
        ctx.font = "10px 'Courier New', monospace";
        const width = ctx.measureText(label).width + 10;
        ctx.fillStyle = "rgba(4,25,32,0.92)";
        ctx.fillRect(plot.right - width, y - 15, width, 14);
        ctx.fillStyle = "#65f3ff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(label, plot.right - width + 5, y - 8);
        ctx.restore();
    },

    startDrag: function (event, header) {
        if (event.button !== 0 || event.target.closest("button, input, select, a")) return;
        if (window.innerWidth <= 720) return;

        const rect = this.panel.getBoundingClientRect();
        this.panel.style.transform = "none";
        this.panel.style.left = rect.left + "px";
        this.panel.style.top = rect.top + "px";
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        this.bringToFront();
        header.setPointerCapture(event.pointerId);

        const move = (moveEvent) => {
            moveEvent.preventDefault();
            const maxLeft = Math.max(8, window.innerWidth - this.panel.offsetWidth - 8);
            const maxTop = Math.max(8, window.innerHeight - this.panel.offsetHeight - 8);
            this.panel.style.left = Math.min(maxLeft, Math.max(8, moveEvent.clientX - offsetX)) + "px";
            this.panel.style.top = Math.min(maxTop, Math.max(8, moveEvent.clientY - offsetY)) + "px";
        };
        const end = () => {
            header.removeEventListener("pointermove", move);
            header.removeEventListener("pointerup", end);
            header.removeEventListener("pointercancel", end);
            this.saveWindow();
        };

        header.addEventListener("pointermove", move);
        header.addEventListener("pointerup", end);
        header.addEventListener("pointercancel", end);
    },

    bringToFront: function () {
        if (!this.panel) return;
        this.panel.style.zIndex = String(Math.max(120, Number(this.panel.style.zIndex || 120) + 1));
    },

    resetWindow: function () {
        if (!this.panel) return;
        this.panel.style.left = "50%";
        this.panel.style.top = "50%";
        this.panel.style.width = "min(760px, calc(100vw - 32px))";
        this.panel.style.height = "min(720px, calc(100vh - 32px))";
        this.panel.style.transform = "translate(-50%, -50%)";
        this.saveWindow();
        window.requestAnimationFrame(() => this.draw());
    },

    saveWindow: function (hiddenOverride = null) {
        if (!this.panel) return;
        const rect = this.panel.getBoundingClientRect();
        let previous = {};
        try {
            previous = JSON.parse(localStorage.getItem(this.storageKey) || "{}") || {};
        } catch (error) {
            previous = {};
        }

        const hasGeometry = rect.width > 1 && rect.height > 1;
        const state = {
            hidden: hiddenOverride === null ? this.panel.hidden : Boolean(hiddenOverride),
            left: hasGeometry ? Math.round(rect.left) : (Number(previous.left) || 8),
            top: hasGeometry ? Math.round(rect.top) : (Number(previous.top) || 8),
            width: hasGeometry ? Math.round(rect.width) : (Number(previous.width) || 760),
            height: hasGeometry ? Math.round(rect.height) : (Number(previous.height) || 720)
        };

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(state));
        } catch (error) {
            // Aplikácia musí fungovať aj bez localStorage.
        }
    },

    restoreWindow: function () {
        if (!this.panel) return;
        let state = null;
        try {
            state = JSON.parse(localStorage.getItem(this.storageKey) || "null");
        } catch (error) {
            state = null;
        }
        if (!state || typeof state !== "object") return;

        const width = Math.max(420, Math.min(window.innerWidth - 16, Number(state.width) || 760));
        const height = Math.max(320, Math.min(window.innerHeight - 16, Number(state.height) || 720));
        const left = Math.max(8, Math.min(window.innerWidth - width - 8, Number(state.left) || 8));
        const top = Math.max(8, Math.min(window.innerHeight - height - 8, Number(state.top) || 8));

        this.panel.style.transform = "none";
        this.panel.style.left = left + "px";
        this.panel.style.top = top + "px";
        this.panel.style.width = width + "px";
        this.panel.style.height = height + "px";
        this.panel.hidden = Boolean(state.hidden);
    }
};

document.addEventListener("DOMContentLoaded", () => {
    window.SkewTRender.init();
});

(() => {
    "use strict";

    const state = {
        badge: null,
        hooked: false,
        lastText: ""
    };

    const pad = value => String(Math.max(0, Math.trunc(Number(value) || 0))).padStart(2, "0");

    function formatTime(seconds) {
        const normalized = ((Math.trunc(Number(seconds) || 0) % 86400) + 86400) % 86400;
        const hours = Math.floor(normalized / 3600);
        const minutes = Math.floor((normalized % 3600) / 60);
        const secs = normalized % 60;
        return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    }

    function formatDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
        if (!match) return null;
        return `${match[3]}.${match[2]}. ${match[1]}`;
    }

    function ensureBadge() {
        if (state.badge?.isConnected) return state.badge;
        const badge = document.createElement("div");
        badge.id = "termikaIgcFlightSummary";
        badge.className = "termika-igc-flight-summary";
        badge.hidden = true;
        badge.setAttribute("aria-label", "Dátum letu, čas štartu a pristátia z IGC");
        document.body.appendChild(badge);
        state.badge = badge;
        return badge;
    }

    function positionBadge() {
        const badge = ensureBadge();
        const skyBadge = document.getElementById("termikaSkyTimeBadge");
        if (skyBadge) {
            const rect = skyBadge.getBoundingClientRect();
            badge.style.left = `${Math.round(rect.left)}px`;
            badge.style.top = `${Math.round(rect.bottom + 5)}px`;
            badge.style.maxWidth = `${Math.max(180, Math.round(window.innerWidth - rect.left - 12))}px`;
            return;
        }

        const nav = document.getElementById("navShell");
        const top = nav?.dataset.dock === "top"
            ? Math.round(nav.getBoundingClientRect().bottom + 38)
            : 44;
        badge.style.left = "12px";
        badge.style.top = `${top}px`;
    }

    function render(metadata, points) {
        const date = formatDate(metadata?.flightDate);
        if (!date || !Array.isArray(points) || points.length === 0) {
            if (state.badge) state.badge.hidden = true;
            state.lastText = "";
            return;
        }

        const first = points.find(point => Number.isFinite(Number(point?.time_s)));
        const last = [...points].reverse().find(point => Number.isFinite(Number(point?.time_s)));
        if (!first || !last) {
            if (state.badge) state.badge.hidden = true;
            state.lastText = "";
            return;
        }

        const text = `IGC ${date}, Štart - ${formatTime(first.time_s)} - Pristátie: ${formatTime(last.time_s)}`;
        const badge = ensureBadge();
        badge.textContent = text;
        badge.title = "Čas prvého a posledného platného B-záznamu v načítanom IGC (UTC)";
        badge.hidden = false;
        state.lastText = text;
        positionBadge();
    }

    function hookPilotNetwork() {
        if (state.hooked || !window.PilotNetwork || typeof window.PilotNetwork.pripravPrehravanieLetu !== "function") {
            return false;
        }

        const network = window.PilotNetwork;
        const originalPrepare = network.pripravPrehravanieLetu;
        network.pripravPrehravanieLetu = function (points, temp, activeViewer, chart, metadata) {
            const result = originalPrepare.apply(this, arguments);
            render(metadata || this.metadata, points || this.letoveBody);
            return result;
        };

        state.hooked = true;
        if (Array.isArray(network.letoveBody) && network.letoveBody.length) {
            render(network.metadata, network.letoveBody);
        }
        return true;
    }

    window.addEventListener("resize", positionBadge);

    const observer = new MutationObserver(positionBadge);
    observer.observe(document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ["data-dock", "style", "hidden"]
    });

    const integrationWait = window.setInterval(() => {
        hookPilotNetwork();
        positionBadge();
        if (state.hooked) window.clearInterval(integrationWait);
    }, 120);

    window.setTimeout(() => window.clearInterval(integrationWait), 30000);
})();

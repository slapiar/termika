// js/workspace-ui.js
// Presúvanie, zmena veľkosti a skrývanie pracovných panelov TermikaXC.
window.WorkspacePanels = {
    storageKey: "termikaXC.workspace.v23",
    zIndex: 50,
    panelIds: ["leftPanel", "rightPanel", "debugConsole"],
    panelClassMap: {
        leftPanel: "left-panel-floating",
        rightPanel: "right-panel-floating",
        debugConsole: "debug-panel-floating"
    },
    resizeObserver: null,
    saveTimer: null,

    init: function () {
        const shell = document.getElementById("appShell");
        if (!shell) return;

        this.panelIds.forEach((id) => {
            const panel = document.getElementById(id);
            if (!panel) return;

            const handle = panel.querySelector(".window-header, .debug-header");
            if (handle) {
                handle.addEventListener("pointerdown", (event) => this.startDrag(event, panel, handle));
                handle.addEventListener("dblclick", (event) => {
                    if (event.target.closest("button, input, select, a")) return;
                    this.dockPanel(panel);
                });
            }

            panel.addEventListener("pointerdown", () => this.bringToFront(panel));
        });

        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target.classList.contains("is-floating")) {
                    this.scheduleSave();
                }
            }
        });

        this.panelIds.forEach((id) => {
            const panel = document.getElementById(id);
            if (panel) this.resizeObserver.observe(panel);
        });

        this.restore();
        this.updateDebugButtons();

        window.addEventListener("resize", () => {
            this.panelIds.forEach((id) => {
                const panel = document.getElementById(id);
                if (panel?.classList.contains("is-floating")) this.keepInViewport(panel);
            });
            window.resizeCesium?.();
        });
    },

    startDrag: function (event, panel, handle) {
        if (event.button !== 0) return;
        if (window.innerWidth <= 720) return;
        if (event.target.closest("button, input, select, a")) return;

        const rect = panel.getBoundingClientRect();
        const startX = event.clientX;
        const startY = event.clientY;
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        let dragging = false;

        handle.setPointerCapture(event.pointerId);

        const onMove = (moveEvent) => {
            if (!dragging) {
                const distance = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
                if (distance < 4) return;

                moveEvent.preventDefault();
                this.makeFloating(panel, rect);
                this.bringToFront(panel);
                panel.classList.add("is-dragging");
                dragging = true;
            }

            const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
            const maxTop = Math.max(8, window.innerHeight - panel.offsetHeight - 8);
            const left = Math.min(maxLeft, Math.max(8, moveEvent.clientX - offsetX));
            const top = Math.min(maxTop, Math.max(8, moveEvent.clientY - offsetY));
            panel.style.left = left + "px";
            panel.style.top = top + "px";
        };

        const onEnd = () => {
            if (dragging) {
                panel.classList.remove("is-dragging");
                this.keepInViewport(panel);
                this.save();
                window.resizeCesium?.();
            }

            handle.removeEventListener("pointermove", onMove);
            handle.removeEventListener("pointerup", onEnd);
            handle.removeEventListener("pointercancel", onEnd);
        };

        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onEnd);
        handle.addEventListener("pointercancel", onEnd);
    },

    makeFloating: function (panel, rect = null) {
        if (!panel || panel.classList.contains("is-floating")) return;

        const currentRect = rect || panel.getBoundingClientRect();
        panel.classList.add("is-floating");
        panel.style.left = Math.max(8, currentRect.left) + "px";
        panel.style.top = Math.max(8, currentRect.top) + "px";
        panel.style.width = Math.max(240, currentRect.width) + "px";
        panel.style.height = Math.max(120, currentRect.height) + "px";

        const shellClass = this.panelClassMap[panel.id];
        if (shellClass) document.getElementById("appShell")?.classList.add(shellClass);
        window.resizeCesium?.();
    },

    dockPanel: function (panel) {
        if (!panel) return;

        panel.classList.remove("is-floating", "is-dragging");
        panel.style.removeProperty("left");
        panel.style.removeProperty("top");
        panel.style.removeProperty("width");
        panel.style.removeProperty("height");
        panel.style.removeProperty("z-index");

        const shellClass = this.panelClassMap[panel.id];
        if (shellClass) document.getElementById("appShell")?.classList.remove(shellClass);

        this.save();
        window.resizeCesium?.();
    },

    bringToFront: function (panel) {
        if (!panel?.classList.contains("is-floating")) return;
        this.zIndex += 1;
        panel.style.zIndex = String(this.zIndex);
    },

    keepInViewport: function (panel) {
        if (!panel?.classList.contains("is-floating")) return;

        const rect = panel.getBoundingClientRect();
        const maxWidth = Math.max(240, window.innerWidth - 16);
        const maxHeight = Math.max(120, window.innerHeight - 16);
        const width = Math.min(rect.width, maxWidth);
        const height = Math.min(rect.height, maxHeight);
        const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
        const top = Math.min(Math.max(8, rect.top), Math.max(8, window.innerHeight - height - 8));

        panel.style.width = width + "px";
        panel.style.height = height + "px";
        panel.style.left = left + "px";
        panel.style.top = top + "px";
    },

    toggleDebug: function (forceVisible = null) {
        const shell = document.getElementById("appShell");
        if (!shell) return;

        const currentlyHidden = shell.classList.contains("debug-hidden");
        const shouldHide = forceVisible === null ? !currentlyHidden : !forceVisible;
        shell.classList.toggle("debug-hidden", shouldHide);
        this.updateDebugButtons();
        this.save();
        window.resizeCesium?.();

        if (typeof window.logStatus === "function" && !shouldHide) {
            window.logStatus("Diagnostický pult bol zobrazený.");
        }
    },

    updateDebugButtons: function () {
        const hidden = document.getElementById("appShell")?.classList.contains("debug-hidden");
        const toolbarButton = document.getElementById("toggleDebugButton");
        if (toolbarButton) {
            toolbarButton.textContent = hidden ? "▤ Zobraziť diagnostiku" : "▤ Skryť diagnostiku";
            toolbarButton.title = hidden ? "Zobraziť diagnostický pult" : "Skryť diagnostický pult";
        }
    },

    resetAll: function () {
        this.panelIds.forEach((id) => {
            const panel = document.getElementById(id);
            if (panel) this.dockPanel(panel);
        });

        const shell = document.getElementById("appShell");
        shell?.classList.remove("debug-hidden");
        this.updateDebugButtons();
        this.save();
        window.resizeCesium?.();

        if (typeof window.logStatus === "function") {
            window.logStatus("Rozloženie panelov bolo obnovené.", "success");
        }
    },

    scheduleSave: function () {
        window.clearTimeout(this.saveTimer);
        this.saveTimer = window.setTimeout(() => this.save(), 180);
    },

    save: function () {
        const shell = document.getElementById("appShell");
        if (!shell) return;

        const state = {
            debugHidden: shell.classList.contains("debug-hidden"),
            panels: {}
        };

        this.panelIds.forEach((id) => {
            const panel = document.getElementById(id);
            if (!panel) return;

            const floating = panel.classList.contains("is-floating");
            const rect = panel.getBoundingClientRect();
            state.panels[id] = floating
                ? {
                    floating: true,
                    left: Math.round(rect.left),
                    top: Math.round(rect.top),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    zIndex: Number.parseInt(panel.style.zIndex || "0", 10) || 0
                }
                : { floating: false };
        });

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(state));
        } catch (error) {
            // Aplikácia má fungovať aj pri zablokovanom localStorage.
        }
    },

    restore: function () {
        let state = null;
        try {
            state = JSON.parse(localStorage.getItem(this.storageKey) || "null");
        } catch (error) {
            state = null;
        }
        if (!state || typeof state !== "object") return;

        const shell = document.getElementById("appShell");
        if (state.debugHidden) shell?.classList.add("debug-hidden");

        if (window.innerWidth <= 720) return;

        Object.entries(state.panels || {}).forEach(([id, panelState]) => {
            if (!panelState?.floating) return;
            const panel = document.getElementById(id);
            if (!panel) return;

            this.makeFloating(panel, {
                left: Number(panelState.left) || 8,
                top: Number(panelState.top) || 8,
                width: Number(panelState.width) || panel.offsetWidth,
                height: Number(panelState.height) || panel.offsetHeight
            });

            panel.style.left = (Number(panelState.left) || 8) + "px";
            panel.style.top = (Number(panelState.top) || 8) + "px";
            panel.style.width = Math.max(240, Number(panelState.width) || panel.offsetWidth) + "px";
            panel.style.height = Math.max(120, Number(panelState.height) || panel.offsetHeight) + "px";
            panel.style.zIndex = String(Math.max(this.zIndex, Number(panelState.zIndex) || this.zIndex));
            this.zIndex = Math.max(this.zIndex, Number(panelState.zIndex) || this.zIndex);
            window.requestAnimationFrame(() => this.keepInViewport(panel));
        });
    }
};

document.addEventListener("DOMContentLoaded", () => {
    window.WorkspacePanels.init();
});

(() => {
    "use strict";

    if (window.__termikaQuickToolDockControllerLoaded) return;
    window.__termikaQuickToolDockControllerLoaded = true;

    const STORAGE_KEY = "termikaXC.quickToolDock.visible.v1";
    let dock = null;
    let navButton = null;
    let displayButton = null;

    function readVisible() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved === null ? true : saved !== "false";
        } catch (_) {
            return true;
        }
    }

    function saveVisible(visible) {
        try {
            localStorage.setItem(STORAGE_KEY, visible ? "true" : "false");
        } catch (_) {}
    }

    function updateControl(button, visible) {
        if (!button) return;
        button.classList.toggle("is-active", visible);
        button.setAttribute("aria-pressed", visible ? "true" : "false");
        button.title = visible
            ? "Panel nástrojov je zobrazený · kliknutím skryť"
            : "Panel nástrojov je skrytý · kliknutím zobraziť";
    }

    function setVisible(visible, { save = true } = {}) {
        dock = dock || document.getElementById("quickToolDock");
        if (!dock) return false;
        dock.hidden = !visible;
        dock.dataset.visible = visible ? "true" : "false";
        updateControl(navButton, visible);
        updateControl(displayButton, visible);
        if (save) saveVisible(visible);
        window.dispatchEvent(new CustomEvent("termika:quick-tool-dock-visibility", {
            detail: { visible }
        }));
        return true;
    }

    function toggleVisible() {
        dock = dock || document.getElementById("quickToolDock");
        if (!dock) return;
        setVisible(dock.hidden);
    }

    function findNavMeta() {
        return document.querySelector("#explorerNavShell .explorer-nav-meta")
            || document.querySelector("#navShell .nav-meta");
    }

    function createNavButton() {
        if (navButton?.isConnected) return navButton;
        const navMeta = findNavMeta();
        if (!navMeta) return null;

        navButton = document.createElement("button");
        navButton.id = "workspaceQuickToolsToggle";
        navButton.type = "button";
        navButton.textContent = "NÁSTROJE";
        navButton.className = document.getElementById("explorerNavShell")
            ? "explorer-theme-toggle"
            : "nav-theme-toggle";
        navButton.addEventListener("click", toggleVisible);

        const hudButton = document.getElementById("workspaceHudToggle");
        const flightButton = document.getElementById("workspaceFlightToggle");
        const anchor = flightButton?.parentElement === navMeta
            ? flightButton.nextSibling
            : (hudButton?.parentElement === navMeta ? hudButton.nextSibling : null);
        if (anchor) navMeta.insertBefore(navButton, anchor);
        else {
            const themeButton = document.getElementById("explorerThemeToggle")
                || document.getElementById("navThemeToggleButton");
            if (themeButton?.parentElement === navMeta) navMeta.insertBefore(navButton, themeButton);
            else navMeta.appendChild(navButton);
        }
        return navButton;
    }

    function createDisplayButton() {
        if (displayButton?.isConnected) return displayButton;
        const section = document.querySelector('.nav-drawer-section[data-nav-section="display"] .action-row')
            || document.querySelector('[data-nav-section="display"] .action-row');
        if (!section) return null;

        displayButton = document.createElement("button");
        displayButton.id = "displayQuickToolsToggle";
        displayButton.type = "button";
        displayButton.textContent = "Panel nástrojov";
        displayButton.addEventListener("click", toggleVisible);
        section.prepend(displayButton);
        return displayButton;
    }

    function toggleWindow(targetId, sourceButton) {
        const target = document.getElementById(targetId);
        if (!target) return false;
        const willShow = target.hidden || getComputedStyle(target).display === "none";
        target.hidden = !willShow;
        sourceButton?.classList.toggle("is-active", willShow);
        sourceButton?.setAttribute("aria-pressed", willShow ? "true" : "false");
        if (willShow) {
            window.TermikaCCWindowManager?.bringToFront?.(target);
            target.dispatchEvent(new CustomEvent("termika:window-shown", { bubbles: true }));
        }
        return true;
    }

    function installReversibleWindowButtons() {
        document.addEventListener("click", event => {
            const button = event.target.closest("[data-show-window]");
            if (!button) return;
            const targetId = button.dataset.showWindow;
            if (!targetId) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            toggleWindow(targetId, button);
        }, true);
    }

    function synchronizeWindowButtons() {
        document.querySelectorAll("[data-show-window]").forEach(button => {
            const target = document.getElementById(button.dataset.showWindow || "");
            if (!target) return;
            const visible = !target.hidden && getComputedStyle(target).display !== "none";
            button.classList.toggle("is-active", visible);
            button.setAttribute("aria-pressed", visible ? "true" : "false");
        });
    }

    function initialize() {
        dock = document.getElementById("quickToolDock");
        if (!dock) return;
        setVisible(readVisible(), { save: false });
        installReversibleWindowButtons();

        const timer = window.setInterval(() => {
            createNavButton();
            createDisplayButton();
            setVisible(!dock.hidden, { save: false });
            synchronizeWindowButtons();
            if (navButton && (displayButton || !document.getElementById("navShell"))) {
                window.clearInterval(timer);
            }
        }, 120);
        window.setTimeout(() => window.clearInterval(timer), 30000);
    }

    window.TermikaQuickToolDock = Object.freeze({
        show: () => setVisible(true),
        hide: () => setVisible(false),
        toggle: toggleVisible,
        isVisible: () => Boolean(dock && !dock.hidden)
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})();

(() => {
    'use strict';

    const sidebar = document.getElementById('sidebar');
    const sidebarScroll = document.getElementById('sidebarScroll');
    const mapWrap = document.getElementById('mapWrap');

    if (!sidebar || !sidebarScroll || !mapWrap || document.getElementById('explorerNavShell')) return;

    const STORAGE_DOCK_KEY = 'termikaXC.explorer.navDock.v1';
    const PANEL_DEFINITIONS = [
        { id: 'task', label: 'Úloha', hint: 'názov, pilot a typ trate' },
        { id: 'route', label: 'Trať', hint: 'nacvakávanie a práca s trasou' },
        { id: 'start', label: 'Štart', hint: 'štartová páska a výšková podmienka' },
        { id: 'points', label: 'Body', hint: 'zoznam a parametre otočných bodov' },
        { id: 'profile', label: 'Profil', hint: 'výškový profil terénu pod traťou' },
        { id: 'export', label: 'Export', hint: 'súhrn, JSON a plánovací IGC' }
    ];

    const originalSections = Array.from(sidebarScroll.querySelectorAll(':scope > .section'));
    const profileSection = document.createElement('section');
    profileSection.className = 'section explorer-profile-section';
    profileSection.innerHTML = `
        <h2>Výškový profil <small>terén pod plánovanou traťou</small></h2>
        <div class="explorer-profile-toolbar">
            <div class="explorer-profile-copy">
                <strong>Profil celej úlohy</strong>
                <span>Od štartu cez otočné body až po uzavretie trate.</span>
            </div>
            <label class="explorer-profile-samples">Vzorky
                <select id="explorerProfileSamples" aria-label="Počet vzoriek výškového profilu">
                    <option value="120">120</option>
                    <option value="240" selected>240</option>
                    <option value="400">400</option>
                </select>
            </label>
            <button id="explorerProfileRefresh" type="button">↻ Prepočítať</button>
        </div>
        <div id="explorerProfileStatus" class="status" data-kind="info">Otvor profil po nakreslení aspoň jedného úseku trate.</div>
        <div class="explorer-profile-stats" aria-label="Súhrn výškového profilu">
            <div><strong id="profileDistance">—</strong><span>VZDIALENOSŤ</span></div>
            <div><strong id="profileMinHeight">—</strong><span>MINIMUM</span></div>
            <div><strong id="profileMaxHeight">—</strong><span>MAXIMUM</span></div>
            <div><strong id="profileAscent">—</strong><span>STÚPANIE TERÉNU</span></div>
            <div><strong id="profileDescent">—</strong><span>KLESANIE TERÉNU</span></div>
        </div>
        <div id="explorerProfileChartWrap" class="explorer-profile-chart-wrap">
            <canvas id="explorerProfileCanvas" aria-label="Graf výškového profilu trate"></canvas>
            <div id="explorerProfileTooltip" class="explorer-profile-tooltip" hidden></div>
            <div id="explorerProfileEmpty" class="explorer-profile-empty">Nakresli alebo načítaj trať a otvor túto roletu.</div>
        </div>
        <p class="hint">Profil zobrazuje model terénu pod spojnicou bodov. Značky v grafe označujú štart a jednotlivé otočné body.</p>
    `;

    const exportAnchor = originalSections[4] || null;
    sidebarScroll.insertBefore(profileSection, exportAnchor);

    const navShell = document.createElement('div');
    navShell.id = 'explorerNavShell';
    navShell.dataset.dock = 'top';
    navShell.innerHTML = `
        <div class="explorer-nav-bar" role="navigation" aria-label="Navigácia Prieskumníka">
            <div class="explorer-nav-brand">
                <strong>TermikaXC · PRIESKUMNÍK</strong>
                <span id="explorerNavSummary">Čistá mapa · otvor sekciu iba vtedy, keď ju potrebuješ</span>
            </div>
            <div class="explorer-nav-primary" role="tablist" aria-label="Nástroje plánovania preletu">
                ${PANEL_DEFINITIONS.map((panel) => `<button type="button" class="explorer-nav-tab" data-explorer-panel-target="${panel.id}" role="tab" aria-selected="false">${panel.label}</button>`).join('')}
                <button type="button" class="explorer-nav-route" data-explorer-route="terrain">Analýza</button>
                <button type="button" class="explorer-nav-route" data-explorer-route="home">3D let</button>
            </div>
            <div class="explorer-nav-meta">
                <label class="explorer-nav-dock-picker"><span>Lišta</span>
                    <select id="explorerNavDock" aria-label="Ukotvenie navigačnej lišty">
                        <option value="top">Hore</option>
                        <option value="bottom">Dole</option>
                        <option value="left">Vľavo</option>
                        <option value="right">Vpravo</option>
                    </select>
                </label>
                <button id="explorerNavClose" class="explorer-nav-close" type="button" title="Zavrieť roletu" aria-label="Zavrieť roletu">×</button>
            </div>
        </div>
    `;

    mapWrap.appendChild(navShell);
    navShell.appendChild(sidebar);
    sidebar.classList.add('explorer-nav-drawer');
    sidebar.classList.remove('is-open');

    const sections = Array.from(sidebarScroll.querySelectorAll(':scope > .section'));
    const footer = sidebar.querySelector(':scope > .footer-actions');

    PANEL_DEFINITIONS.forEach((definition, index) => {
        const section = sections[index];
        if (!section) return;
        section.dataset.explorerPanel = definition.id;
        section.setAttribute('role', 'tabpanel');
        section.setAttribute('aria-label', definition.label);
        section.hidden = false;
    });

    const exportSection = sidebarScroll.querySelector('[data-explorer-panel="export"]');
    if (footer && exportSection) exportSection.appendChild(footer);

    const navSummary = document.getElementById('explorerNavSummary');
    const dockSelect = document.getElementById('explorerNavDock');
    const closeButton = document.getElementById('explorerNavClose');
    const tabs = Array.from(navShell.querySelectorAll('[data-explorer-panel-target]'));
    let activePanel = null;

    function panelSection(panelId) {
        return sidebarScroll.querySelector(`[data-explorer-panel="${panelId}"]`);
    }

    function updateSummary() {
        if (!navSummary) return;
        const points = document.getElementById('summaryPoints')?.textContent?.trim() || '0';
        const distance = document.getElementById('summaryDistance')?.textContent?.trim() || '0,0';
        const start = document.getElementById('summaryStart')?.textContent?.trim() || 'NIE';
        navSummary.textContent = `${points} bodov · ${distance} km · štartová páska: ${start.toLowerCase()}`;
    }

    function closeDrawer({ focusTab = false } = {}) {
        const formerPanel = activePanel;
        activePanel = null;
        sidebar.classList.remove('is-open');
        sections.forEach((section) => section.classList.remove('is-active'));
        tabs.forEach((tab) => {
            tab.classList.remove('is-active');
            tab.setAttribute('aria-selected', 'false');
        });
        document.dispatchEvent(new CustomEvent('termikaxc:explorer-panel-close', {
            detail: { panelId: formerPanel }
        }));
        if (focusTab && formerPanel) {
            navShell.querySelector(`[data-explorer-panel-target="${formerPanel}"]`)?.focus();
        }
    }

    function openPanel(panelId) {
        const section = panelSection(panelId);
        const tab = navShell.querySelector(`[data-explorer-panel-target="${panelId}"]`);
        if (!section || !tab) return;

        if (activePanel === panelId && sidebar.classList.contains('is-open')) {
            closeDrawer({ focusTab: true });
            return;
        }

        activePanel = panelId;
        sections.forEach((candidate) => candidate.classList.toggle('is-active', candidate === section));
        tabs.forEach((candidate) => {
            const isActive = candidate === tab;
            candidate.classList.toggle('is-active', isActive);
            candidate.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        sidebar.classList.add('is-open');
        sidebar.scrollTop = 0;
        document.dispatchEvent(new CustomEvent('termikaxc:explorer-panel-open', {
            detail: { panelId }
        }));
    }

    function applyDock(dock) {
        const allowed = new Set(['top', 'bottom', 'left', 'right']);
        const nextDock = allowed.has(dock) ? dock : 'top';
        navShell.dataset.dock = nextDock;
        document.body.dataset.explorerDock = nextDock;
        dockSelect.value = nextDock;
        try {
            localStorage.setItem(STORAGE_DOCK_KEY, nextDock);
        } catch (error) {
            console.warn('Ukotvenie navigácie sa nepodarilo uložiť:', error);
        }
    }

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => openPanel(tab.dataset.explorerPanelTarget));
    });

    closeButton.addEventListener('click', () => closeDrawer({ focusTab: true }));
    dockSelect.addEventListener('change', () => applyDock(dockSelect.value));

    navShell.querySelector('[data-explorer-route="terrain"]')?.addEventListener('click', () => {
        window.location.href = 'terrain-analysis-test.php';
    });

    navShell.querySelector('[data-explorer-route="home"]')?.addEventListener('click', () => {
        window.location.href = 'index.php';
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && sidebar.classList.contains('is-open')) closeDrawer({ focusTab: true });
    });

    document.getElementById('cesiumContainer')?.addEventListener('pointerdown', () => {
        if (sidebar.classList.contains('is-open')) closeDrawer();
    }, { passive: true });

    document.getElementById('addPointsButton')?.addEventListener('click', () => {
        window.setTimeout(() => closeDrawer(), 0);
    });

    document.getElementById('placeStartButton')?.addEventListener('click', () => {
        window.setTimeout(() => closeDrawer(), 0);
    });

    const summaryObserver = new MutationObserver(updateSummary);
    ['summaryPoints', 'summaryDistance', 'summaryStart'].forEach((id) => {
        const target = document.getElementById(id);
        if (target) summaryObserver.observe(target, { childList: true, characterData: true, subtree: true });
    });

    let savedDock = 'top';
    try {
        savedDock = localStorage.getItem(STORAGE_DOCK_KEY) || 'top';
    } catch (error) {
        console.warn('Ukotvenie navigácie sa nepodarilo načítať:', error);
    }

    applyDock(savedDock);
    updateSummary();
    closeDrawer();
})();
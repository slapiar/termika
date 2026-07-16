(() => {
    'use strict';

    const navShell = document.getElementById('explorerNavShell');
    const navBar = navShell?.querySelector('.explorer-nav-bar');
    const navMeta = navShell?.querySelector('.explorer-nav-meta');
    const closeButton = document.getElementById('explorerNavClose');

    if (!navShell || !navBar || !navMeta || document.getElementById('explorerThemeToggle')) return;

    const STORAGE_THEME_KEY = 'termikaXC.explorer.theme.v1';
    const themeButton = document.createElement('button');
    themeButton.id = 'explorerThemeToggle';
    themeButton.className = 'explorer-theme-toggle';
    themeButton.type = 'button';

    if (closeButton) {
        navMeta.insertBefore(themeButton, closeButton);
    } else {
        navMeta.appendChild(themeButton);
    }

    function normalizeTheme(theme) {
        return theme === 'dark' ? 'dark' : 'light';
    }

    function applyTheme(theme, { save = true } = {}) {
        const nextTheme = normalizeTheme(theme);
        document.body.dataset.explorerTheme = nextTheme;
        document.body.dataset.theme = nextTheme;

        const isLight = nextTheme === 'light';
        themeButton.textContent = isLight ? '☀' : '☾';
        themeButton.setAttribute('aria-pressed', isLight ? 'false' : 'true');
        themeButton.setAttribute(
            'aria-label',
            isLight ? 'Aktuálny svetlý režim. Prepnúť na tmavý.' : 'Aktuálny tmavý režim. Prepnúť na svetlý.'
        );
        themeButton.title = isLight ? 'Svetlý režim · prepnúť na tmavý' : 'Tmavý režim · prepnúť na svetlý';

        if (save) {
            try {
                localStorage.setItem(STORAGE_THEME_KEY, nextTheme);
            } catch (error) {
                console.warn('Farebný režim Prieskumníka sa nepodarilo uložiť:', error);
            }
        }
    }

    function updateNavHeight() {
        const height = Math.ceil(navBar.getBoundingClientRect().height);
        document.documentElement.style.setProperty('--explorer-nav-bar-height', `${height}px`);
    }

    themeButton.addEventListener('click', () => {
        applyTheme(document.body.dataset.explorerTheme === 'dark' ? 'light' : 'dark');
    });

    let savedTheme = 'light';
    try {
        savedTheme = localStorage.getItem(STORAGE_THEME_KEY) || 'light';
    } catch (error) {
        console.warn('Farebný režim Prieskumníka sa nepodarilo načítať:', error);
    }

    applyTheme(savedTheme, { save: false });
    updateNavHeight();

    if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(updateNavHeight);
        observer.observe(navBar);
    } else {
        window.addEventListener('resize', updateNavHeight, { passive: true });
    }
})();

/* CC host proxy. Implementácia patrí modulu time-badges. */
(() => {
    'use strict';

    if (window.__termikaTimeBadgesHostProxyLoaded) return;
    window.__termikaTimeBadgesHostProxyLoaded = true;

    const currentScript = document.currentScript;
    const baseUrl = currentScript?.src || document.baseURI;
    const styleUrl = new URL('../../ux/workbench-shell/time-badges/time-badges.css?v=1.0.0', baseUrl).href;
    const moduleUrl = new URL('../../ux/workbench-shell/time-badges/time-badges.js?v=1.0.0', baseUrl).href;

    if (!document.querySelector('link[data-tx-module-style="time-badges"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = styleUrl;
        link.dataset.txModuleStyle = 'time-badges';
        document.head.appendChild(link);
    }

    if (!window.TermikaTimeBadges && !document.querySelector('script[data-tx-module="time-badges"]')) {
        const script = document.createElement('script');
        script.src = moduleUrl;
        script.async = false;
        script.dataset.txModule = 'time-badges';
        (currentScript?.parentNode || document.head).insertBefore(script, currentScript?.nextSibling || null);
    }
})();

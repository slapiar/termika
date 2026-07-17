/* @cc-owned window-manager */
(() => {
  'use strict';

  if (window.TermikaCCWindowManager) return;

  let highestZ = 20;
  let initialized = false;
  const disposers = [];

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function readWorkspaceBounds(windowEl = null) {
    const navShell = document.getElementById('navShell');
    const dock = ['top', 'bottom', 'left', 'right'].includes(navShell?.dataset?.dock)
      ? navShell.dataset.dock
      : 'top';
    const navRect = navShell?.getBoundingClientRect?.() || null;

    let minLeft = 0;
    let minTop = 0;
    let maxRight = window.innerWidth;
    let maxBottom = window.innerHeight;

    if (navRect) {
      if (dock === 'top') {
        minTop = Math.max(0, Math.ceil(navRect.bottom));
      } else if (dock === 'bottom') {
        maxBottom = Math.min(window.innerHeight, Math.floor(navRect.top));
      } else if (dock === 'left') {
        minLeft = Math.max(0, Math.ceil(navRect.right));
      } else if (dock === 'right') {
        maxRight = Math.min(window.innerWidth, Math.floor(navRect.left));
      }
    }

    if (maxRight <= minLeft) {
      minLeft = 0;
      maxRight = window.innerWidth;
    }
    if (maxBottom <= minTop) {
      minTop = 0;
      maxBottom = window.innerHeight;
    }

    const width = Math.max(0, windowEl?.offsetWidth || 0);
    const height = Math.max(0, windowEl?.offsetHeight || 0);
    const maxLeft = Math.max(minLeft, maxRight - width);
    const maxTop = Math.max(minTop, maxBottom - height);

    return { minLeft, minTop, maxRight, maxBottom, maxLeft, maxTop };
  }

  function keepInViewport(windowEl) {
    if (!windowEl) return;
    const rect = windowEl.getBoundingClientRect();
    const bounds = readWorkspaceBounds(windowEl);
    const maxWidth = Math.max(180, bounds.maxRight - bounds.minLeft);
    const maxHeight = Math.max(120, bounds.maxBottom - bounds.minTop);

    const width = Math.min(rect.width, maxWidth);
    const height = Math.min(rect.height, maxHeight);
    const left = clamp(rect.left, bounds.minLeft, bounds.maxRight - width);
    const top = clamp(rect.top, bounds.minTop, bounds.maxBottom - height);

    if (Math.abs(rect.width - width) > 0.5) {
      windowEl.style.width = Math.round(width) + 'px';
    }
    if (Math.abs(rect.height - height) > 0.5) {
      windowEl.style.height = Math.round(height) + 'px';
    }
    windowEl.style.left = Math.round(left) + 'px';
    windowEl.style.top = Math.round(top) + 'px';
    windowEl.style.right = 'auto';
    windowEl.style.bottom = 'auto';
    windowEl.style.transform = 'none';
  }

  function bringToFront(windowEl) {
    if (!windowEl) return;
    highestZ += 1;
    windowEl.style.zIndex = String(highestZ);
    keepInViewport(windowEl);
  }

  function listen(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    disposers.push(() => target.removeEventListener(type, listener, options));
  }

  function init(root = document) {
    if (initialized) return api;
    initialized = true;

    root.querySelectorAll('.floating-window').forEach((windowEl) => {
      const header = windowEl.querySelector('.window-header');
      if (!header) return;
      let dragState = null;

      listen(windowEl, 'pointerdown', () => bringToFront(windowEl));
      listen(header, 'pointerdown', (event) => {
        if (event.target.closest('button')) return;
        const rect = windowEl.getBoundingClientRect();
        Object.assign(windowEl.style, {
          left: rect.left + 'px', top: rect.top + 'px', right: 'auto', bottom: 'auto', transform: 'none',
        });
        dragState = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
        header.setPointerCapture(event.pointerId);
        event.preventDefault();
      });
      listen(header, 'pointermove', (event) => {
        if (!dragState) return;
        const bounds = readWorkspaceBounds(windowEl);
        const nextLeft = dragState.left + event.clientX - dragState.x;
        const nextTop = dragState.top + event.clientY - dragState.y;
        windowEl.style.left = clamp(nextLeft, bounds.minLeft, bounds.maxLeft) + 'px';
        windowEl.style.top = clamp(nextTop, bounds.minTop, bounds.maxTop) + 'px';
      });
      const stopDrag = () => { dragState = null; };
      listen(header, 'pointerup', stopDrag);
      listen(header, 'pointercancel', stopDrag);

      const closeButton = windowEl.querySelector('.close-window');
      if (closeButton) listen(closeButton, 'click', (event) => {
        event.stopPropagation();
        windowEl.hidden = true;
      });
    });

    root.querySelectorAll('[data-show-window]').forEach((button) => {
      listen(button, 'click', () => {
        const windowEl = root.getElementById(button.dataset.showWindow);
        if (!windowEl) return;
        windowEl.hidden = false;
        bringToFront(windowEl);
      });
    });
    listen(window, 'resize', () => root.querySelectorAll('.floating-window:not([hidden])').forEach(keepInViewport));

    const navShell = document.getElementById('navShell');
    if (navShell) {
      const dockObserver = new MutationObserver(() => {
        root.querySelectorAll('.floating-window:not([hidden])').forEach(keepInViewport);
      });
      dockObserver.observe(navShell, { attributes: true, attributeFilter: ['data-dock'] });
      disposers.push(() => dockObserver.disconnect());
    }

    window.TermikaHostContext?.provide('window-manager', api);
    return api;
  }

  function destroy() {
    while (disposers.length) disposers.pop()();
    initialized = false;
  }

  const api = Object.freeze({ init, destroy, bringToFront, keepInViewport });
  window.TermikaCCWindowManager = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  else init();
})();

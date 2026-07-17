/* @cc-owned window-manager */
(() => {
  'use strict';

  if (window.TermikaCCWindowManager) return;

  let highestZ = 20;
  let initialized = false;
  const disposers = [];

  function keepInViewport(windowEl) {
    if (!windowEl) return;
    const rect = windowEl.getBoundingClientRect();
    const maxLeft = Math.max(0, window.innerWidth - Math.min(rect.width, window.innerWidth));
    const maxTop = Math.max(0, window.innerHeight - 42);
    windowEl.style.left = Math.min(Math.max(0, rect.left), maxLeft) + 'px';
    windowEl.style.top = Math.min(Math.max(0, rect.top), maxTop) + 'px';
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
        windowEl.style.left = Math.max(0, Math.min(dragState.left + event.clientX - dragState.x, window.innerWidth - 80)) + 'px';
        windowEl.style.top = Math.max(0, Math.min(dragState.top + event.clientY - dragState.y, window.innerHeight - 36)) + 'px';
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

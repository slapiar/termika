/* @cc-owned host-context */
(() => {
  'use strict';

  if (window.TermikaHostContext) return;

  const state = new Map();
  const services = new Map();
  const events = new EventTarget();
  const cleanup = new Set();

  const context = Object.freeze({
    get(key, fallback = null) {
      return state.has(key) ? state.get(key) : fallback;
    },
    set(key, value) {
      state.set(key, value);
      events.dispatchEvent(new CustomEvent('state-change', { detail: { key, value } }));
      return value;
    },
    provide(name, service) {
      if (!name || service == null) throw new TypeError('Host service requires a name and value.');
      services.set(name, service);
      events.dispatchEvent(new CustomEvent('service-ready', { detail: { name, service } }));
      return service;
    },
    consume(name, fallback = null) {
      return services.has(name) ? services.get(name) : fallback;
    },
    on(type, listener, options) {
      events.addEventListener(type, listener, options);
      return () => events.removeEventListener(type, listener, options);
    },
    emit(type, detail = null) {
      return events.dispatchEvent(new CustomEvent(type, { detail }));
    },
    addCleanup(disposer) {
      if (typeof disposer !== 'function') throw new TypeError('Cleanup disposer must be a function.');
      cleanup.add(disposer);
      return () => cleanup.delete(disposer);
    },
    dispose() {
      for (const disposer of [...cleanup].reverse()) {
        try { disposer(); } catch (error) { console.error('[CC host-context] cleanup failed', error); }
      }
      cleanup.clear();
      services.clear();
      state.clear();
    },
  });

  window.addEventListener('beforeunload', () => context.dispose(), { once: true });
  window.TermikaHostContext = context;
})();

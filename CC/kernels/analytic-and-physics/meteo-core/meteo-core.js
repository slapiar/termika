const descriptor = Object.freeze({
  "id": "meteo-core",
  "group": "analytic-and-physics",
  "kind": "kernel",
  "origins": [
    "XC/js/meteo-core.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__meteo-core.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

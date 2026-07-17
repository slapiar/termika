const descriptor = Object.freeze({
  "id": "terrain-analysis",
  "group": "analytic-and-physics",
  "kind": "kernel",
  "origins": [
    "XC/js/terrain-analysis.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__terrain-analysis.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

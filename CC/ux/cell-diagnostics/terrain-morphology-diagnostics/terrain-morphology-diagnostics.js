const descriptor = Object.freeze({
  "id": "terrain-morphology-diagnostics",
  "group": "cell-diagnostics",
  "kind": "module",
  "origins": [
    "XC/js/terrain-morphology.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__terrain-morphology.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

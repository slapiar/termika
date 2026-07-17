const descriptor = Object.freeze({
  "id": "terrain-mesh-surface",
  "group": "terrain-visualization-layers",
  "kind": "module",
  "origins": [
    "XC/js/terrain-mesh-surface.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__terrain-mesh-surface.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

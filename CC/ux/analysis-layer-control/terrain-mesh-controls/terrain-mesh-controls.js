const descriptor = Object.freeze({
  "id": "terrain-mesh-controls",
  "group": "analysis-layer-control",
  "kind": "module",
  "origins": [
    "XC/js/terrain-mesh.js",
    "XC/js/terrain-mesh-surface.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__terrain-mesh.js",
  "source/XC__js__terrain-mesh-surface.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

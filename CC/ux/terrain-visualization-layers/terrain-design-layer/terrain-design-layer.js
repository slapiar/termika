const descriptor = Object.freeze({
  "id": "terrain-design-layer",
  "group": "terrain-visualization-layers",
  "kind": "module",
  "origins": [
    "XC/js/terrain-design.js",
    "XC/js/terrain-design-ui.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__terrain-design.js",
  "source/XC__js__terrain-design-ui.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

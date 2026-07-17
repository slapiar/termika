const descriptor = Object.freeze({
  "id": "terrain-contours-layer",
  "group": "terrain-visualization-layers",
  "kind": "module",
  "origins": [
    "XC/js/terrain-contours.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__terrain-contours.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

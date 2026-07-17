const descriptor = Object.freeze({
  "id": "cesium-basemap-toggle",
  "group": "cesium-basemap-control",
  "kind": "module",
  "origins": [
    "XC/js/terrain-basemap-visibility.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__terrain-basemap-visibility.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

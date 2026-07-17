const descriptor = Object.freeze({
  "id": "flight-track-renderer",
  "group": "flight-playback",
  "kind": "module",
  "origins": [
    "XC/js/cesium-render.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__cesium-render.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

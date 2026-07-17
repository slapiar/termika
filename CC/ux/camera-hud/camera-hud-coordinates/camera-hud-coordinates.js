const descriptor = Object.freeze({
  "id": "camera-hud-coordinates",
  "group": "camera-hud",
  "kind": "module",
  "origins": [
    "XC/js/terrain-camera-hud-coordinates.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__terrain-camera-hud-coordinates.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

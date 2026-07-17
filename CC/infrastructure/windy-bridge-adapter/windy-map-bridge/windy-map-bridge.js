const descriptor = Object.freeze({
  "id": "windy-map-bridge",
  "group": "windy-bridge-adapter",
  "kind": "infrastructure",
  "origins": [
    "XC/js/windy-map-bridge.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__windy-map-bridge.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

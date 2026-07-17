const descriptor = Object.freeze({
  "id": "skewt-panel",
  "group": "skewt-instrument",
  "kind": "module",
  "origins": [
    "XC/js/skewt-render.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__skewt-render.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

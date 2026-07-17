const descriptor = Object.freeze({
  "id": "wind-streamline-renderer",
  "group": "wind-render-service",
  "kind": "service",
  "origins": [
    "XC/js/wind-render.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__wind-render.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

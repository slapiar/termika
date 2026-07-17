const descriptor = Object.freeze({
  "id": "wind-temp-loader",
  "group": "temp-provider-service",
  "kind": "service",
  "origins": [
    "XC/js/wind-temp-loader.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__wind-temp-loader.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

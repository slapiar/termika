const descriptor = Object.freeze({
  "id": "style-loader",
  "group": "module-loader",
  "kind": "infrastructure",
  "origins": [
    "XC/js/termika-style-loader.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__termika-style-loader.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

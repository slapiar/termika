const descriptor = Object.freeze({
  "id": "analysis-focus-summary",
  "group": "analysis-focus-control",
  "kind": "module",
  "origins": [
    "XC/js/terrain-analysis-focus-ui.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__terrain-analysis-focus-ui.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

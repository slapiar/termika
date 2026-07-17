const descriptor = Object.freeze({
  "id": "cell-diagnostics",
  "group": "cell-diagnostics",
  "kind": "module",
  "origins": [
    "XC/terrain-analysis-test.php",
    "XC/js/terrain-analysis-diagnostics.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__terrain-analysis-diagnostics.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

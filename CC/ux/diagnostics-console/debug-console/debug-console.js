const descriptor = Object.freeze({
  "id": "debug-console",
  "group": "diagnostics-console",
  "kind": "module",
  "origins": [
    "XC/index.php",
    "XC/terrain-analysis-test.php",
    "XC/js/workspace-ui.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__workspace-ui.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

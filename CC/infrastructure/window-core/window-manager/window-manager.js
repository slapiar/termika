const descriptor = Object.freeze({
  "id": "window-manager",
  "group": "window-core",
  "kind": "module",
  "origins": [
    "XC/js/workspace-ui.js",
    "XC/terrain-analysis-test.php"
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

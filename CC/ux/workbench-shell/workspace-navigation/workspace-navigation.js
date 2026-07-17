const descriptor = Object.freeze({
  "id": "workspace-navigation",
  "group": "workbench-shell",
  "kind": "module",
  "origins": [
    "XC/js/explorer-nav.js",
    "XC/terrain-analysis-test.php"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__explorer-nav.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

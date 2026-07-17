const descriptor = Object.freeze({
  "id": "quick-tool-dock",
  "group": "workbench-shell",
  "kind": "module",
  "origins": [
    "XC/terrain-analysis-test.php"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

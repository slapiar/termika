const descriptor = Object.freeze({
  "id": "setup-launcher",
  "group": "workbench-shell",
  "kind": "module",
  "origins": [
    "XC/terrain-analysis-test.php",
    "XC/setup.php"
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

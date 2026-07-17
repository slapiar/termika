const descriptor = Object.freeze({
  "id": "temp-record-cleanup",
  "group": "temp-source-manager",
  "kind": "module",
  "origins": [
    "XC/terrain-analysis-test.php",
    "XC/genauto.php"
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

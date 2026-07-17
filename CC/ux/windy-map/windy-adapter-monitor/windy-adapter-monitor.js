const descriptor = Object.freeze({
  "id": "windy-adapter-monitor",
  "group": "windy-map",
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

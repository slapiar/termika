const descriptor = Object.freeze({
  "id": "generation-manager",
  "group": "generation-manager",
  "kind": "module",
  "origins": [
    "XC/index.php",
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

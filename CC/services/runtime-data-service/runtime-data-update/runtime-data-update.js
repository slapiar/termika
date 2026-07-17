const descriptor = Object.freeze({
  "id": "runtime-data-update",
  "group": "runtime-data-service",
  "kind": "service",
  "origins": [
    "XC/update.php"
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

const descriptor = Object.freeze({
  "id": "genauto-service",
  "group": "generation-storage-service",
  "kind": "service",
  "origins": [
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

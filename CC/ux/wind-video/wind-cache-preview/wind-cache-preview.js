const descriptor = Object.freeze({
  "id": "wind-cache-preview",
  "group": "wind-video",
  "kind": "module",
  "origins": [
    "XC/index.php"
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

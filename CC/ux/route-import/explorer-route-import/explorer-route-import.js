const descriptor = Object.freeze({
  "id": "explorer-route-import",
  "group": "route-import",
  "kind": "module",
  "origins": [
    "XC/js/explorer-import.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__explorer-import.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

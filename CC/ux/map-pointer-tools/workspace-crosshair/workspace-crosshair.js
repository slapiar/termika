const descriptor = Object.freeze({
  "id": "workspace-crosshair",
  "group": "map-pointer-tools",
  "kind": "module",
  "origins": [
    "XC/js/workspace-crosshair.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__workspace-crosshair.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

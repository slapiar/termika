const descriptor = Object.freeze({
  "id": "terrain-mesh",
  "group": "analytic-and-physics",
  "kind": "kernel",
  "origins": [
    "XC/js/terrain-mesh.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__terrain-mesh.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

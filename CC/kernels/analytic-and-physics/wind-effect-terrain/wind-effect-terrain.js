const descriptor = Object.freeze({
  "id": "wind-effect-terrain",
  "group": "analytic-and-physics",
  "kind": "kernel",
  "origins": [
    "XC/js/wind-effect-terrain.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__wind-effect-terrain.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

const descriptor = Object.freeze({
  "id": "wind-effects-core",
  "group": "analytic-and-physics",
  "kind": "kernel",
  "origins": [
    "XC/js/wind-effects-core.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__wind-effects-core.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

const descriptor = Object.freeze({
  "id": "wind-field",
  "group": "analytic-and-physics",
  "kind": "kernel",
  "origins": [
    "XC/js/wind-field.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__wind-field.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

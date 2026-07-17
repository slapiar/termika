const descriptor = Object.freeze({
  "id": "flight-simulator",
  "group": "flight-simulator",
  "kind": "module",
  "origins": [
    "XC/js/flight-simulator.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__flight-simulator.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

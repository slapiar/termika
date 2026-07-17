const descriptor = Object.freeze({
  "id": "flight-emergency-disengage",
  "group": "flight-simulator",
  "kind": "module",
  "origins": [
    "XC/js/flight-emergency-disengage.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__flight-emergency-disengage.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

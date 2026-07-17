const descriptor = Object.freeze({
  "id": "flight-simulator-toggle",
  "group": "flight-simulator",
  "kind": "module",
  "origins": [
    "XC/js/workspace-flight-toggle.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__workspace-flight-toggle.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

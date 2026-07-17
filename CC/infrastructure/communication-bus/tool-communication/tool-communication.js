const descriptor = Object.freeze({
  "id": "tool-communication",
  "group": "communication-bus",
  "kind": "infrastructure",
  "origins": [
    "XC/js/tool-communication.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__tool-communication.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

const descriptor = Object.freeze({
  "id": "explorer-analysis-bridge",
  "group": "explorer-analysis-transfer",
  "kind": "module",
  "origins": [
    "XC/js/explorer-analysis-bridge.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__explorer-analysis-bridge.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

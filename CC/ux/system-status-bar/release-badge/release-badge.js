const descriptor = Object.freeze({
  "id": "release-badge",
  "group": "system-status-bar",
  "kind": "module",
  "origins": [
    "XC/js/terrain-release-badge.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__terrain-release-badge.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

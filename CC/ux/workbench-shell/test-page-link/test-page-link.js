const descriptor = Object.freeze({
  "id": "test-page-link",
  "group": "workbench-shell",
  "kind": "module",
  "origins": [
    "XC/js/terrain-test-link.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__terrain-test-link.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

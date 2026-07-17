const descriptor = Object.freeze({
  "id": "wind-control-panel",
  "group": "wind-workbench",
  "kind": "module",
  "origins": [
    "XC/terrain-analysis-test.php",
    "XC/js/wind-ui.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__wind-ui.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

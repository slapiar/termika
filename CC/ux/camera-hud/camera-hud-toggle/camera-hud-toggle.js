const descriptor = Object.freeze({
  "id": "camera-hud-toggle",
  "group": "camera-hud",
  "kind": "module",
  "origins": [
    "XC/js/workspace-hud-toggle.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__workspace-hud-toggle.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

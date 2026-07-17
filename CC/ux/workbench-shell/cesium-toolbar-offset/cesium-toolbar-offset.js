const descriptor = Object.freeze({
  "id": "cesium-toolbar-offset",
  "group": "workbench-shell",
  "kind": "module",
  "origins": [
    "XC/js/workspace-cesium-toolbar-offset.js",
    "XC/asset/workspace-cesium-toolbar-offset.css"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__workspace-cesium-toolbar-offset.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

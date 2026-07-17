const descriptor = Object.freeze({
  "id": "route-task-planner",
  "group": "route-planner",
  "kind": "module",
  "origins": [
    "XC/explorer-core.php"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

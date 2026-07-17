const descriptor = Object.freeze({
  "id": "terrain-profile-dock",
  "group": "terrain-profile",
  "kind": "module",
  "origins": [
    "XC/js/explorer-profile-dock.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__explorer-profile-dock.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

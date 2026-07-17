const descriptor = Object.freeze({
  "id": "terrain-profile-follow",
  "group": "terrain-profile",
  "kind": "module",
  "origins": [
    "XC/js/explorer-profile-follow.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__explorer-profile-follow.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

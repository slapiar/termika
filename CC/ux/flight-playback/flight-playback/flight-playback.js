const descriptor = Object.freeze({
  "id": "flight-playback",
  "group": "flight-playback",
  "kind": "module",
  "origins": [
    "XC/index.php",
    "XC/js/pilot-network.js"
  ]
});

export function describe() {
  return descriptor;
}

export async function loadLegacy() {
  const sources = [
  "source/XC__js__pilot-network.js"
];
  for (const source of sources) {
    await import(new URL(source, import.meta.url));
  }
  return descriptor;
}

export default descriptor;

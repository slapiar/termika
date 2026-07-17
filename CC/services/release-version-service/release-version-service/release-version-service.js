const descriptor = Object.freeze({
  "id": "release-version-service",
  "group": "release-version-service",
  "kind": "service",
  "origins": [
    "XC/release-version.php",
    "XC/asset/RELEASE_VERSION.txt"
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

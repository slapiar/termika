const descriptor = Object.freeze({
  "id": "local-config-setup",
  "group": "local-config-service",
  "kind": "service",
  "origins": [
    "XC/setup.php",
    "XC/asset/local-config.php.example"
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

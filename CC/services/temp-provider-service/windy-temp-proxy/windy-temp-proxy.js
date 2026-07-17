const descriptor = Object.freeze({
  "id": "windy-temp-proxy",
  "group": "temp-provider-service",
  "kind": "service",
  "origins": [
    "XC/windy-temp-proxy.php"
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

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const xcRoot = path.join(root, 'XC');
const ccRoot = path.join(root, 'CC');
const appRoot = path.join(ccRoot, 'app');
const registry = JSON.parse(fs.readFileSync(path.join(ccRoot, 'registry', 'modules.json'), 'utf8'));

if (fs.existsSync(appRoot)) fs.rmSync(appRoot, { recursive: true });
fs.cpSync(xcRoot, appRoot, {
  recursive: true,
  filter(source) {
    const relative = path.relative(xcRoot, source).replaceAll('\\', '/');
    return relative !== 'asset/local-config.php' && relative !== '.local-config.php';
  },
});

const ownership = new Map();
const rank = { kernel: 0, infrastructure: 1, service: 2, module: 3 };
for (const item of registry.modules) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, item.path, 'module.json'), 'utf8'));
  for (let index = 0; index < manifest.origins.length; index += 1) {
    const origin = manifest.origins[index];
    if (!origin.startsWith('XC/js/') || !origin.endsWith('.js')) continue;
    const candidate = { item, copiedFile: manifest.copied_files[index] };
    const current = ownership.get(origin);
    if (!current || rank[item.kind] < rank[current.item.kind]) ownership.set(origin, candidate);
  }
}

const proxies = [];
for (const [origin, owner] of [...ownership].sort(([a], [b]) => a.localeCompare(b))) {
  const appFile = path.join(appRoot, origin.slice('XC/'.length));
  const moduleSource = path.join(root, owner.item.path, owner.copiedFile);
  const relativeSource = path.relative(path.dirname(appFile), moduleSource).replaceAll('\\', '/');
  const proxy = `/* CC host proxy. Implementácia patrí modulu ${owner.item.id}. */\n(() => {\n  const moduleUrl = new URL(${JSON.stringify(relativeSource)}, document.currentScript.src).href;\n  document.write('<script src="' + moduleUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '"><\\/script>');\n})();\n`;
  fs.writeFileSync(appFile, proxy);
  proxies.push({ source: origin, owner: owner.item.id, module: owner.item.path, proxy: path.relative(root, appFile) });
}

const cssOwnership = [
  {
    source: 'XC/asset/workspace-cesium-toolbar-offset.css',
    module: 'CC/ux/workbench-shell/cesium-toolbar-offset/source/XC__asset__workspace-cesium-toolbar-offset.css',
    owner: 'cesium-toolbar-offset',
  },
];
for (const entry of cssOwnership) {
  const appFile = path.join(appRoot, entry.source.slice('XC/'.length));
  if (!fs.existsSync(appFile)) continue;
  const moduleSource = path.join(root, entry.module);
  const relativeSource = path.relative(path.dirname(appFile), moduleSource).replaceAll('\\', '/');
  fs.writeFileSync(appFile, `/* CC host proxy. Štýl patrí modulu ${entry.owner}. */\n@import url(${JSON.stringify(relativeSource)});\n`);
}

function extractElement(hostRelative, id, modulePath, outputName) {
  const hostPath = path.join(appRoot, hostRelative);
  let host = fs.readFileSync(hostPath, 'utf8');
  const idPattern = new RegExp(`<([a-zA-Z][\\w:-]*)\\b[^>]*\\bid=["']${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`);
  const opening = idPattern.exec(host);
  if (!opening) throw new Error(`Missing #${id} in ${hostRelative}`);
  const tag = opening[1];
  const start = opening.index;
  const tokenPattern = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  tokenPattern.lastIndex = start;
  let depth = 0;
  let end = -1;
  for (let token = tokenPattern.exec(host); token; token = tokenPattern.exec(host)) {
    const value = token[0];
    if (value.startsWith(`</`)) depth -= 1;
    else if (!value.endsWith('/>')) depth += 1;
    if (depth === 0) {
      end = tokenPattern.lastIndex;
      break;
    }
  }
  if (end < 0) throw new Error(`Unclosed #${id} in ${hostRelative}`);

  const fragment = host.slice(start, end);
  const moduleDir = path.join(root, modulePath);
  fs.writeFileSync(path.join(moduleDir, outputName), `${fragment}\n`);
  const includeTarget = path.relative(path.dirname(hostPath), path.join(moduleDir, outputName)).replaceAll('\\', '/');
  const replacement = `<?php require __DIR__ . '/${includeTarget}'; ?>`;
  host = `${host.slice(0, start)}${replacement}${host.slice(end)}`;
  fs.writeFileSync(hostPath, host);
  return { host: `CC/app/${hostRelative}`, selector: `#${id}`, owner: modulePath, view: `${modulePath}/${outputName}` };
}

const views = [];
const viewMappings = [
  ['terrain-analysis-test.php', 'cursorCoordsBadge', 'CC/ux/map-pointer-tools/cursor-coordinate-badge', 'cursor-coordinate-badge.view.php'],
  ['terrain-analysis-test.php', 'appFooter', 'CC/ux/system-status-bar/release-footer', 'release-footer.view.php'],
  ['terrain-analysis-test.php', 'legend', 'CC/ux/terrain-legend/terrain-legend', 'terrain-legend.view.php'],
  ['terrain-analysis-test.php', 'cellDiagnostics', 'CC/ux/cell-diagnostics/cell-diagnostics', 'cell-diagnostics.view.php'],
  ['terrain-analysis-test.php', 'windyMapWindow', 'CC/ux/windy-map/windy-map-window', 'windy-map-window.view.php'],
  ['terrain-analysis-test.php', 'debugConsole', 'CC/ux/diagnostics-console/debug-console', 'debug-console.terrain.view.php'],
  ['terrain-analysis-test.php', 'quickToolDock', 'CC/ux/workbench-shell/quick-tool-dock', 'quick-tool-dock.view.php'],
  ['terrain-analysis-test.php', 'navShell', 'CC/ux/workbench-shell/workspace-navigation', 'workspace-navigation.terrain.view.php'],
  ['index.php', 'windCachePreview', 'CC/ux/wind-video/wind-cache-preview', 'wind-cache-preview.view.php'],
  ['index.php', 'flightControls', 'CC/ux/flight-playback/flight-playback', 'flight-playback-controls.view.php'],
  ['index.php', 'leftPanel', 'CC/ux/pilot-physiology-panel/pilot-physiology-panel', 'pilot-physiology-panel.view.php'],
  ['index.php', 'rightPanel', 'CC/ux/flight-meteo-panel/flight-meteo-panel', 'flight-meteo-panel.view.php'],
  ['index.php', 'debugConsole', 'CC/ux/diagnostics-console/debug-console', 'debug-console.index.view.php'],
  ['index.php', 'skewTPanel', 'CC/ux/skewt-instrument/skewt-panel', 'skewt-panel.view.php'],
];
for (const mapping of viewMappings) views.push(extractElement(...mapping));
const cursorView = views.find(view => view.selector === '#cursorCoordsBadge');
if (cursorView) cursorView.host = 'CC/ux/workbench-shell/quick-tool-dock/quick-tool-dock.view.php';

fs.writeFileSync(path.join(ccRoot, 'registry', 'host-code-owners.json'), `${JSON.stringify({
  generated_at: '2026-07-17',
  host: 'CC/app',
  javascript_proxy_count: proxies.length,
  proxies,
  css_proxies: cssOwnership,
  extracted_view_count: views.length,
  views,
  inline_script_extraction_status: 'PENDING',
}, null, 2)}\n`);

console.log(`Created CC/app with ${proxies.length} JavaScript module proxies and ${views.length} extracted views.`);

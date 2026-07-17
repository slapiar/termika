import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

const groups = {
  'system-status-bar': [
    ['release-footer', ['XC/terrain-analysis-test.php']],
    ['release-badge', ['XC/js/terrain-release-badge.js']],
  ],
  'window-core': [
    ['window-manager', ['XC/js/workspace-ui.js', 'XC/terrain-analysis-test.php']],
  ],
  'workbench-shell': [
    ['workspace-theme', ['XC/js/explorer-theme.js', 'XC/terrain-analysis-test.php']],
    ['workspace-navigation', ['XC/js/explorer-nav.js', 'XC/terrain-analysis-test.php']],
    ['quick-tool-dock', ['XC/terrain-analysis-test.php']],
    ['window-launcher-dock', ['XC/terrain-analysis-test.php']],
    ['cesium-toolbar-offset', ['XC/js/workspace-cesium-toolbar-offset.js', 'XC/asset/workspace-cesium-toolbar-offset.css']],
    ['setup-launcher', ['XC/terrain-analysis-test.php', 'XC/setup.php']],
    ['test-page-link', ['XC/js/terrain-test-link.js']],
  ],
  'map-pointer-tools': [
    ['workspace-crosshair', ['XC/js/workspace-crosshair.js']],
    ['cursor-coordinate-badge', ['XC/terrain-analysis-test.php']],
  ],
  'camera-hud': [
    ['terrain-camera-hud', ['XC/js/terrain-camera-hud.js']],
    ['camera-hud-coordinates', ['XC/js/terrain-camera-hud-coordinates.js']],
    ['camera-hud-toggle', ['XC/js/workspace-hud-toggle.js']],
  ],
  'cesium-basemap-control': [
    ['cesium-basemap-toggle', ['XC/js/terrain-basemap-visibility.js']],
  ],
  'diagnostics-console': [
    ['debug-console', ['XC/index.php', 'XC/terrain-analysis-test.php', 'XC/js/workspace-ui.js']],
  ],
  'terrain-legend': [
    ['terrain-legend', ['XC/terrain-analysis-test.php']],
  ],
  'route-planner': [
    ['route-task-planner', ['XC/explorer-core.php']],
  ],
  'route-import': [
    ['explorer-route-import', ['XC/js/explorer-import.js']],
  ],
  'terrain-profile': [
    ['terrain-profile', ['XC/js/explorer-profile.js']],
    ['terrain-profile-dock', ['XC/js/explorer-profile-dock.js']],
    ['terrain-profile-follow', ['XC/js/explorer-profile-follow.js']],
  ],
  'explorer-analysis-transfer': [
    ['explorer-analysis-bridge', ['XC/js/explorer-analysis-bridge.js']],
    ['explorer-analysis-arrival', ['XC/js/explorer-analysis-arrival.js']],
  ],
  'flight-data-loader': [
    ['igc-temp-loader', ['XC/index.php', 'XC/js/pilot-network.js']],
  ],
  'flight-playback': [
    ['flight-playback', ['XC/index.php', 'XC/js/pilot-network.js']],
    ['flight-track-renderer', ['XC/js/cesium-render.js']],
  ],
  'camera-mode-controller': [
    ['camera-mode-controller', ['XC/index.php', 'XC/js/pilot-network.js']],
  ],
  'pilot-physiology-panel': [
    ['pilot-physiology-panel', ['XC/index.php', 'XC/js/pilot-network.js']],
  ],
  'flight-meteo-panel': [
    ['flight-meteo-panel', ['XC/index.php', 'XC/js/pilot-network.js']],
  ],
  'skewt-instrument': [
    ['skewt-panel', ['XC/js/skewt-render.js']],
  ],
  'flight-simulator': [
    ['flight-simulator', ['XC/js/flight-simulator.js']],
    ['flight-simulator-toggle', ['XC/js/workspace-flight-toggle.js']],
    ['flight-emergency-disengage', ['XC/js/flight-emergency-disengage.js']],
  ],
  'terrain-source-manager': [
    ['source-manager', ['XC/terrain-analysis-test.php']],
  ],
  'temp-source-manager': [
    ['temp-source-selector', ['XC/terrain-analysis-test.php']],
    ['temp-record-cleanup', ['XC/terrain-analysis-test.php', 'XC/genauto.php']],
  ],
  'analysis-focus-control': [
    ['analysis-focus-controls', ['XC/terrain-analysis-test.php', 'XC/js/terrain-analysis-focus-ui.js']],
    ['analysis-focus-summary', ['XC/js/terrain-analysis-focus-ui.js']],
  ],
  'analysis-layer-control': [
    ['analysis-layer-toggle', ['XC/terrain-analysis-test.php']],
    ['terrain-mesh-controls', ['XC/js/terrain-mesh.js', 'XC/js/terrain-mesh-surface.js']],
  ],
  'cell-diagnostics': [
    ['cell-diagnostics', ['XC/terrain-analysis-test.php', 'XC/js/terrain-analysis-diagnostics.js']],
    ['terrain-hover-tooltip', ['XC/js/terrain-analysis-diagnostics.js']],
    ['terrain-morphology-diagnostics', ['XC/js/terrain-morphology.js']],
  ],
  'wind-workbench': [
    ['wind-control-panel', ['XC/terrain-analysis-test.php', 'XC/js/wind-ui.js']],
    ['wind-fps-indicator', ['XC/terrain-analysis-test.php']],
  ],
  'windy-map': [
    ['windy-map-window', ['XC/terrain-analysis-test.php']],
    ['windy-adapter-monitor', ['XC/terrain-analysis-test.php']],
  ],
  'temp-profile-workbench': [
    ['temp-profile-workbench', ['XC/terrain-analysis-test.php']],
  ],
  'screen-recorder': [
    ['screen-recorder', ['XC/terrain-analysis-test.php']],
  ],
  'generation-manager': [
    ['generation-manager', ['XC/index.php', 'XC/terrain-analysis-test.php', 'XC/genauto.php']],
  ],
  'wind-video': [
    ['wind-webm-export', ['XC/index.php']],
    ['wind-cache-preview', ['XC/index.php']],
  ],
  'terrain-visualization-layers': [
    ['terrain-contours-layer', ['XC/js/terrain-contours.js']],
    ['terrain-design-layer', ['XC/js/terrain-design.js', 'XC/js/terrain-design-ui.js']],
    ['terrain-mesh-wireframe', ['XC/js/terrain-mesh.js']],
    ['terrain-mesh-surface', ['XC/js/terrain-mesh-surface.js']],
  ],
};

const infrastructure = {
  'host-context': [['host-context', ['postupy/2026-07-17_06-06_CC-modularna-struktura-a-kontrola-postupov.md']]],
  'module-loader': [['style-loader', ['XC/js/termika-style-loader.js']]],
  'communication-bus': [['tool-communication', ['XC/js/tool-communication.js']]],
  'windy-bridge-adapter': [
    ['windy-map-bridge', ['XC/js/windy-map-bridge.js']],
    ['windy-map-adapter', ['XC/js/windy-map-adapter.js']],
  ],
};

const services = {
  'temp-provider-service': [
    ['wind-temp-loader', ['XC/js/wind-temp-loader.js']],
    ['windy-temp-proxy', ['XC/windy-temp-proxy.php']],
  ],
  'generation-storage-service': [['genauto-service', ['XC/genauto.php']]],
  'release-version-service': [['release-version-service', ['XC/release-version.php', 'XC/asset/RELEASE_VERSION.txt']]],
  'local-config-service': [['local-config-setup', ['XC/setup.php', 'XC/asset/local-config.php.example']]],
  'runtime-data-service': [['runtime-data-update', ['XC/update.php']]],
  'wind-render-service': [['wind-streamline-renderer', ['XC/js/wind-render.js']]],
};

const kernels = [
  ['terrain-analysis', ['XC/js/terrain-analysis.js']],
  ['terrain-analysis-core', ['XC/js/terrain-analysis-core.js']],
  ['terrain-analysis-geometry', ['XC/js/terrain-analysis-geometry.js']],
  ['terrain-analysis-diagnostics', ['XC/js/terrain-analysis-diagnostics.js']],
  ['terrain-morphology', ['XC/js/terrain-morphology.js']],
  ['terrain-mesh', ['XC/js/terrain-mesh.js']],
  ['wind-field', ['XC/js/wind-field.js']],
  ['wind-effects-core', ['XC/js/wind-effects-core.js']],
  ['wind-effect-terrain', ['XC/js/wind-effect-terrain.js']],
  ['wind-effect-surface', ['XC/js/wind-effect-surface.js']],
  ['meteo-core', ['XC/js/meteo-core.js']],
  ['glider-core', ['XC/js/glider-core.js']],
];

const registry = [];

function copyModule(section, group, id, origins, kind = 'module') {
  const dir = path.join(root, 'CC', section, group, id);
  const sourceDir = path.join(dir, 'source');
  fs.mkdirSync(sourceDir, { recursive: true });

  const copied = [];
  for (const origin of origins) {
    const input = path.join(root, origin);
    if (!fs.existsSync(input)) throw new Error(`Missing source: ${origin}`);
    const outputName = origin.replaceAll('/', '__');
    fs.copyFileSync(input, path.join(sourceDir, outputName));
    copied.push(`source/${outputName}`);
  }

  const jsOrigins = copied.filter(file => file.endsWith('.js'));
  const entry = `const descriptor = Object.freeze(${JSON.stringify({ id, group, kind, origins }, null, 2)});\n\nexport function describe() {\n  return descriptor;\n}\n\nexport async function loadLegacy() {\n  const sources = ${JSON.stringify(jsOrigins, null, 2)};\n  for (const source of sources) {\n    await import(new URL(source, import.meta.url));\n  }\n  return descriptor;\n}\n\nexport default descriptor;\n`;
  const entryPath = path.join(dir, `${id}.js`);
  const stylePath = path.join(dir, `${id}.css`);
  if (!fs.existsSync(entryPath) || !fs.readFileSync(entryPath, 'utf8').includes('@cc-owned')) {
    fs.writeFileSync(entryPath, entry);
  }
  if (!fs.existsSync(stylePath) || !fs.readFileSync(stylePath, 'utf8').includes('@cc-owned')) {
    fs.writeFileSync(stylePath, `/* Samostatná štýlová hranica modulu ${id}. Pôvodné štýly zostávajú zachované v zdrojových snapshotoch, kým sa bezpečne vyextrahujú. */\n`);
  }

  const manifest = {
    id,
    group,
    section,
    kind,
    entry: `${id}.js`,
    styles: [`${id}.css`],
    origins,
    copied_files: copied,
    migration: {
      source_copied: true,
      functional_status: id === 'release-footer' ? 'DEBUGGING_XC' : 'NEOVERENE',
      runtime_enabled: false,
    },
  };
  const manifestPath = path.join(dir, 'module.json');
  const currentManifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
  if (currentManifest?.migration?.runtime_enabled === true) {
    manifest.migration = currentManifest.migration;
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  registry.push({ id, group, section, kind, path: path.relative(root, dir), runtime_enabled: false });
}

for (const [group, modules] of Object.entries(groups)) {
  const section = group === 'window-core' ? 'infrastructure' : 'ux';
  for (const [id, origins] of modules) copyModule(section, group, id, origins);
}
for (const [group, modules] of Object.entries(infrastructure)) {
  const kind = group === 'host-context' ? 'architecture' : 'infrastructure';
  for (const [id, origins] of modules) copyModule('infrastructure', group, id, origins, kind);
}
for (const [group, modules] of Object.entries(services)) {
  for (const [id, origins] of modules) copyModule('services', group, id, origins, 'service');
}
for (const [id, origins] of kernels) copyModule('kernels', 'analytic-and-physics', id, origins, 'kernel');

registry.sort((a, b) => a.path.localeCompare(b.path));
fs.mkdirSync(path.join(root, 'CC', 'registry'), { recursive: true });
const transferable = registry.filter(item => item.kind !== 'kernel' && item.kind !== 'architecture');
const architectural = registry.filter(item => item.kind === 'architecture');
const kernelEntries = registry.filter(item => item.kind === 'kernel');
const groupRegistry = [...new Set(registry.filter(item => item.kind !== 'kernel').map(item => `${item.section}/${item.group}`))]
  .sort()
  .map(groupPath => {
    const [section, group] = groupPath.split('/');
    return {
      section,
      group,
      modules: registry.filter(item => item.kind !== 'kernel' && item.section === section && item.group === group).map(item => item.id),
    };
  });

fs.writeFileSync(path.join(root, 'CC', 'registry', 'modules.json'), `${JSON.stringify({
  generated_at: '2026-07-17',
  transferable_module_count: transferable.length,
  architectural_module_count: architectural.length,
  preserved_kernel_count: kernelEntries.length,
  total_entry_count: registry.length,
  modules: registry,
}, null, 2)}\n`);
fs.writeFileSync(path.join(root, 'CC', 'registry', 'groups.json'), `${JSON.stringify({
  generated_at: '2026-07-17',
  group_count: groupRegistry.length,
  groups: groupRegistry,
}, null, 2)}\n`);

console.log(`Created ${transferable.length} transferable modules, ${architectural.length} architectural modules and preserved ${kernelEntries.length} kernels.`);

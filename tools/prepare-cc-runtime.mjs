import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const appRoot = path.join(root, 'CC', 'app');

function readPage(name) {
  const filePath = path.join(appRoot, name);
  if (!fs.existsSync(filePath)) throw new Error(`Chýba ${filePath}`);
  return { filePath, source: fs.readFileSync(filePath, 'utf8'), changed: false };
}

function writePage(page) {
  if (page.changed) fs.writeFileSync(page.filePath, page.source);
}

function replaceOnce(page, search, replacement, errorMessage) {
  if (page.source.includes(replacement)) return;
  if (!page.source.includes(search)) throw new Error(errorMessage);
  page.source = page.source.replace(search, replacement);
  page.changed = true;
}

const index = readPage('index.php');
const safeFilter = `$mainOnlyExcludedScripts = [
    'terrain-analysis-runtime.js',
    'cc-host-context.js',
];
$jsFiles = array_values(array_unique(array_filter(
    $jsFiles,
    static fn(string $file): bool => !in_array($file, $mainOnlyExcludedScripts, true)
)));

`;
if (!index.source.includes("'terrain-analysis-runtime.js'") || !index.source.includes('$mainOnlyExcludedScripts')) {
  const usortMarker = 'usort($jsFiles, static function';
  const markerIndex = index.source.indexOf(usortMarker);
  if (markerIndex >= 0) {
    index.source = index.source.slice(0, markerIndex) + safeFilter + index.source.slice(markerIndex);
    index.changed = true;
  } else {
    console.warn('CC runtime: v index.php sa nenašiel blok usort; filter hostiteľských skriptov sa neaplikoval.');
  }
}

const fullscreenButton = '<button id="toggleFullscreenButton" type="button" title="Roztiahnuť mapu na celú obrazovku">⛶ Celá obrazovka</button>';
const oldTerrainButton = '<button type="button" onclick="window.location.href=\'terrain-analysis-test.php\'" title="Otvoriť testovaciu stránku analýzy terénu">⌁ Test terénu</button>';
const mainNavigation = `${fullscreenButton}
                    ${oldTerrainButton}
                    <button type="button" onclick="window.location.href='explorer-core.php'" title="Otvoriť plánovač preletu">⌖ Prieskumník</button>
                    <button type="button" onclick="window.location.href='setup.php'" title="Otvoriť nastavenie lokálnych kľúčov">⚙ Nastavenie</button>`;
if (!index.source.includes("onclick=\"window.location.href='explorer-core.php'\"")) {
  const duplicateAnchor = `${fullscreenButton}\n                    ${oldTerrainButton}`;
  const anchor = index.source.includes(duplicateAnchor) ? duplicateAnchor : fullscreenButton;
  replaceOnce(index, anchor, mainNavigation, 'V index.php chýba kotva hlavnej navigácie.');
}

if (index.source.includes("$assetVersion = '20260715-03';")) {
  index.source = index.source.replace("$assetVersion = '20260715-03';", "$assetVersion = '20260717-03';");
  index.changed = true;
}
writePage(index);

const explorer = readPage('explorer-core.php');
const explorerBack = '<a class="back-link" href="index.php">← 3D let</a>';
const explorerNav = `<nav class="brand-nav" aria-label="Navigácia TermikaXC">
                    <a class="back-link" href="index.php">← 3D let</a>
                    <a class="back-link" href="terrain-analysis-test.php">Test terénu</a>
                    <a class="back-link" href="setup.php">Nastavenie</a>
                </nav>`;
if (!explorer.source.includes('class="brand-nav"')) {
  replaceOnce(explorer, explorerBack, explorerNav, 'V explorer-core.php chýba spätný odkaz.');
  explorer.source = explorer.source.replace(
    '.back-link:hover { color: var(--cyan); }',
    `.back-link:hover { color: var(--cyan); }

        .brand-nav {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex-wrap: wrap;
            gap: 8px;
        }`
  );
  explorer.changed = true;
}
if (explorer.source.includes("$assetVersion = '20260715-01';")) {
  explorer.source = explorer.source.replace("$assetVersion = '20260715-01';", "$assetVersion = '20260717-05';");
  explorer.changed = true;
}
if (explorer.source.includes('    const restored = false;')) {
  explorer.source = explorer.source.replace('    const restored = false;', '    const restored = restore();');
  explorer.changed = true;
}
const emptyMessage = `    setStatus('Prieskumník je pripravený s prázdnou úlohou. Body alebo let načítaj až výslovným príkazom.', 'info');`;
const restoredMessage = `    if (restored) {
        setStatus('Obnovila som posledný rozpracovaný plán z tohto prehliadača.', 'ok');
        if (state.entities.length) setTimeout(focusTask, 500);
    }`;
if (explorer.source.includes(emptyMessage)) {
  explorer.source = explorer.source.replace(emptyMessage, restoredMessage);
  explorer.changed = true;
}
writePage(explorer);

const explorerImportPath = path.join(root, 'CC', 'ux', 'route-import', 'explorer-route-import', 'source', 'XC__js__explorer-import.js');
if (!fs.existsSync(explorerImportPath)) throw new Error(`Chýba ${explorerImportPath}`);
let explorerImport = fs.readFileSync(explorerImportPath, 'utf8');
const rawCoordinatePush = `            if (coordinate) {
                coordinates.push(coordinate);
                return;
            }`;
const safeCoordinatePush = `            if (coordinate) {
                const isNullPlaceholder = Math.abs(coordinate.lat) < 1e-10 && Math.abs(coordinate.lon) < 1e-10;
                if (!isNullPlaceholder) coordinates.push(coordinate);
                return;
            }`;
if (explorerImport.includes(rawCoordinatePush)) {
  explorerImport = explorerImport.replace(rawCoordinatePush, safeCoordinatePush);
  fs.writeFileSync(explorerImportPath, explorerImport);
}

const setup = readPage('setup.php');
const setupHeading = '<h1>TermikaXC setup bez terminalu</h1>';
const setupHeadingWithNav = `<nav class="cc-page-nav" aria-label="Navigácia TermikaXC">
            <a href="index.php">3D pracovisko</a>
            <a href="terrain-analysis-test.php">Test terénu</a>
            <a href="explorer-core.php">Prieskumník</a>
        </nav>
        ${setupHeading}`;
if (!setup.source.includes('class="cc-page-nav"')) {
  replaceOnce(setup, setupHeading, setupHeadingWithNav, 'V setup.php chýba hlavný nadpis.');
  setup.source = setup.source.replace(
    '        .meta { font-size:13px; color:#a4bfd1; }',
    `        .meta { font-size:13px; color:#a4bfd1; }
        .cc-page-nav { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
        .cc-page-nav a { padding:8px 10px; border:1px solid #4e7a93; border-radius:8px; background:#0d1a23; color:#dff8ff; text-decoration:none; }
        .cc-page-nav a:hover { border-color:#35d8ff; }`
  );
  setup.changed = true;
}
const oldSetupHint = '<p><strong>Dalej:</strong> po ulozeni otvor index.php alebo terrain-analysis-test.php a skontroluj, ze Cesium mapa nabehne.</p>';
const newSetupHint = '<p><strong>Ďalej:</strong> po uložení sa vráť do 3D pracoviska, testu terénu alebo Prieskumníka cez navigáciu vyššie.</p>';
if (setup.source.includes(oldSetupHint)) {
  setup.source = setup.source.replace(oldSetupHint, newSetupHint);
  setup.changed = true;
}
writePage(setup);

console.log('CC runtime pripravený: navigácia je zjednotená a Explorer ignoruje nulové IGC deklarácie 0°, 0°.');

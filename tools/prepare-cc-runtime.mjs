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
const plainList = '$jsFiles = array_values(array_unique($jsFiles));';
const safeList = `$mainOnlyExcludedScripts = [
    'terrain-analysis-runtime.js',
    'cc-host-context.js',
];
$jsFiles = array_values(array_unique(array_filter(
    $jsFiles,
    static fn(string $file): bool => !in_array($file, $mainOnlyExcludedScripts, true)
)));`;
replaceOnce(index, plainList, safeList, 'V index.php chýba zoznam JavaScriptov.');

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
  explorer.source = explorer.source.replace("$assetVersion = '20260715-01';", "$assetVersion = '20260717-04';");
  explorer.changed = true;
}
const autoRestore = '    const restored = restore();';
const emptyStart = '    const restored = false;';
if (explorer.source.includes(autoRestore)) {
  explorer.source = explorer.source.replace(autoRestore, emptyStart);
  explorer.changed = true;
}
const restoredMessage = `    if (restored) {
        setStatus('Obnovila som posledný rozpracovaný plán z tohto prehliadača.', 'ok');
        if (state.entities.length) setTimeout(focusTask, 500);
    }`;
const emptyMessage = `    setStatus('Prieskumník je pripravený s prázdnou úlohou. Body alebo let načítaj až výslovným príkazom.', 'info');`;
if (explorer.source.includes(restoredMessage)) {
  explorer.source = explorer.source.replace(restoredMessage, emptyMessage);
  explorer.changed = true;
}
writePage(explorer);

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

console.log('CC runtime pripravený: hlavná stránka, test, Prieskumník a Nastavenie majú spoločnú navigáciu; Prieskumník štartuje prázdny.');

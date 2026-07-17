import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const indexPath = path.join(root, 'CC', 'app', 'index.php');

if (!fs.existsSync(indexPath)) {
  throw new Error(`Chýba ${indexPath}`);
}

let source = fs.readFileSync(indexPath, 'utf8');
let changed = false;

const plainList = '$jsFiles = array_values(array_unique($jsFiles));';
const safeList = `$mainOnlyExcludedScripts = [
    'terrain-analysis-runtime.js',
    'cc-host-context.js',
  ];
$jsFiles = array_values(array_unique(array_filter(
    $jsFiles,
    static fn(string $file): bool => !in_array($file, $mainOnlyExcludedScripts, true)
)));`;

if (source.includes(plainList)) {
  source = source.replace(plainList, safeList);
  changed = true;
}

const fullscreenButton = '<button id="toggleFullscreenButton" type="button" title="Roztiahnuť mapu na celú obrazovku">⛶ Celá obrazovka</button>';
const terrainButton = '<button type="button" onclick="window.location.href=\'terrain-analysis-test.php\'" title="Otvoriť testovaciu stránku analýzy terénu">⌁ Test terénu</button>';

if (!source.includes(terrainButton)) {
  if (!source.includes(fullscreenButton)) {
    throw new Error('V index.php chýba kotva pre tlačidlo testovacej stránky.');
  }
  source = source.replace(fullscreenButton, `${fullscreenButton}\n                    ${terrainButton}`);
  changed = true;
}

if (source.includes("$assetVersion = '20260715-03';")) {
  source = source.replace("$assetVersion = '20260715-03';", "$assetVersion = '20260717-02';");
  changed = true;
}

if (changed) {
  fs.writeFileSync(indexPath, source);
  console.log('CC runtime pripravený: hlavný index už nenačítava terrain runtime a obsahuje odkaz na test terénu.');
} else {
  console.log('CC runtime je už pripravený.');
}

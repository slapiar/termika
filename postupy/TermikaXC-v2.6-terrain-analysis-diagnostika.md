# TermikaXC v2.6 – diagnostika geometrie terénu

## Stav

Prvá etapa v2.6 naďalej overuje iba geometriu skutočného Cesium terénu. Hotspot, slnečný model ani prúdenie sa zatiaľ nepočítajú.

Nad existujúci geometrický výpočet je vložené modulárne jadro. Doterajší výpočet sklonu, orientácie, zakrivenia a pracovnej klasifikácie zostáva zachovaný ako prvý analytický modul.

Prvotná analyzovaná oblasť sa chápe ako kruhový pohľad okolo zvoleného stredu. Pravouhlá mriežka zostáva iba vnútorným vzorkovacím nástrojom; bunky mimo zvoleného polomeru sa nezaraďujú do výslednej diagnostickej mapy.

Farebná geometrická vrstva je klikateľná. Kliknutie na farebný bod otvorí samostatné diagnostické okno s číselnými metrikami, aktuálnym klasifikačným pravidlom a dôvodmi zaradenia. Kliknutie mimo farebného bodu naďalej vyberá nový stred analýzy.

Nabehnutie kurzora nad farebný bod zobrazuje rýchly popis pracovného morfologického kandidáta, lokálnu geometrickú triedu a nadmorskú výšku.

## Vrstva A – lokálna geometria

Od pracovného kroku po release `v2.6.7` sa lokálna geometria oddeľuje od pracovného morfologického kandidáta.

Každá bunka dostáva samostatný objekt `geometry`:

```js
geometry = {
    localClass: "KONVEXNÁ",
    convexity: 0.83,
    concavity: 0.04,
    planarity: 0.11,
    breakIntensity: 0.72,
    wallness: 0.00,
    confidence: 0.78,
    method: "LOCAL_CURVATURE_V1",
    family: "G07"
};
```

Pracovné lokálne triedy:

- `ROVINNÁ`,
- `KONVEXNÁ`,
- `KONKÁVNA`,
- `ZLOMOVÁ`,
- `STENOVÁ`,
- `PRECHODOVÁ`.

Zásadné rozlíšenie:

> Lokálne rovinná bunka nemusí byť vodorovná. Aj naklonený svah môže byť lokálne rovinný, ak je približne planárny a nemá výraznú krivosť. Označenie `SVAH` patrí do morfologickej roly širšieho terénneho celku, nie do lokálnej geometrie.

Pôvodné označenia `REBRO_ALEBO_HRANA`, `ŽĽAB_ALEBO_ZBERNICA`, `SVAH`, `VYVÝŠENINA`, `DEPRESIA` a podobne zostávajú dočasnými morfologickými kandidátmi. Zatiaľ sa nemažú, pretože slúžia na porovnanie novej oddelenej vrstvy s doterajším správaním.

Pracovné prahy a koeficienty lokálnej geometrie sú diagnostické. Budú sa ladiť až podľa porovnania s vrstevnicami, 3D reliéfom a číselnými metrikami na rozličných typoch terénu.

## Pracovná paleta G01–G16

Po pripomienke po release `v2.6.7` bola paleta pripojená aj na skutočný renderer. Nestačí, aby farebná rodina existovala iba v dátach alebo diagnostike; musí určovať farbu bodu v Cesium a rovnaká paleta musí byť zobrazená v legende.

Samostatný modul `terrain-design.js`:

1. priradí pracovnú farebnú rodinu G01–G16 kombináciou lokálnej geometrie a doterajšieho morfologického kandidáta,
2. uloží rodinu do `cell.geometry.family`,
3. vytvorí objekt `cell.color`,
4. vypočíta skutočne vykreslený odtieň,
5. vykreslí body novou paletou.

Príklad:

```js
color = {
    family: "G07",
    familyName: "Hrebeň / rebro",
    baseHex: "#8B0000",
    finalHex: "#740000",
    kRel: 0.83,
    sRel: 0.62,
    bRel: 0.72,
    relativeHeight: null,
    relativeDepth: null,
    shadeMethod: "GEOMETRY_STRENGTH_V1"
};
```

Aktuálne sa odtieň mení iba podľa už vypočítaných veličín:

- `kRel` – sila konvexnosti alebo konkávnosti,
- `sRel` – relatívny sklon,
- `bRel` – intenzita zlomu.

Skutočné výškové tieňovanie podľa `hRel` a `dRel` sa zatiaľ nepoužíva, pretože relatívna poloha musí byť určená v rámci konkrétneho kopca, hrebeňa, rebra, žľabu, doliny alebo depresie. Nesmie sa nahradiť absolútnou výškou ani neoznačeným odhadom.

Rodiny `G11 – dolinová os` a `G13 – sedlo` sú už v palete a legende, ale ich automatické priradenie čaká na vrstvu B – morfologickú rolu.

## Súbory

- `XC/js/terrain-analysis-core.js` – modulárne jadro, register analytických vrstiev, kontrola závislostí, spoločný kontext a kruhová maska.
- `XC/js/terrain-analysis.js` – existujúci výpočet výškovej mriežky, sklonu, orientácie, zakrivenia a pracovnej klasifikácie.
- `XC/js/terrain-analysis-geometry.js` – adaptér modulu `geometry`; načíta aj moduly terénneho dizajnu a čaká na ich pripravenosť.
- `XC/js/terrain-analysis-diagnostics.js` – vysvetliteľná diagnostika bunky, hover popis a oddelená klasifikácia lokálnej geometrie.
- `XC/js/terrain-design.js` – paleta G01–G16, pracovné priradenie rodín, výpočet odtieňa a farebný renderer bodov.
- `XC/js/terrain-design-ui.js` – legenda G01–G16, doplnenie farebných údajov do diagnostiky a stavové hlásenie.
- `XC/js/terrain-contours.js` – samostatná analytická a zobrazovacia vrstva tmavošedých 3D vrstevníc.
- `XC/terrain-analysis-test.php` – samostatná testovacia stránka s ručným výberom analytických vrstiev, polomeru a rozostupu vzoriek, klikateľnou diagnostikou bodov a plávajúcimi oknami.
- `XC/js/terrain-analysis-ui.js` – pripravené ovládanie pre neskoršie zapojenie do hlavnej aplikácie.

## Aktuálny dátový tok

```text
zvolený stred
→ TerrainAnalysisCore
→ modul geometry
→ podkladová pravouhlá mriežka
→ výpočet sklonu a krivostí
→ lokálna geometria A
→ kruhová maska
→ pracovné priradenie farebnej rodiny G01–G16
→ odtieň podľa kRel + sRel + bRel
→ farebný renderer Cesium
→ hover: kandidát + lokálna geometria + výška
→ klik: geometrické metriky + rodina + základná farba + vykreslený odtieň
```

Vrstevnice zostávajú samostatnou vrstvou a slúžia ako geometrická referencia pri kontrole farebnej klasifikácie.

## Test

1. Otvoriť `XC/terrain-analysis-test.php` a vykonať tvrdé obnovenie `Ctrl + F5`.
2. Overiť, že okno legendy má názov `Legenda terénneho dizajnu · G01–G16`.
3. Overiť, že legenda obsahuje šestnásť základných farebných rodín z `TerenDizajnManual.md`.
4. Kliknutím na voľný terén vybrať stred analyzovanej oblasti.
5. Nastaviť polomer prvotného kruhového pohľadu a rozostup vzoriek.
6. Ponechať zapnuté vrstvy `Geometria reliéfu` a `Vrstevnice`.
7. Spustiť vybrané analýzy.
8. Overiť, že roviny a rovinné plochy sú zelené, svahy žlté až jantárové, konvexné tvary oranžové až červené, konkávne tvary tyrkysové až modré a zlomy fialové až purpurové.
9. Prechádzať kurzorom po farebných bodoch a porovnať pracovný morfologický kandidát s lokálnou triedou.
10. Kliknúť na bod a skontrolovať farebnú rodinu, základný HEX, vykreslený HEX, `kRel`, `sRel` a `bRel`.
11. Porovnať farbu a jej intenzitu s vrstevnicami, 3D reliéfom a číselnými metrikami.

## Aktuálne obmedzenia

Morfologická rola sa ešte neurčuje zo širšieho okolia. Doterajšie označenia sú iba kandidátske triedy a pracovné priradenie rodiny nie je konečná morfologická klasifikácia.

Nasledujúce hodnoty sa zatiaľ nevypočítavajú a zostávajú `null`:

- konečná morfologická rola,
- relatívna výška v rámci terénneho celku `hRel`,
- relatívna hĺbka v rámci konkávneho celku `dRel`.

Paleta G01–G16 je už aktívna. Aktuálne tieňovanie je pracovné a používa iba silu geometrie, sklon a intenzitu zlomu. Nie je ešte výškovým tieňovaním nadradeného terénneho celku.

## Ďalší krok

Nasleduje vrstva B – morfologická rola, odvodená zo širšieho okolia a zo spojitosti reliéfu:

- vrchol,
- hrebeň,
- rebro,
- svah,
- plošina,
- terasa,
- žľab,
- dolina,
- depresia,
- sedlo,
- horná hrana,
- dolná hrana,
- stena.

Vrstva B nahradí pracovné mapovanie rodín konečnejším priradením. Potom sa doplní relatívna výška alebo hĺbka, skutočné výškové tieňovanie a prirodzené zvýraznenie geometrických rozhraní.

Pred modelom Slnka zostáva potrebné zaviesť aj samostatnú analýzu členitosti, morfologických hraníc a otvorených smerov, podľa ktorých sa bude kruhový prvotný pohľad neskôr adaptívne rozširovať.

# TermikaXC v2.6 – diagnostika geometrie terénu

## Stav

Prvá etapa v2.6 naďalej overuje iba geometriu skutočného Cesium terénu. Hotspot, slnečný model ani prúdenie sa zatiaľ nepočítajú.

Od verzie `2.6.0-alpha.2` je nad existujúci geometrický výpočet vložené modulárne jadro. Doterajší výpočet sklonu, orientácie, zakrivenia a pracovnej klasifikácie zostáva zachovaný ako prvý analytický modul.

Prvotná analyzovaná oblasť sa chápe ako kruhový pohľad okolo zvoleného stredu. Pravouhlá mriežka zostáva iba vnútorným vzorkovacím nástrojom; bunky mimo zvoleného polomeru sa nezaraďujú do výslednej diagnostickej mapy.

Od pracovného kroku `20260712-07` je farebná geometrická vrstva klikateľná. Kliknutie na farebný bod otvorí samostatné diagnostické okno s číselnými metrikami, aktuálnym klasifikačným pravidlom a dôvodmi zaradenia. Kliknutie mimo farebného bodu naďalej vyberá nový stred analýzy.

Nabehnutie kurzora nad farebný bod zobrazuje rýchly popis pracovného morfologického kandidáta, lokálnu geometrickú triedu a nadmorskú výšku.

## Prvá vrstva terénneho dizajnu – lokálna geometria

Od pracovného kroku po release `v2.6.7` sa lokálna geometria oddeľuje od pracovného morfologického kandidáta.

Každá bunka dostáva samostatný objekt `geometry` s minimálne týmito údajmi:

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
    family: null
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

## Súbory

- `XC/js/terrain-analysis-core.js` – modulárne jadro, register analytických vrstiev, kontrola závislostí, spoločný kontext a kruhová maska.
- `XC/js/terrain-analysis.js` – existujúci výpočet výškovej mriežky, sklonu, orientácie, zakrivenia a pracovnej klasifikácie.
- `XC/js/terrain-analysis-geometry.js` – adaptér, ktorý registruje existujúcu geometrickú analýzu ako modul `geometry`.
- `XC/js/terrain-analysis-diagnostics.js` – vysvetliteľná diagnostika bunky, hover popis a prvá oddelená klasifikácia lokálnej geometrie.
- `XC/js/terrain-contours.js` – samostatná analytická a zobrazovacia vrstva tmavošedých 3D vrstevníc.
- `XC/terrain-analysis-test.php` – samostatná testovacia stránka s ručným výberom analytických vrstiev, polomeru a rozostupu vzoriek, klikateľnou diagnostikou bodov a plávajúcimi oknami.
- `XC/js/terrain-analysis-ui.js` – pripravené ovládanie pre neskoršie zapojenie do hlavnej aplikácie.

## Aktuálny dátový tok

```text
zvolený stred
→ TerrainAnalysisCore
→ výber zapnutých modulov
→ modul geometry
→ podkladová pravouhlá mriežka
→ výpočet sklonu a krivostí
→ lokálna geometria A
→ kruhová maska
→ spoločná vrstva layers.geometry
→ diagnostické zobrazenie v Cesium
→ hover: kandidát + lokálna geometria + výška
→ klik: metriky + pravidlá + dôvody klasifikácie
```

Vrstevnice zostávajú samostatnou vrstvou a slúžia ako geometrická referencia pri kontrole farebnej klasifikácie.

## Test

1. Otvoriť `XC/terrain-analysis-test.php`.
2. Kliknutím na voľný terén vybrať stred analyzovanej oblasti.
3. Nastaviť polomer prvotného kruhového pohľadu.
4. Nastaviť hrubý rozostup vzoriek.
5. Ponechať zapnuté vrstvy `Geometria reliéfu` a `Vrstevnice`.
6. Spustiť vybrané analýzy.
7. Prechádzať kurzorom po farebných bodoch a porovnať pracovný morfologický kandidát s novou lokálnou triedou.
8. Overiť najmä, že čistý naklonený svah môže byť lokálne `rovinný`, hoci jeho morfologický kandidát zostáva `svah`.
9. Kliknúť na farebný bod a porovnať lokálnu triedu, intenzitu konvexnosti, konkávnosti, rovinnosti a zlomu s vrstevnicami a 3D reliéfom.
10. Skontrolovať výrazné rebrá, žľaby, hrany, skalné steny, rovné svahy a prechodové oblasti.

## Aktuálne obmedzenia

Morfologická rola sa ešte neurčuje zo širšieho okolia. Doterajšie označenia sú iba kandidátske triedy a nesmú sa považovať za konečný výsledok.

Nasledujúce hodnoty sa zatiaľ nevypočítavajú a diagnostika ich zámerne ponecháva ako `null`:

- morfologická rola,
- farebná rodina G01 až G16,
- relatívna výška v rámci terénneho celku,
- relatívna hĺbka v rámci konkávneho celku.

Aktuálne farby zostávajú dočasnou diagnostickou paletou. Nie sú ešte konečnou implementáciou šestnástich farebných rodín z `postupy/TerenDizajnManual.md`.

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

Až kombinácia lokálnej geometrie a morfologickej roly určí výslednú farebnú rodinu G01 až G16. Následne sa doplní relatívna výška alebo hĺbka, dynamické tieňovanie a intenzita geometrického rozhrania.

Pred modelom Slnka zostáva potrebné zaviesť aj samostatnú analýzu členitosti, morfologických hraníc a otvorených smerov, podľa ktorých sa bude kruhový prvotný pohľad neskôr adaptívne rozširovať.
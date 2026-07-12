# TermikaXC v2.6 – diagnostika geometrie terénu

## Stav

Prvá etapa v2.6 naďalej overuje iba geometriu skutočného Cesium terénu. Hotspot, slnečný model ani prúdenie sa zatiaľ nepočítajú.

Od verzie `2.6.0-alpha.2` je nad existujúci geometrický výpočet vložené modulárne jadro. Doterajší výpočet sklonu, orientácie, zakrivenia a pracovnej morfologickej klasifikácie zostáva zachovaný ako prvý analytický modul.

Prvotná analyzovaná oblasť sa chápe ako kruhový pohľad okolo zvoleného stredu. Pravouhlá mriežka zostáva iba vnútorným vzorkovacím nástrojom; bunky mimo zvoleného polomeru sa nezaraďujú do výslednej diagnostickej mapy.

Od pracovného kroku `20260712-07` je farebná geometrická vrstva klikateľná. Kliknutie na farebný bod otvorí samostatné diagnostické okno s číselnými metrikami, aktuálnym klasifikačným pravidlom a dôvodmi zaradenia. Kliknutie mimo farebného bodu naďalej vyberá nový stred analýzy.

Tento krok nemení prahy klasifikácie ani farebnú paletu. Jeho účelom je sprístupniť výpočet na vizuálne overenie voči vrstevniciam a skutočnému 3D reliéfu.

## Súbory

- `XC/js/terrain-analysis-core.js` – modulárne jadro, register analytických vrstiev, kontrola závislostí, spoločný kontext a kruhová maska.
- `XC/js/terrain-analysis.js` – existujúci výpočet výškovej mriežky, sklonu, orientácie, zakrivenia a pracovnej klasifikácie.
- `XC/js/terrain-analysis-geometry.js` – adaptér, ktorý registruje existujúcu geometrickú analýzu ako modul `geometry`.
- `XC/js/terrain-analysis-diagnostics.js` – vysvetliteľná diagnostika bunky; zobrazuje použité metriky, pracovné pravidlo a dôvody aktuálneho zaradenia bez zmeny fyzikálneho výpočtu.
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
→ výpočet geometrie
→ kruhová maska
→ spoločná vrstva layers.geometry
→ diagnostické zobrazenie v Cesium
→ kliknutie na farebnú bunku
→ terrain-analysis-diagnostics.js
→ metriky + aktuálne pravidlo + dôvody klasifikácie
```

Vrstevnice zostávajú samostatnou vrstvou a slúžia ako geometrická referencia pri kontrole farebnej klasifikácie.

## Test

1. Otvoriť `XC/terrain-analysis-test.php`.
2. Kliknutím na voľný terén vybrať stred analyzovanej oblasti.
3. Nastaviť polomer prvotného kruhového pohľadu.
4. Nastaviť hrubý rozostup vzoriek.
5. Ponechať zapnuté vrstvy `Geometria reliéfu` a `Vrstevnice`.
6. Spustiť vybrané analýzy.
7. Overiť, že farebné diagnostické body vytvárajú kruhovú oblasť a nie pôvodný štvorec.
8. Kliknúť na farebný bod a overiť, že sa otvorí okno `Diagnostika geometrickej bunky` a stred analýzy sa pritom neposunie.
9. Porovnať zobrazený typ a farbu s vrstevnicami, 3D reliéfom, sklonom, Laplaciánom, profilovou krivosťou a uvedenými dôvodmi klasifikácie.
10. Kliknúť mimo farebných bodov na terén a overiť, že sa vyberie nový stred analýzy.

## Aktuálne obmedzenia

Doterajšia pracovná klasifikácia ešte mieša lokálnu geometriu s morfologickou rolou. Označenia ako `REBRO_ALEBO_HRANA` alebo `ŽĽAB_ALEBO_ZBERNICA` sú preto iba kandidátske triedy, nie konečné morfologické určenie.

Nasledujúce hodnoty sa zatiaľ nevypočítavajú a diagnostika ich zámerne ponecháva ako `null`:

- morfologická rola,
- farebná rodina G01 až G16,
- relatívna výška v rámci terénneho celku,
- relatívna hĺbka v rámci konkávneho celku,
- intenzita zlomu alebo geometrického rozhrania.

Aktuálne farby zostávajú dočasnou diagnostickou paletou. Nie sú ešte konečnou implementáciou šestnástich farebných rodín z `postupy/TerenDizajManual.md`.

## Ďalší krok

Nasleduje oddelenie dvoch vrstiev klasifikácie podľa `postupy/TerenDizajManual.md`:

### A. Lokálna geometria

- rovinná,
- konvexná,
- konkávna,
- zlomová,
- stenová,
- prechodová.

### B. Morfologická rola

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

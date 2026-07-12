# TermikaXC v2.6 – diagnostika geometrie terénu

## Stav

Prvá etapa v2.6 naďalej overuje iba geometriu skutočného Cesium terénu. Hotspot, slnečný model ani prúdenie sa zatiaľ nepočítajú.

Od verzie `2.6.0-alpha.2` je nad existujúci geometrický výpočet vložené modulárne jadro. Doterajší výpočet sklonu, orientácie, zakrivenia a pracovnej morfologickej klasifikácie zostáva zachovaný ako prvý analytický modul.

Prvotná analyzovaná oblasť sa už chápe ako kruhový pohľad okolo zvoleného stredu. Pravouhlá mriežka zostáva iba vnútorným vzorkovacím nástrojom; bunky mimo zvoleného polomeru sa nezaraďujú do výslednej diagnostickej mapy.

## Súbory

- `XC/js/terrain-analysis-core.js` – modulárne jadro, register analytických vrstiev, kontrola závislostí, spoločný kontext a kruhová maska.
- `XC/js/terrain-analysis.js` – existujúci výpočet výškovej mriežky, sklonu, orientácie, zakrivenia a pracovnej morfologickej klasifikácie.
- `XC/js/terrain-analysis-geometry.js` – adaptér, ktorý registruje existujúcu geometrickú analýzu ako modul `geometry`.
- `XC/terrain-analysis-test.php` – samostatná testovacia stránka s ručným výberom analytických vrstiev, polomeru a rozostupu vzoriek.
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
```

## Test

1. Otvoriť `XC/terrain-analysis-test.php`.
2. Kliknutím vybrať stred analyzovanej oblasti.
3. Nastaviť polomer prvotného kruhového pohľadu.
4. Nastaviť hrubý rozostup vzoriek.
5. Ponechať zapnutú vrstvu `Geometria reliéfu`.
6. Spustiť vybrané analýzy.
7. Overiť, že farebné diagnostické body vytvárajú kruhovú oblasť a nie pôvodný štvorec.
8. Porovnať farebnú diagnostiku s reálnou geometriou terénu.

## Ďalší krok

Nasleduje oddelenie ďalších analytických vrstiev a postupné dopĺňanie ručne voliteľných modulov. Pred modelom Slnka treba zaviesť najmä samostatnú analýzu členitosti, morfologických hraníc a otvorených smerov, podľa ktorých sa bude kruhový prvotný pohľad neskôr adaptívne rozširovať.

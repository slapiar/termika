# TermikaXC v2.6 – pokyny pre nový chat

## Účel dokumentu

Tento dokument slúži ako štartovací kontext pre nový pracovný chat k verzii TermikaXC v2.6. Jeho cieľom je nadviazať na doterajší vývoj bez nutnosti opakovane načítavať a analyzovať celý predchádzajúci rozhovor.

## Repozitár a pracovná vetva

- Repozitár: `slapiar/termika`
- Vetva: `main`
- Hlavný pracovný adresár aplikácie: `XC/`
- Dokumentácia a zdroje: `docs/`
- Priebežné pracovné postupy a prijaté technické rozhodnutia: `postupy/`

## Aktuálny stav projektu

Verzia v2.5 je funkčná základňa. Obsahuje najmä:

- načítanie a spracovanie IGC,
- prehrávanie letu po časovej osi,
- 3D Cesium terén,
- zobrazenie celej letovej stopy,
- režimy kamery,
- výpočet a kontrolu AGL,
- načítanie TEMP profilu,
- normalizáciu TEMP údajov,
- výpočet LCL,
- Skew-T / log-P graf,
- pracovný výpočet dráhy vzduchovej častice,
- prvý výpočet driftu termického komína podľa vetra vo výškových vrstvách,
- statické 3D zobrazenie termického komína pomocou valcov.

Kľúčové existujúce moduly:

```text
XC/js/
├── meteo-core.js
├── skewt-render.js
├── glider-core.js
├── pilot-network.js
├── cesium-render.js
└── workspace-ui.js
```

## Hlavný cieľ verzie v2.6

Prvým cieľom v2.6 je ukázať, že TermikaXC dokáže na skutočnom 3D teréne:

1. nájsť fyzikálne odôvodnený hotspot,
2. určiť jeho zdrojovú oblasť,
3. vypočítať jeho hlavné parametre,
4. vysvetliť, prečo bol hotspot identifikovaný,
5. vytvoriť nad ním vrstvený a vetrom deformovaný model stúpavého prúdenia,
6. neskôr tento prúd vizualizovať animovanými časticami alebo krátkymi vektormi.

TermikaXC nesmie vytvárať hotspot iba ako grafický bod alebo ručne vložený objekt. Hotspot musí byť výsledkom výpočtu nad reálnymi vstupmi.

## Záväzná postupnosť výpočtu

```text
3D terén Cesium
        ↓
lokálna výšková mriežka
        ↓
sklon a orientácia každej bunky
        ↓
poloha Slnka podľa času letu
        ↓
oslnenie a terénny tieň
        ↓
zdrojové plochy ohriateho vzduchu
        ↓
anabatický transport
        ↓
rebrá, hrany, žľaby a miesta zbiehania
        ↓
kandidáti hotspotov
        ↓
TEMP: vztlak, stabilita a vertikálny dosah
        ↓
vietor a strih po výškových vrstvách
        ↓
živý 3D stúpavý prúd
```

Základná zásada:

> Najprv sa musí z geometrie terénu a fyzikálnych podmienok vypočítať hotspot. Až potom sa nad ním môže vytvoriť a vizualizovať stúpavý prúd.

## Prvá implementačná etapa

Prvý nový modul má byť:

```text
XC/js/terrain-analysis.js
```

Jeho úlohou bude nad vybranou oblasťou skutočného Cesium terénu vytvoriť lokálnu mriežku a pre každú bunku vypočítať minimálne:

- zemepisnú polohu,
- nadmorskú výšku,
- sklon,
- azimut svahu,
- lokálny výškový gradient,
- zakrivenie,
- konvexnosť alebo konkávnosť,
- príslušnosť k rebru, hrane, žľabu alebo zbernej oblasti.

Najprv sa má overiť správnosť geometrickej analýzy terénu. Až potom sa pridá výpočet polohy Slnka a oslnenia.

## Plánované moduly v2.6

Predpokladaná architektúra:

```text
XC/js/
├── terrain-analysis.js
├── solar-model.js
├── hotspot-engine.js
└── thermal-flow-render.js
```

Význam:

- `terrain-analysis.js` – analýza geometrie a tvarov terénu,
- `solar-model.js` – poloha Slnka, uhol dopadu, oslnenie a terénny tieň,
- `hotspot-engine.js` – zdrojové plochy, anabatický transport, zbiehanie a hodnotenie kandidátov,
- `thermal-flow-render.js` – dynamická 3D vizualizácia vypočítaného prúdenia.

## Fyzikálne zásady

### Hotspot

Hotspot nie je iba najteplejší bod. Musí byť výsledkom kombinácie:

- orientácie a sklonu svahu,
- aktuálneho oslnenia,
- tepelného kontrastu voči okoliu,
- veľkosti a charakteru zdrojovej plochy,
- možnosti presunu ohriateho vzduchu po svahu,
- zbiehania prúdenia,
- vhodného spúšťacieho terénneho tvaru,
- stavu atmosférického zvrstvenia.

### Vertikálny prúd

Termický prúd sa nesmie modelovať ako jeden rovný, súvislý a nemenný kužeľ alebo valec.

Musí sa vyhodnocovať po výškových vrstvách. Vietor, strih vetra, rozdielna stabilita a vlastnosti jednotlivých vrstiev môžu spôsobiť:

- naklonenie,
- bočný posun,
- zmenu priemeru,
- rozpad jadra na viac pulzov,
- prechod z kompaktného prúdu na bublinový režim,
- spomalenie,
- horizontálne rozliatie,
- lokálne prerazenie stabilnej vrstvy,
- zánik alebo vznik kompenzačných zostupov.

Pri stabilnej vrstve alebo inverzii môže prúd naraziť na atmosférický „dekel“. Model musí vedieť zobraziť spomalenie, rozlievanie do strán, pulzovanie a prípadné lokálne prenikanie.

### Vizualizácia

Dlhodobý cieľ je zobrazenie podobné spôsobu, akým Windy zobrazuje vietor:

- krátke, pomalé a redšie vektory alebo častice pre slabé stúpanie,
- dlhšie, rýchlejšie a hustejšie pre silné stúpanie,
- smer podľa lokálneho 3D vektora prúdenia,
- vlnenie podľa turbulence,
- deformácia podľa vetra a strihu po vrstvách,
- horizontálne rozlievanie pod stabilnou vrstvou.

Aktuálne statické valce v `CesiumRender.vykresli3DTeloKomina()` možno ponechať ako diagnostický režim. Nová dynamická vizualizácia má byť samostatná.

## Dátové zdroje a režimy použitia

TermikaXC má do budúcnosti rozlišovať tri režimy:

1. historická rekonštrukcia letu,
2. plánovanie budúceho letu,
3. modelové fyzikálne situácie.

Pri každom údaji sa má evidovať jeho pôvod, napríklad:

- MERANÉ,
- MODELOVÁ ANALÝZA,
- ARCHÍV PREDPOVEDE,
- INTERPOLOVANÉ,
- ODVODENÉ VÝPOČTOM.

Žiadna odvodená alebo interpolovaná hodnota sa nesmie tváriť ako priamo meraná.

SoaringMeteo je metodický a porovnávací zdroj regionálnych veličín. Nemá nahradiť vlastný model TermikaXC ani generovať hotspoty. Jeho plošné výsledky možno neskôr použiť ako regionálny kontext alebo kontrolnú referenciu.

## Projektové zdroje

Pred začiatkom práce v novom chate treba prečítať najmä:

```text
docs/TermikaXC-v2.6-vyvoj-myslienky.md
docs/TermikaXC - Oprava chyby v Cesium.htm
postupy/TermikaXC-v2.6-postupnost-vypoctu-hotspotu.md
```

HTML export obsahuje úplný pracovný rozhovor a vývoj myšlienky. Markdownové súbory slúžia ako stručné technické východisko.

## Pravidlá ďalšej práce

1. Nezačínať projekt nanovo a nelikvidovať existujúce funkčné riešenia v2.5.
2. Každú novú funkciu pripájať modulárne a s minimálnym zásahom do existujúceho kódu.
3. Najprv analyzovať terén, až potom oslnenie, hotspot a prúd.
4. Nevytvárať vizuálne placeholdery, ktoré predstierajú fyzikálny výsledok.
5. Ak chýba vstupná veličina, systém ju nesmie potichu vymyslieť. Má označiť, čo je dostupné a čo nie.
6. Každý vypočítaný hotspot musí vedieť vysvetliť dôvod svojho vzniku.
7. Dôležité prijaté technické rozhodnutia priebežne zapisovať do samostatných `.md` súborov v adresári `postupy/`.
8. Nenechávať zásadné poznatky iba v chate.
9. Pri implementácii môže spolupracovať Joyee, Copilot a GitHub. Zdroj pravdy je aktuálny stav repozitára a dokumentácia v ňom.

## Očakávaný prvý výsledok nového chatu

Prvým konkrétnym výstupom má byť návrh a implementácia základnej verzie `terrain-analysis.js`, ktorá:

- vyberie testovaciu oblasť,
- načíta alebo odoberie vzorky výšok Cesium terénu,
- vytvorí lokálnu mriežku,
- vypočíta sklon a orientáciu buniek,
- pripraví dátový model pre ďalšiu klasifikáciu rebier, žľabov, hrán a zberných oblastí,
- umožní diagnostické zobrazenie výsledkov v Cesium.

Až po overení tohto kroku sa pokračuje modelom Slnka a oslnenia.

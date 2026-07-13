# TermikaXC v2.6 – Vrstva B: morfologická rola

## Účel dokumentu

Tento dokument je záväzný technický backlog pre implementáciu vrstvy B – morfologickej roly reliéfu – po uzavretí vrstvy A (lokálna geometria) a po zapojení pracovnej palety G01–G16.

Cieľom vrstvy B nie je premenovať lokálnu konvexnosť alebo konkávnosť. Jej úlohou je určiť, akú úlohu má bunka v širšom terénnom celku: či patrí k vrcholu, hrebeňu, rebru, svahu, plošine, terase, žľabu, doline, depresii, sedlu, hornej hrane, dolnej hrane alebo stene.

Vrstva B musí zostať vysvetliteľná. Každá pridelená rola musí mať číselné skóre, dôveru, informáciu o mierke okolia a zoznam dôvodov.

---

## Východiskový stav

Hotové a overené:

- vzorkovanie skutočného Cesium terénu,
- lokálna výšková mriežka,
- sklon a orientácia svahu,
- gradient,
- Laplacián a profilová krivosť,
- lokálna geometria A:
  - `ROVINNÁ`,
  - `KONVEXNÁ`,
  - `KONKÁVNA`,
  - `ZLOMOVÁ`,
  - `STENOVÁ`,
  - `PRECHODOVÁ`,
- intenzita konvexnosti, konkávnosti, rovinnosti a zlomu,
- pracovná paleta G01–G16,
- pracovné kontrastné tieňovanie podľa `kRel`, `sRel` a `bRel`,
- hover a klikateľná diagnostika,
- tmavošedé vrstevnice ako samostatná kontrolná vrstva.

Ešte chýba:

- konečná morfologická rola,
- segmentácia nadradených terénnych celkov,
- `hRel` a `dRel`,
- skutočné výškové tieňovanie v rámci kopca, hrebeňa, rebra, žľabu, doliny alebo depresie,
- prirodzené zvýraznenie rozhraní podľa susedných morfologických celkov.

---

## Architektonické rozhodnutie

Vrstva B sa nebude vkladať priamo do `terrain-analysis.js`.

Vznikne samostatný modul:

```text
XC/js/terrain-morphology.js
```

Dôvod:

- `terrain-analysis.js` zostáva zdrojom výšok, derivácií a lokálnej geometrie A,
- morfológia pracuje nad širším okolím a spojitosťou tvarov,
- samostatný modul možno testovať, ladiť a neskôr nahradiť bez zásahu do overenej lokálnej geometrie,
- modulárne jadro už podporuje závislosti medzi analytickými vrstvami.

Pracovná závislosť:

```text
geometry
    ↓
morphology
    ↓
terrain-design
    ↓
Cesium renderer + diagnostika
```

Vrstva `morphology` bude vyžadovať `geometry`.

---

## Zásada práce s okrajom analyzovanej oblasti

Morfologické metriky sa nesmú počítať iba z buniek, ktoré zostali po kruhovej maske.

Geometrický výsledok uchováva:

- `cells` – bunky vo viditeľnom analyzovanom kruhu,
- `allCells` – plnú podkladovú mriežku pred kruhovou maskou.

Vrstva B použije `allCells` ako podporné susedstvo a výslednú rolu priradí bunkám v `cells`.

Tým sa znížia falošné hrebene, doliny, hrany a extrémy na okraji kruhu.

Ak bunka ani v `allCells` nemá dostatočné susedstvo pre požadovanú mierku, musí dostať zníženú kvalitu alebo `role: null`. Nesmie sa potichu domyslieť chýbajúca časť reliéfu.

---

## Dátový model morfológie

Pracovný objekt bunky:

```js
morphology = {
    role: "HREBEŇ",
    candidateRole: "HREBEŇ",
    confidence: 0.84,
    quality: 0.92,

    scaleM: 360,
    axisDeg: 72,
    continuity: 0.81,
    relativePositionLocal: 0.76,

    ridgeScore: 0.88,
    ribScore: 0.42,
    peakScore: 0.21,
    valleyScore: 0.05,
    gullyScore: 0.03,
    depressionScore: 0.01,
    saddleScore: 0.08,
    plateauScore: 0.04,
    terraceScore: 0.02,
    upperEdgeScore: 0.19,
    lowerEdgeScore: 0.01,
    wallScore: 0.00,
    slopeScore: 0.35,

    hRel: null,
    dRel: null,

    method: "MULTISCALE_NEIGHBORHOOD_V1",
    reasons: [
        "konvexný priečny profil",
        "pokles terénu na oboch stranách osi",
        "lineárne pokračovanie tvaru",
        "vysoká poloha v lokálnom okolí"
    ]
};
```

Pravidlá:

1. `role` je konečný pracovný výsledok vrstvy B.
2. `candidateRole` obsahuje najsilnejšieho kandidáta aj vtedy, keď dôvera nestačí na pridelenie `role`.
3. Pri nedostatočnej dôvere musí zostať `role: null`.
4. `hRel` a `dRel` zostávajú počas sprintu B `null`.
5. `relativePositionLocal` je iba lokálna metrika susedstva. Nesmie sa vydávať za finálne `hRel`.
6. Všetky skóre sú normalizované na rozsah 0 až 1.
7. `quality` vyjadruje úplnosť susedstva a spoľahlivosť vstupných dát, nie pravdepodobnosť konkrétnej roly.

---

## B1 – Metriky širšieho susedstva

### Úloha

Pre každú viditeľnú bunku vypočítať viacmierkové okolie z plnej podpornej mriežky.

Pracovné mierky:

```text
1 bunka
2 bunky
3 bunky
```

Fyzický polomer sa vždy odvodí od aktuálneho `spacingM`.

### Minimálne metriky

Pre každú mierku:

- minimum výšky,
- maximum výšky,
- priemerná výška,
- medián výšky,
- smerodajná odchýlka výšok,
- lokálny reliéf,
- relatívna poloha bunky medzi lokálnym minimom a maximom,
- podiel susedov vyšších než bunka,
- podiel susedov nižších než bunka,
- priemerný sklon,
- rozptyl sklonu,
- kruhový rozptyl orientácie svahov,
- priemerná konvexnosť,
- priemerná konkávnosť,
- priemerná intenzita zlomu,
- úplnosť susedstva.

### Smerové profily

Pre minimálne 8 smerov:

```text
N, NE, E, SE, S, SW, W, NW
```

vypočítať:

- relatívnu výšku suseda alebo smerového profilu,
- priemerný sklon profilu,
- zmenu sklonu,
- znamienko krivosti,
- dĺžku súvislého pokračovania tvaru.

### Výstup B1

Objekt:

```js
cell.neighborhood = {
    scales: [...],
    directions: [...],
    quality: 0.0,
    method: "MULTISCALE_NEIGHBORHOOD_V1"
};
```

### Kritériá hotovo B1

- metriky sú normalizované podľa fyzického rozostupu,
- zmena `spacingM` nemení význam prahov iba preto, že sa zmenila veľkosť bunky,
- okraj kruhu používa podporu z `allCells`,
- chýbajúce susedstvo znižuje `quality`,
- diagnostika vie zobraziť použité mierky a kvalitu susedstva.

---

## B2 – Skóre morfologických kandidátov

### Minimálne roly

```text
VRCHOL
HREBEŇ
REBRO
SVAH
PLOŠINA
TERASA
ŽĽAB
DOLINA
DEPRESIA
SEDLO
HORNÁ_HRANA
DOLNÁ_HRANA
STENA
```

### Pracovné princípy

#### STENA

Silné podmienky:

- lokálna geometria `STENOVÁ`,
- vysoký sklon,
- súvislé pokračovanie prudkého sklonu v okolí.

#### HORNÁ_HRANA

Silné podmienky:

- lokálna geometria `ZLOMOVÁ`,
- prevaha konvexnosti,
- vyššia poloha voči okoliu,
- výrazný prechod z hornej plochy do prudšieho svahu.

#### DOLNÁ_HRANA

Silné podmienky:

- lokálna geometria `ZLOMOVÁ`,
- prevaha konkávnosti,
- nižšia poloha voči okoliu,
- prechod zo strmého svahu do miernejšieho terénu alebo pätovej plochy.

#### SEDLO

Silné podmienky:

- dve približne protiľahlé smery sú vyššie,
- kolmé alebo približne kolmé protiľahlé smery sú nižšie,
- zmiešané znamienka smerovej krivosti,
- stredná relatívna výšková poloha,
- tvar je stabilný vo viac než jednej mierke.

#### VRCHOL

Silné podmienky:

- vysoká lokálna relatívna poloha,
- prevaha nižších susedov vo všetkých alebo takmer všetkých smeroch,
- plošná alebo radiálna konvexnosť,
- nízka lineárna dominancia jednej osi.

Najvyšší bod analyzovaného výseku sa nesmie automaticky označiť ako `VRCHOL`.

#### HREBEŇ

Silné podmienky:

- konvexný priečny profil,
- pokles na oboch stranách dominantnej osi,
- lineárne pokračovanie tvaru,
- vyššia poloha v okolí,
- os tvaru je skôr priečna k lokálnemu smeru najväčšieho spádu.

#### REBRO

Silné podmienky:

- konvexný priečny profil,
- lineárne pokračovanie tvaru,
- os je skôr súbežná s lokálnym smerom spádu,
- tvar klesá od nadradeného hrebeňa smerom do doliny.

Pracovné rozlíšenie `HREBEŇ` / `REBRO` sa bude validovať podľa uhla medzi morfologickou osou a lokálnou orientáciou svahu.

#### ŽĽAB

Silné podmienky:

- konkávny priečny profil,
- zbiehanie susedných smerov k osi,
- lineárne pokračovanie po spáde,
- menšia šírka a vyššia lokálna koncentrácia konkávnosti.

#### DOLINA

Silné podmienky:

- širší konkávny terénny systém,
- dlhšie a stabilnejšie pokračovanie osi,
- väčšia mierka než žľab,
- nižšia relatívna poloha,
- bočné svahy orientované k osi.

Rozlíšenie `ŽĽAB` / `DOLINA` musí používať mierku, šírku a kontinuitu, nie iba väčšiu alebo menšiu hodnotu tej istej krivosti.

#### DEPRESIA

Silné podmienky:

- nízka lokálna relatívna poloha,
- prevaha vyšších susedov vo viacerých smeroch,
- plošná konkávnosť,
- nízka lineárna dominancia jednej osi.

#### PLOŠINA

Silné podmienky:

- lokálna geometria `ROVINNÁ`,
- malý sklon,
- vyššia poloha vo väčšom okolí,
- vonkajší prstenec obsahuje pokles do okolia.

#### TERASA

Silné podmienky:

- lokálna geometria `ROVINNÁ` alebo slabo prechodová,
- malý sklon,
- stredná relatívna poloha,
- zlom alebo prudšia zmena sklonu nad aj pod plochou,
- pretiahnutý plošný tvar.

#### SVAH

Silné podmienky:

- zreteľný sklon,
- približne planárna lokálna geometria,
- bez dominantného skóre hrany, rebra, hrebeňa, žľabu, doliny alebo steny.

### Kritériá hotovo B2

- každá rola má samostatné skóre 0 až 1,
- skóre je vysvetliteľné z uložených metrík,
- kandidáti sa nevyberajú iba jedným prahom jednej veličiny,
- úzke lineárne a široké plošné tvary sa odlišujú mierkou a kontinuitou,
- pri nedostatočnej kvalite sa dôvera znižuje.

---

## B3 – Výber roly a dôvera

### Poradie silných výnimiek

Pracovné poradie:

```text
STENA
→ HORNÁ_HRANA / DOLNÁ_HRANA
→ SEDLO
→ VRCHOL
→ HREBEŇ / REBRO
→ ŽĽAB / DOLINA
→ DEPRESIA
→ PLOŠINA / TERASA
→ SVAH
→ role: null
```

Poradie neznamená, že vyššia položka vždy vyhrá. Slúži iba na riešenie prípadov, kde jedna silná geometrická situácia nesmie byť prekrytá všeobecnejšou triedou.

### Pracovné pravidlo dôvery

Dôvera má vychádzať minimálne z:

- absolútnej hodnoty víťazného skóre,
- rozdielu medzi prvým a druhým kandidátom,
- kvality susedstva,
- stability výsledku vo viacerých mierkach.

Pracovný princíp:

```text
confidence = winnerScore
           × neighborhoodQuality
           × scaleStability
           × separationFromSecondCandidate
```

Koeficienty sa doladia až podľa reálneho testovania.

### Kritériá hotovo B3

- `candidateRole` je vždy najsilnejší kandidát,
- `role` sa pridelí iba po splnení minimálnej dôvery,
- pri nejednoznačnosti zostane `role: null`,
- diagnostika zobrazí prvých minimálne troch kandidátov a ich skóre,
- každá pridelená rola obsahuje dôvody.

---

## B4 – Prepojenie na paletu G01–G16

Po zapojení vrstvy B prestane `terrain-design.js` používať starý morfologický kandidát ako hlavný zdroj rodiny.

Pracovné mapovanie:

| Morfologická rola | Farebná rodina |
|---|---|
| `PLOŠINA` | G01 |
| `TERASA` | G02 |
| `SVAH` | G03 alebo G04 podľa sklonu |
| `SVAH` + lokálna konvexnosť | G05 |
| `VRCHOL` | G06 |
| `HREBEŇ` | G07 |
| `REBRO` | G07 |
| `HORNÁ_HRANA` | G08 |
| plytká konkávnosť bez lineárnej roly | G09 |
| `ŽĽAB` | G10 |
| `DOLINA` | G11 |
| `DEPRESIA` | G12 |
| `SEDLO` | G13 |
| neurčená alebo zmiešaná rola | G14 |
| `STENA` | G15 |
| `DOLNÁ_HRANA` | G16 |

Doplňujúce pravidlá:

- lokálna geometria A zostáva dôležitá aj po určení roly B,
- `SVAH` môže použiť G03, G04, G05 alebo G09 podľa sklonu a lokálnej geometrie,
- veľmi silný konvexný zlom na hrebeni alebo rebre môže použiť G08,
- veľmi silný konkávny pätový zlom môže použiť G16,
- pri `role: null` sa použije G14 a diagnostika uvedie, že morfologická rola nebola potvrdená.

### Kritériá hotovo B4

- G11 a G13 sa môžu automaticky objaviť až z vrstvy B,
- `terrain-design.js` už nepovažuje starý `terrainShape` za konečnú morfologickú rolu,
- starý kandidát zostáva iba v diagnostike na porovnanie,
- zmena rodiny je spätne vysvetliteľná.

---

## B5 – Diagnostika a používateľské rozhranie

### Hover

Po nabehnutí nad bod zobraziť:

```text
Hrebeň
lokálne: konvexná
G07 · tmavočervená
2 184,3 m n. m.
dôvera: 0,84
```

Ak `role` nie je potvrdená:

```text
Neurčená morfologická rola
kandidát: rebro · 0,52
lokálne: konvexná
G14 · prechod
```

### Klikateľná diagnostika

Doplniť:

- morfologickú rolu,
- kandidátsku rolu,
- dôveru,
- kvalitu susedstva,
- dominantnú os,
- mierku v metroch,
- kontinuitu,
- lokálnu relatívnu polohu,
- prvých troch kandidátov a ich skóre,
- dôvody pridelenia roly,
- použitú metódu,
- informáciu, že `hRel` a `dRel` ešte nie sú vypočítané.

### Kritériá hotovo B5

- hover zostáva krátky a čitateľný,
- klikateľná diagnostika obsahuje úplné vysvetlenie,
- nevypočítané `hRel` a `dRel` zostávajú `null`,
- používateľ dokáže porovnať rolu s vrstevnicami a 3D reliéfom.

---

## B6 – Testovací katalóg

Vrstva B sa musí overiť minimálne na týchto situáciách:

1. izolovaný zaoblený vrchol,
2. dlhý horský hrebeň,
3. rebro klesajúce z hrebeňa do doliny,
4. rovný planárny svah,
5. konvexné plece svahu,
6. široká plošina,
7. terasa alebo plošný stupeň,
8. úzky žľab,
9. široká dolina,
10. uzavretá depresia alebo kotlina,
11. sedlo medzi dvoma výškami,
12. horná hrana zrázu,
13. dolná hrana zrázu,
14. skalná stena,
15. zmiešaný prechod bez jednoznačnej roly,
16. bunky blízko okraja analyzovaného kruhu.

Pri každom teste porovnať:

- 3D reliéf,
- vrstevnice,
- lokálnu geometriu A,
- morfologickú rolu B,
- dominantné skóre,
- dôveru,
- výslednú farebnú rodinu.

---

## Kritériá hotovo celého sprintu B

Sprint B je hotový iba vtedy, keď:

1. existuje samostatný modul `XC/js/terrain-morphology.js`,
2. modul používa širšie a viacmierkové susedstvo,
3. okraj kruhu používa podpornú plnú mriežku,
4. každá bunka má objekt `morphology`,
5. rola sa nepridelí pri nedostatočnej dôvere,
6. diagnostika vysvetlí pridelenie alebo nepridelenie roly,
7. paleta G01–G16 používa vrstvu B ako hlavný zdroj morfologického významu,
8. G11 a G13 sú automaticky dostupné,
9. starý `terrainShape` zostáva iba porovnávacím kandidátom,
10. `hRel` a `dRel` zostávajú `null`,
11. existujú vizuálne testy s vrstevnicami na reprezentatívnych typoch terénu,
12. prijaté prahy a zmeny sú zapísané v `postupy/`.

---

## Čo nasleduje po vrstve B

Až po stabilizácii morfologických rolí nasleduje samostatný krok:

```text
morfologické roly
→ spojenie buniek do nadradených terénnych celkov
→ hRel / dRel v rámci konkrétneho tvaru
→ skutočné výškové tieňovanie
→ prirodzené zvýraznenie morfologických rozhraní
→ členitosť, hranice a otvorené smery
→ adaptívne rozširovanie analyzovanej oblasti
→ model Slnka a oslnenia
```

`hRel` a `dRel` sa nesmú vypočítať iba z absolútneho minima a maxima aktuálneho kruhu. Musia patriť ku konkrétnemu kopcu, hrebeňu, rebru, žľabu, doline alebo depresii.

---

## Prvý implementačný krok

Začať B1:

1. vytvoriť `XC/js/terrain-morphology.js`,
2. pripraviť index buniek podľa `row` a `col`,
3. počítať viacmierkové susedstvo z `allCells`,
4. uložiť `cell.neighborhood`,
5. zatiaľ nepriraďovať konečnú rolu,
6. zobraziť metriky susedstva v diagnostike,
7. vizuálne overiť kvalitu okolia a správanie na okraji kruhu.

Až po overení B1 sa zapne skórovanie rolí B2.
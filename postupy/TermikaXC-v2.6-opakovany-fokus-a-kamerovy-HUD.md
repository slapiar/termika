# TermikaXC v2.6 – opakovaný fokus a kamerový HUD

## 1. Účel

Tento dokument zapisuje dve používateľské pomôcky testovacej 3D analýzy terénu:

1. opakovaný prepočet rovnakého diagnostického fokusu pri zmene rozsahu a hustoty vzorkovania,
2. kamerový HUD so smerom pohľadu, uhlom pohľadu a výškou kamery.

Obe pomôcky slúžia na presnejšie skúmanie terénu a na prípravu prostredia pre neskoršie meteorologické vrstvy. Nesmú meniť samotnú geometriu, morfologickú klasifikáciu, farebný dizajn ani terénny mesh.

## 2. Opakovaný prepočet rovnakého fokusu

### 2.1 Zásada

Po výbere stredu analýzy zostáva tento stred zachovaný, kým používateľ neklikne na nové miesto v teréne.

Používateľ môže nad tým istým stredom meniť:

- polomer kruhovej analýzy,
- rozostup vzoriek,
- tým nepriamo hustotu bodov a výpočtovú náročnosť.

Po zmene parametrov sa analýza nespustí automaticky počas písania. Používateľ ju vedome spustí tlačidlom:

```text
↻ Prepočítať aktuálny výrez
```

### 2.2 Dôvod

Rovnaký terénny fokus možno opakovane porovnať pri rozličných mierkach, napríklad:

```text
400 m / 40 m
400 m / 20 m
800 m / 40 m
800 m / 20 m
```

Tak možno skúmať:

- stabilitu lokálnej geometrickej klasifikácie,
- vernosť morfologických línií,
- citlivosť výsledku na hustotu vzorkovania,
- vplyv rozsahu okolia na vrstvu B,
- zmenu topológie a detailu terénneho meshu.

### 2.3 Pomocný odhad

Ovládací panel priebežne zobrazuje odhad:

- rozmeru podkladovej mriežky,
- celkového počtu vzoriek,
- približného počtu bodov vo viditeľnom kruhu,
- hustoty bodov na km²,
- orientačnej výpočtovej náročnosti.

Po spustení nového výpočtu sa stará diagnostika vybraného bodu zatvorí, pretože patrila predchádzajúcej mriežke.

## 3. Kamerový HUD

### 3.1 Účel

HUD je priehľadná neinteraktívna vrstva priamo nad 3D scénou Cesium. Poskytuje okamžitú orientáciu pri pohybe kamery a neskôr bude spoločným vizuálnym základom pre meteorologické údaje.

HUD sa dá samostatne zapnúť a vypnúť v ovládacom paneli.

Používateľská a technická dokumentácia nástroja je vedená samostatne v:

```text
tools/HUD.md
```

Centrálny register nástrojov je:

```text
TOOLS.md
```

Tento dokument v `postupy/` zostáva záznamom vývojového kontextu, fyzikálnych hraníc a architektonických rozhodnutí.

### 3.2 Zobrazené veličiny

HUD zobrazuje:

- azimut smeru pohľadu kamery v rozsahu `0 až 360°`,
- slovné označenie svetovej strany,
- vertikálny uhol pohľadu `pitch`,
- náklon kamery `roll`,
- kartografickú výšku kamery poskytovanú Cesium,
- orientačnú výšku kamery nad terénom `AGL`, ak je pod kamerou dostupná načítaná výška terénu.

Vertikálny uhol používa konvenciu:

```text
kladný uhol  = pohľad nad horizont
0°           = horizontálny pohľad
záporný uhol = pohľad pod horizont
```

### 3.3 Grafické pravidlá

HUD používa:

- svetlozelené linky,
- svetlozelené číselné hodnoty,
- priehľadné tmavé pozadie iba pod hlavnými údajmi,
- vodorovné pravítko azimutu,
- zvislé pravítko vertikálneho uhla,
- stredový index smeru a horizontu,
- `pointer-events: none`, aby neblokoval prácu s 3D mapou.

Plávajúce ovládacie a diagnostické okná zostávajú nad HUD-om.

### 3.4 Výškový referenčný systém

Aktuálna hodnota výšky kamery je kartografická výška z objektu kamery Cesium. Nesmie sa zatiaľ automaticky označovať ako presná meteorologická výška AMSL bez kontroly použitého výškového referenčného systému a prípadnej geoidickej korekcie.

Hodnota AGL je odvodená od aktuálne načítanej výšky terénu pod polohou kamery. Ak Cesium výšku terénu v danom mieste ešte nemá k dispozícii, HUD zobrazí, že AGL nie je určené.

### 3.5 Prvé používateľské overenie

Dňa 13. 7. 2026 bol kamerový HUD prvýkrát vizuálne a používateľsky overený priamo pri pohybe v 3D teréne.

Výsledok bol prijatý bez požiadavky na korekciu. Svetlozelené pravítka, pohyblivé uhlové údaje, výška kamery a stredový zameriavací prvok vytvorili prirodzený dojem leteckého prístrojového zobrazenia. Používateľ výsledok výstižne zhodnotil slovami:

> „Ako v lietadle.“

Tento výsledok potvrdzuje zvolenú grafickú logiku HUD-u ako vhodný základ pre neskoršie meteorologické vrstvy, smer vetra, polohu Slnka, výškové hladiny a vektory prúdenia.

**Stav:** vizuálna koncepcia HUD-u je používateľsky schválená a môže sa ďalej rozširovať bez zmeny základného grafického jazyka.

## 4. Budúce rozšírenie

Na rovnaký HUD možno neskôr pripojiť:

- smer a rýchlosť vetra v zvolenej výške,
- smer a výšku Slnka,
- čas letu alebo modelového času,
- meteorologickú hladinu kamery,
- smer termického transportu,
- vektory prúdenia a strihu vetra,
- identifikáciu aktuálne sledovaného terénneho celku.

Tieto veličiny sa doplnia až po zavedení príslušných fyzikálnych modelov. HUD ich nesmie zatiaľ predstierať.

## 5. Súbory

- `TOOLS.md` – centrálny register nástrojov TermikaXC.
- `tools/HUD.md` – používateľská a technická karta kamerového HUD-u.
- `XC/js/terrain-analysis-focus-ui.js` – opakovaný prepočet rovnakého fokusu a odhad hustoty vzorkovania.
- `XC/js/terrain-camera-hud.js` – kamerový HUD a jeho prepínač.
- `XC/js/terrain-analysis-geometry.js` – automatické načítanie pomocných UI modulov testovacej analýzy.
- `XC/terrain-analysis-test.php` – testovacia 3D stránka, nad ktorou HUD pracuje.
- `CHANGELOG.md` – používateľský a technický záznam zmien.

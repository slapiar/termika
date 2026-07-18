# TermikaXC UI/UX Design Manual – Globálne mapové nástroje

**Stav:** NORMATÍVNY DODATOK K DIZAJN MANUÁLU  
**Dátum prijatia:** 18. júl 2026  
**Nadradený dokument:** `TERMIKAXC-UI-UX-DESIGN-MANUAL.md`

## 1. Rozsah platnosti

Tento dodatok je záväznou súčasťou Dizajn manuálu pre všetky stránky rodiny `workbench`, najmä:

- `index.php`,
- `explorer.php`,
- `analysis.php`,
- `terrain-analysis-test.php`,
- všetky budúce pracovné stránky s mapou, letom, TEMP alebo analytickými nástrojmi.

## 2. Globálny pracovný shell

Spoločné mapové nástroje NESMÚ byť implementované iba v konkrétnej stránke. MUSIA byť pripájané prostredníctvom globálneho bootstrapu pracovného shellu.

Do globálnej vrstvy patria minimálne:

- quick-dock-tools,
- tlačidlo `NÁSTROJE` v navigačnej lište,
- prepínač panela v sekcii `ZOBRAZENIE`,
- kamerový HUD,
- ovládanie LET,
- aktuálny dátum a čas oblohy,
- IGC dátum, čas štartu a pristátia,
- reálna poloha Slnka,
- 3D oblačnosť,
- smerová ružica a mapová mierka.

## 3. Jeden zdroj pravdy

Každý globálny nástroj MUSÍ mať jeden zdroj pravdy pre:

- viditeľnosť,
- aktívny stav,
- načítané dáta,
- čas oblohy,
- aktuálny bod letu.

Stránka NESMIE vytvárať vlastnú kópiu rovnakého panela ani vlastný paralelný stav.

Ak je modul načítaný viacerými spoločnými vstupmi, MUSÍ sa inicializovať iba raz pomocou globálneho identifikátora.

## 4. IGC čas a obloha

Po načítaní platného IGC MUSÍ globálny shell zobraziť:

```text
DD. MM. RRRR: HH:MM:SS
IGC DD.MM. RRRR, Štart - HH:MM:SS - Pristátie: HH:MM:SS
```

Prvý riadok zobrazuje čas, podľa ktorého je nastavená obloha. Druhý riadok zobrazuje dátum letu a čas prvého a posledného platného B-záznamu.

IGC súhrn NESMIE byť závislý od konkrétnej stránky, od otvoreného menu ani od poradia načítania skriptov. Musí čítať spoločný stav `PilotNetwork` alebo štandardizovanú globálnu udalosť IGC jadra.

Pri prehrávaní alebo ručnom posune časovej osi sa čas oblohy MUSÍ synchronizovať s aktuálnym bodom letu.

## 5. Reverzné ovládanie

Každý stavový ovládač MUSÍ mať reverznú funkciu:

- prvé kliknutie zapne alebo zobrazí,
- druhé kliknutie vypne alebo skryje.

To platí pre tlačidlá v navigačnej lište, quick-docku aj v oknách menu.

Jednorazové príkazy, napríklad načítanie súboru, výpočet alebo export, nie sú stavové prepínače a reverznú funkciu nemajú.

Všetky ovládače toho istého nástroja MUSIA zobrazovať zhodný aktívny stav pomocou `aria-pressed`, triedy `is-active` a zrozumiteľného titulku.

## 6. Predvolená viditeľnosť

Quick-dock-tools je na pracovných stránkach predvolene zobrazený. Používateľ môže panel skryť a stav môže byť zachovaný v lokálnom úložisku.

Ak uložený stav neexistuje alebo je poškodený, systém MUSÍ použiť bezpečný predvolený stav `zobrazené`.

## 7. Technická implementácia

Globálny bootstrap pre CC hostiteľské prostredie:

```text
CC/app/js/global-map-tools.js
```

Spoločné vstupy, ktoré ho pripájajú:

```text
CC/app/js/workspace-hud-toggle.js
CC/app/js/workspace-flight-toggle.js
CC/ux/workbench-shell/quick-tool-dock/quick-tool-dock.view.php
```

Nová pracovná stránka sa považuje za dizajnovo neúplnú, ak nepoužíva aspoň jeden zo spoločných vstupov globálneho shellu.

## 8. Kontrola prijatia

Pred prijatím novej pracovnej stránky sa MUSÍ overiť:

1. quick-dock sa po otvorení stránky zobrazí,
2. tlačidlo `NÁSTROJE` ho zapína aj vypína,
3. sekcia `ZOBRAZENIE` ovláda ten istý panel,
4. nevznikne druhá kópia panela,
5. načítanie IGC zobrazí oba časové riadky,
6. ručný posun letu mení čas oblohy,
7. stavové tlačidlá majú reverznú funkciu,
8. rovnaký výsledok platí na každej stránke rodiny `workbench`.

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
- modul časových značiek,
- reálna poloha Slnka,
- 3D oblačnosť,
- smerová ružica a mapová mierka.

## 3. Jeden zdroj pravdy

Každý globálny nástroj MUSÍ mať jeden zdroj pravdy pre svoj stav. Stránka NESMIE vytvárať vlastnú kópiu rovnakého panela ani vlastný paralelný stav.

Ak je modul načítaný viacerými spoločnými vstupmi, MUSÍ sa inicializovať iba raz pomocou globálneho identifikátora.

## 4. Modul časových značiek

Časové značky predstavujú samostatný nástroj. NESMÚ byť implementované priamo v quick-docku, module oblohy ani v konkrétnej stránke.

Zdroj modulu:

```text
CC/ux/workbench-shell/time-badges/
├── time-badges.css
└── source/time-badges.js
```

Modul MUSÍ na každej pracovnej stránke implicitne zobraziť dva riadky:

```text
NOW - DD. MM. RRRR: HH:MM:SS
IGC DD.MM. RRRR, Štart - HH:MM:SS - Pristátie: HH:MM:SS
```

### 4.1 Riadok NOW

- vždy zobrazuje lokálny dátum a čas zariadenia,
- NESMIE sa meniť po načítaní IGC,
- NESMIE čítať čas Cesium hodín ani čas aktuálneho bodu letu,
- aktualizuje sa priebežne.

### 4.2 Riadok IGC

- je samostatný a nezávislý od riadku NOW,
- po načítaní IGC zobrazí dátum letu a čas prvého a posledného platného B-záznamu,
- pri načítaní ďalšieho IGC sa celý obsah nahradí novými údajmi,
- pri vymazaní alebo zrušení načítaného IGC sa obsah riadku vymaže,
- prázdny riadok zostáva súčasťou modulu, aby sa nemenila geometria rozhrania.

IGC súhrn NESMIE byť závislý od konkrétnej stránky, otvoreného menu ani poradia načítania skriptov. Číta spoločný stav `PilotNetwork` alebo štandardizovanú globálnu udalosť IGC jadra.

## 5. Quick-dock-tools

Quick-dock je pevný nástrojový panel. NESMIE byť presúvateľný myšou.

Jeho rozloženie MUSÍ byť pevný raster:

```text
4 stĺpce × potrebný počet riadkov
```

Každé tlačidlo má rovnakú šírku a výšku. Panel sa nesmie samovoľne prepnúť do jedného stĺpca ani prevziať layout iného docku.

Quick-dock je na pracovných stránkach predvolene zobrazený. Používateľ ho môže vypnúť alebo zapnúť tlačidlom `NÁSTROJE` alebo ovládačom v sekcii `ZOBRAZENIE`.

## 6. Reverzné ovládanie

Každý stavový ovládač MUSÍ mať reverznú funkciu:

- prvé kliknutie zapne alebo zobrazí,
- druhé kliknutie vypne alebo skryje.

Jednorazové príkazy, napríklad načítanie súboru, výpočet alebo export, nie sú stavové prepínače.

Všetky ovládače toho istého nástroja MUSIA zobrazovať zhodný aktívny stav pomocou `aria-pressed`, triedy `is-active` a zrozumiteľného titulku.

## 7. Technická implementácia

Globálny bootstrap:

```text
CC/app/js/global-map-tools.js
XC/js/global-map-tools.js
```

Globálny bootstrap smie:

- vytvoriť alebo pripojiť quick-dock,
- načítať modul časových značiek,
- vytvoriť prepínače v navigácii a sekcii `ZOBRAZENIE`.

Globálny bootstrap NESMIE obsahovať vlastnú implementáciu formátovania alebo vykresľovania časových značiek.

## 8. Kontrola prijatia

Pred prijatím pracovnej stránky sa MUSÍ overiť:

1. quick-dock sa zobrazí ako pevný raster so štyrmi stĺpcami,
2. panel sa nedá presúvať,
3. tlačidlo `NÁSTROJE` ho zapína aj vypína,
4. sekcia `ZOBRAZENIE` ovláda ten istý panel,
5. nevznikne druhá kópia panela,
6. riadok `NOW` vždy ukazuje čas zariadenia,
7. načítanie IGC zmení iba riadok `IGC`,
8. vymazanie IGC vyprázdni iba riadok `IGC`,
9. rovnaký výsledok platí na každej stránke rodiny `workbench`.

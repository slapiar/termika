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

## 2. Spoločné nástroje pracoviska

Spoločný nástroj NESMIE byť implementovaný iba v konkrétnej stránke. Každý nástroj MUSÍ zostať samostatným modulom s vlastným kontraktom, manifestom, JavaScriptom a podľa potreby CSS.

Medzi spoločné nástroje pracoviska patria najmä:

- quick-dock-tools,
- kamerový HUD,
- ovládanie LET,
- modul časových značiek,
- reálna poloha Slnka,
- 3D oblačnosť,
- smerová ružica a mapová mierka.

Funkčná skupina `workbench-shell` je iba menný priestor. NESMIE sa zmeniť na jeden spoločný JavaScriptový monolit.

## 3. Jeden zdroj pravdy

Každý nástroj MUSÍ mať jeden zdroj pravdy pre svoj stav. Stránka NESMIE vytvárať vlastnú kópiu rovnakého panela, časovej značky ani paralelný stav.

Modul, ktorý je priradený k viacerým pracoviskám, sa načíta cez scope alebo dočasný hostiteľský proxy vstup, ale jeho implementácia zostáva iba v adresári vlastníka modulu.

## 4. Modul časových značiek

Časové značky predstavujú samostatný prístroj pracoviska. NESMÚ byť implementované v quick-docku, module oblohy, HUD-e, ovládaní LET ani v konkrétnej stránke.

Vlastník modulu:

```text
CC/ux/workbench-shell/time-badges/
├── module.json
├── time-badges.js
└── time-badges.css
```

Dočasný hostiteľský proxy vstup počas migrácie:

```text
CC/app/js/time-badges.js
```

Proxy smie iba idempotentne pripojiť CSS a JavaScript vlastníckeho modulu. Nesmie obsahovať jeho funkčnú ani vizuálnu implementáciu.

Modul sa na podporovaných pracoviskách aktivuje implicitne a vytvára dva stále zarovnané riadky:

```text
NOW - DD. MM. RRRR: HH:MM:SS
IGC DD.MM. RRRR, Štart - HH:MM:SS - Pristátie: HH:MM:SS
```

### 4.1 Riadok NOW

- vždy zobrazuje lokálny dátum a čas zariadenia, na ktorom používateľ pracuje,
- začína textom `NOW - `,
- NESMIE sa meniť po načítaní, prehrávaní ani vymazaní IGC,
- NESMIE čítať čas Cesium hodín ani čas aktuálneho bodu letu,
- aktualizuje sa priebežne podľa systémových hodín zariadenia.

Čas Cesium scény sa môže samostatne synchronizovať s IGC kvôli polohe Slnka. Táto synchronizácia NESMIE prepisovať riadok `NOW`.

### 4.2 Riadok IGC

- je samostatný a nezávislý od riadku `NOW`,
- po načítaní IGC zobrazí dátum letu a čas prvého a posledného platného B-záznamu,
- pri načítaní ďalšieho IGC sa celý obsah nahradí novými údajmi,
- pri vymazaní alebo zrušení načítaného IGC sa obsah riadku vymaže,
- prázdny riadok zostáva súčasťou modulu, aby sa nemenila geometria rozhrania.

IGC súhrn číta spoločný stav `PilotNetwork` alebo štandardizované udalosti `termika:igc-loaded` a `termika:igc-cleared`. Nesmie prepisovať funkcie iného modulu iba kvôli získaniu údajov.

## 5. Životný cyklus

Modul časových značiek je singleton a podporuje:

```text
install()
activate()
deactivate()
destroy()
```

- `install()` vytvorí DOM a pripojí udalosti najviac raz,
- `activate()` zobrazí oba riadky a spustí ich aktualizáciu,
- `deactivate()` zastaví časovač a skryje modul bez zmeny IGC alebo Cesium dát,
- `destroy()` odstráni DOM, časovače a listenery.

## 6. Quick-dock-tools

Quick-dock je samostatný pevný nástrojový panel. NESMIE vlastniť časové značky a NESMIE byť presúvateľný myšou.

Jeho rozloženie MUSÍ byť pevný raster:

```text
4 stĺpce × potrebný počet riadkov
```

Každé tlačidlo má rovnakú šírku a výšku. Panel sa nesmie samovoľne prepnúť do jedného stĺpca ani prevziať layout iného docku.

## 7. Reverzné ovládanie

Každý stavový ovládač MUSÍ mať reverznú funkciu:

- prvé kliknutie zapne alebo zobrazí,
- druhé kliknutie vypne alebo skryje.

Jednorazové príkazy, napríklad načítanie súboru, výpočet alebo export, nie sú stavové prepínače.

## 8. Kontrola prijatia

Pred označením modulu za `OVERENÉ` sa MUSÍ v bežiacom prostredí potvrdiť:

1. modul sa implicitne zobrazí na každej podporovanej stránke,
2. vznikne iba jedna inštancia `time-badges`,
3. horný riadok má formát `NOW - DD. MM. RRRR: HH:MM:SS`,
4. horný riadok stále sleduje iba lokálny čas zariadenia,
5. načítanie IGC zmení iba spodný riadok,
6. načítanie ďalšieho IGC nahradí údaje spodného riadku,
7. vymazanie IGC vyprázdni iba spodný riadok,
8. prázdny spodný riadok zachová geometriu modulu,
9. modul oblohy môže meniť Cesium čas bez zmeny riadku `NOW`,
10. deaktivácia a zničenie odstránia časovače a listenery.

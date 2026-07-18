# Časové značky ako samostatný modul

**Dátum rozhodnutia:** 18. júl 2026, 09:50 Europe/Bratislava  
**Stav:** IMPLEMENTOVANÉ – FUNKČNE NEOVERENÉ V PREHLIADAČI

## Dôvod opravy

Predchádzajúca implementácia miešala quick-dock, modul oblohy, IGC súhrn a hostiteľský bootstrap. Vznikli paralelné časové značky a riadok aktuálneho času sa mohol meniť podľa Cesium alebo IGC času.

## Prijaté rozhodnutie

Časové značky sú samostatný singleton modul:

```text
CC/ux/workbench-shell/time-badges/
├── module.json
├── time-badges.js
└── time-badges.css
```

Hostiteľský proxy vstup:

```text
CC/app/js/time-badges.js
```

## Záväzné správanie

### Horný riadok

```text
NOW - DD. MM. RRRR: HH:MM:SS
```

- používa iba lokálny dátum a čas zariadenia,
- nemení sa podľa IGC,
- nemení sa podľa Cesium hodín,
- zostáva aktívny po načítaní aj vymazaní letu.

### Spodný riadok

```text
IGC DD.MM. RRRR, Štart - HH:MM:SS - Pristátie: HH:MM:SS
```

- naplní sa podľa dátumu letu a prvého a posledného platného B-záznamu,
- pri načítaní ďalšieho IGC sa nahradí,
- pri vymazaní načítaného letu sa jeho obsah vyprázdni,
- prázdny riadok zostáva v DOM, aby sa nemenila geometria modulu.

## Odstránené paralelné riešenia

- odstránený `CC/app/js/global-map-tools.js`,
- odstránený `XC/js/global-map-tools.js`,
- HUD a LET proxy už nenačítavajú globálny monolit,
- quick-dock už nenačítava vlastný `sky-flight-summary`,
- modul oblohy už nevytvára ani neaktualizuje vlastnú časovú značku.

## Životný cyklus

Modul poskytuje:

```text
install / activate / deactivate / destroy
```

Pri `destroy()` musí odstrániť DOM, interval a všetky vlastné listenery.

## Overenie

Implementácia nebola v čase zápisu overená v bežiacom prehliadači. Pred zmenou stavu na `OVERENÉ` treba vykonať kontrolný zoznam z `tools/TIME-BADGES.md` a Dizajn manuálu.

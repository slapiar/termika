# Časové značky ako samostatný modul

**Dátum rozhodnutia:** 18. júl 2026, 09:50 Europe/Bratislava  
**Stav:** OPRAVENÉ PO PRVOM PREHLIADAČOVOM TESTE – ČAKÁ NA OPAKOVANÉ OVERENIE

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
- prázdny riadok zostáva v DOM, aby sa nemenila geometria modulu,
- ak chýba rozpoznateľný dátum, zobrazia sa reálne časy B-záznamov bez vymysleného dátumu.

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

## Oprava verzie 1.0.1 po prvom teste

Prvý reálny test ukázal, že IGC riadok sa po načítaní na testovacom pracovisku nezobrazil.

Príčina bola dvojitá:

1. testovacie pracovisko načíta IGC priamo cez `TermikaUxIgcParser.parseBTrack`, ale nenapĺňa `PilotNetwork.letoveBody`,
2. modul každých 500 ms čítal prázdny `PilotNetwork` a vymazal IGC riadok bez ohľadu na to, z akého zdroja pochádzal.

Oprava:

- modul pasívne dekoruje spoločný parser a preberá jeho platný výsledok,
- eviduje vlastníka aktuálneho IGC riadku v `igcSource`,
- prázdny `PilotNetwork` smie vymazať iba riadok, ktorý vytvoril samotný `PilotNetwork`,
- IGC riadok vytvorený parserom alebo udalosťou zostane zachovaný až do výslovného `termika:igc-cleared` alebo nahradenia novým IGC,
- verzia modulu a hostiteľských URL bola zvýšená na `1.0.1`, aby prehliadač nepoužil starú cache.

## Overenie

Verzia `1.0.0` bola v prehliadači potvrdená ako chybná. Verzia `1.0.1` je implementovaná, ale ešte čaká na opakovaný používateľský test načítaním IGC.
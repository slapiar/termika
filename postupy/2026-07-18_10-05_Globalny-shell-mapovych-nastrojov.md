# Globálny shell mapových nástrojov

**Dátum:** 18. júl 2026  
**Stav:** implementované v `main`

## Dôvod zmeny

Čas oblohy, IGC súhrn a quick-dock boli pôvodne pripájané cez konkrétne stránky a krehké prepisovanie funkcií `PilotNetwork`. Výsledok závisel od stránky a poradia načítania skriptov.

## Prijaté rozhodnutie

Spoločné mapové nástroje patria do globálneho pracovného shellu a nesmú byť viazané na konkrétny PHP súbor.

Zdrojový modul:

```text
XC/js/global-map-tools.js
```

CC hostiteľský modul:

```text
CC/app/js/global-map-tools.js
```

Spoločné vstupy:

```text
CC/app/js/workspace-hud-toggle.js
CC/app/js/workspace-flight-toggle.js
CC/ux/workbench-shell/quick-tool-dock/quick-tool-dock.view.php
```

Tým sú pokryté pracovné stránky `index.php`, `explorer.php`, `analysis.php`, `terrain-analysis-test.php` a budúce stránky, ktoré používajú spoločný HUD, LET alebo quick-dock vstup.

## IGC súhrn

Globálny modul pravidelne číta spoločný stav:

```text
PilotNetwork.metadata.flightDate
PilotNetwork.letoveBody
```

Po dostupnosti platných údajov zobrazí:

```text
IGC DD.MM. RRRR, Štart - HH:MM:SS - Pristátie: HH:MM:SS
```

Tým sa odstránila závislosť od poradia wrapperov okolo `pripravPrehravanieLetu()`.

## Dizajnové pravidlo

Normatívny dodatok bol zapísaný do:

```text
docs/TERMIKAXC-UI-UX-DESIGN-MANUAL-GLOBALNE-MAPOVE-NASTROJE.md
```

Quick-dock je predvolene viditeľný. Navigačné tlačidlo a tlačidlo v sekcii ZOBRAZENIE ovládajú rovnaký stav. Stavové ovládače musia mať reverznú funkciu.

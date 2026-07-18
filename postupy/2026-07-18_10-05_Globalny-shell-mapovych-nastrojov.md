# Globálny shell mapových nástrojov – vyradené riešenie

**Dátum pôvodného rozhodnutia:** 18. júl 2026  
**Stav:** VYRADENÉ – NEPOUŽÍVAŤ AKO IMPLEMENTAČNÝ POSTUP  
**Nahradené:** `postupy/2026-07-18_09-50_Casove-znacky-ako-samostatny-modul.md`

## Dôvod vyradenia

Tento dokument pôvodne zaviedol spoločný súbor `global-map-tools.js`, ktorý miešal:

- quick-dock,
- navigačné prepínače,
- časové značky,
- stav oblohy,
- hostiteľské pripájanie rôznych nástrojov.

Po opätovnom prečítaní záväzných postupov, Dizajn manuálu, `TOOLS.md`, zoznamu modulov CC a registra vlastníctva bolo potvrdené, že takýto súbor je v rozpore s modulárnou architektúrou TermikaXC.

Funkčná skupina `workbench-shell` nie je jeden modul. Jednotlivé nástroje musia zostať samostatné, mať vlastný manifest, životný cyklus a jediného vlastníka.

## Odstránené súbory

```text
CC/app/js/global-map-tools.js
XC/js/global-map-tools.js
```

HUD a LET proxy už tento monolit nenačítavajú.

## Platná náhrada

Časové značky vlastní samostatný modul:

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

Quick-dock zostáva samostatným modulom `quick-tool-dock`. Obloha, oblačnosť, prístroje, HUD a LET zostávajú vo svojich vlastníckych moduloch.

## Záväzné pravidlo

Tento súbor zostáva zachovaný iba ako záznam vyradeného rozhodnutia. Pri ďalšej práci sa musí použiť:

- `postupy/Joyee.md`,
- `postupy/2026-07-17_06-06_CC-modularna-struktura-a-kontrola-postupov.md`,
- `postupy/2026-07-18_09-10_Quick-dock-v-indexe-a-reverzne-ovladanie.md`,
- `postupy/2026-07-18_09-50_Casove-znacky-ako-samostatny-modul.md`,
- `tools/TIME-BADGES.md`,
- aktuálny Dizajn manuál.

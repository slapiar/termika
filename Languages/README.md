# Languages

Jazyková vrstva TermikaXC.

Záväzné pravidlá sú stanovené v [`postupy/2026-07-17_Templates-Languages-a-vzhlad-stranok.md`](../postupy/2026-07-17_Templates-Languages-a-vzhlad-stranok.md).

## Zásady

- Slovenčina (`SK_sk`) je povinný zdrojový jazyk a fallback celej inštancie.
- Každý jazyk je **jeden súbor** s úplným katalógom (`SK_sk.json`, `EN_en.json`, ...). Katalógy sa NEDELIA podľa modulov, stránok ani funkčných skupín — nevytvárajú sa súbory typu `common.json` alebo `workbench.json`.
- Všetky jazykové súbory musia mať rovnakú sústavu kľúčov ako `SK_sk.json`.
- Katalógy sú čisté JSON dáta bez HTML a vykonateľného kódu.
- Kľúče sú stabilné a významové, napr. `common.action.close`, `workbench.window.restore`, `terrain.legend.title` — nie slovenská veta.
- Premenné používajú pomenované zástupné znaky: `{version}`, `{count}`, `{name}`.
- Poradie hľadania prekladu: zvolený jazyk → `SK_sk` → samotný kľúč. Chýbajúci preklad nesmie spôsobiť pád stránky.

## Štruktúra

```text
Languages/
├── registry.json
├── SK_sk.json
└── EN_en.json
```

`registry.json` eviduje dostupné katalógy, ich súbor, popisok, smer textu (`direction`) a označuje zdrojový/fallback jazyk (`SK_sk`).

Jazykové katalógy nemajú vlastniť názvy výpočtových veličín, jednotky ani surové dáta. Lokalizuje sa používateľské pomenovanie, nie fyzikálny význam.
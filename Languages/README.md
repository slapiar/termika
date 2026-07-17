# Languages

Jazyková vrstva TermikaXC.

## Zásady

- `sk` je povinný zdrojový jazyk a fallback.
- Katalógy sú čisté JSON dáta bez HTML a vykonateľného kódu.
- Kľúče sú stabilné a významové, napr. `common.action.close`.
- Premenné používajú pomenované zástupné znaky: `{version}`, `{count}`.
- Chýbajúci preklad zobrazí slovenskú hodnotu; ak chýba aj tá, zobrazí sa samotný kľúč.

## Štruktúra

```text
Languages/
├── registry.json
├── sk/
│   ├── common.json
│   └── workbench.json
└── <jazyk>/
    └── rovnaké domény
```

Jazykové katalógy nemajú vlastniť názvy výpočtových veličín, jednotky ani surové dáta. Lokalizuje sa používateľské pomenovanie, nie fyzikálny význam.
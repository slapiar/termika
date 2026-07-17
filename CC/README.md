# CC – paralelná rekonštrukcia TermikaXC

Adresár `CC` je cieľová konštrukcia novej modulárnej vrstvy. Pôvodný `XC` zostáva počas migrácie funkčným zdrojom a referenčným prostredím.

Pred prácou v tomto adresári je povinné prečítať relevantné dokumenty v `postupy/`, najmä `postupy/2026-07-17_06-06_CC-modularna-struktura-a-kontrola-postupov.md`.

Funkčné skupiny nie sú zlúčené moduly. Každý identifikovaný nástroj zostáva vo svojej skupine samostatným modulom s vlastnými súbormi a manifestom.

## Evidencia migrácie

Identifikovaný modul možno preniesť z `XC` aj pred dosiahnutím stavu `VERIFIED_XC`. Prenos nemení stav overenia a nesmie sa vydávať za potvrdenie funkčnosti.

Povolené stavy:

```text
DISCOVERED → DEBUGGING_XC → VERIFIED_XC → WRAPPED_CC → VERIFIED_CC → ACCEPTED
```

Každý prenesený modul musí zostať samostatný, uvádzať svoj pôvod a pravdivý stav overenia. Zapojenie do runtime je samostatné rozhodnutie evidované v manifeste.

## Prvá vlna

Register prvej vlny je v `CC/registry/wave-1.json`. Jeho dnešné položky sú funkčné skupiny, ktoré sa pri prenose rozložia na samostatné vnorené moduly.

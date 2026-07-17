# CC – paralelná rekonštrukcia TermikaXC

Adresár `CC` je cieľová konštrukcia novej modulárnej vrstvy. Pôvodný `XC` zostáva počas migrácie funkčným zdrojom a referenčným prostredím.

## Migračná brána

Funkčný kód modulu sa nesmie preniesť z `XC`, kým príslušný modul nedosiahne stav `VERIFIED_XC`.

Povolené stavy:

```text
DISCOVERED → DEBUGGING_XC → VERIFIED_XC → WRAPPED_CC → VERIFIED_CC → ACCEPTED
```

Adresár kandidáta môže pred `VERIFIED_XC` obsahovať iba manifest a overovaciu kartu. Nesmie predstierať hotovú implementáciu ani byť zapojený do runtime loadera.

## Prvá vlna

Register prvej vlny je v `CC/registry/wave-1.json`. Obsahuje osem cieľových modulov a ich aktuálnu migračnú bránu.

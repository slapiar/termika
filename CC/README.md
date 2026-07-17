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

## Hromadný prenos zdrojov

Úplný register je v `CC/registry/modules.json`; adresárové skupiny sú v `CC/registry/groups.json`.

- 69 identifikovaných prenositeľných položiek je uložených ako 69 samostatných modulov.
- 12 analytických a fyzikálnych jadier je zachovaných osobitne v `CC/kernels/` a nie je vydávaných za UX moduly.
- Každý modul má vlastný adresár, `module.json`, rovnako pomenovaný `.js` vstup a samostatnú `.css` hranicu.
- Pôvodné zdroje sú bez obsahovej zmeny uložené v podadresári `source/` daného modulu.
- `runtime_enabled: false` znamená, že samotný prenos zdroja modul automaticky nezapol.
- Pri moduloch pochádzajúcich z inline PHP je zachovaný celý hostiteľský zdroj. Neskoršie vyčlenenie kontraktu sa preto dá vykonať bez straty pôvodnej implementácie.

Strom je reprodukovateľný skriptom `tools/build-cc-module-tree.mjs`. Skript iba číta `XC` a zapisuje do `CC`; pôvodné zdroje nemení.

Paralelný hostiteľ bez duplicitných samostatných JavaScriptov vzniká v `CC/app` pomocou `tools/build-cc-app.mjs`. Aktuálny rozsah oddelenia a zostávajúci inline dlh sú uvedené v `CC/HOST-SEPARATION.md`.

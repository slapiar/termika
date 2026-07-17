# CC – modulárna štruktúra a povinná kontrola postupov

**Dátum rozhodnutia:** 17. júl 2026, 06:06 UTC  
**Stav:** ZÁVÄZNÝ PRACOVNÝ POSTUP

## Povinná kontrola pred začatím práce

Pred každou implementáciou, migráciou, refaktorom alebo zmenou architektúry TermikaXC je potrebné najprv:

1. prečítať relevantné dokumenty v adresári `postupy/`,
2. skontrolovať aktuálny zoznam a rozhodnutia v `docs/Zoznam modulov CC.md`,
3. preveriť stav a pravidlá cieľovej kostry v `CC/`,
4. porovnať plánovanú zmenu s týmito rozhodnutiami,
5. pri rozpore zastaviť implementáciu a najprv opraviť alebo spresniť dokumentáciu.

Táto kontrola nie je voliteľná ani nahraditeľná pamäťou z predchádzajúceho chatu.

## Skupina nie je modul

Funkčné zoskupenie v katalógu CC je iba organizačná skupina alebo adresárový menný priestor. Nesmie sa automaticky premeniť na jeden zlúčený modul.

- 31 cieľových položiek z hromadnej triáže predstavuje **31 funkčných skupín**.
- Jednotlivé identifikované nástroje, prístroje, adaptéry, okná, služby a pomocné prvky zostávajú **samostatnými modulmi**.
- Každý modul má mať vlastný adresár, vlastný manifest, vlastný JavaScript alebo serverový vstup a vlastný CSS súbor, ak má vizuálnu vrstvu.
- Súbory jedného modulu majú niesť rovnaký základný názov a odlišovať sa príponou.
- Zoskupenie nesmie zrušiť samostatný kontrakt, načítanie, testovateľnosť ani možnosť nahradiť jeden modul bez zásahu do ostatných.

Príklad:

```text
CC/ux/workbench-shell/
├── workspace-theme/
│   ├── workspace-theme.js
│   ├── workspace-theme.css
│   └── module.json
├── workspace-navigation/
│   ├── workspace-navigation.js
│   ├── workspace-navigation.css
│   └── module.json
└── quick-tool-dock/
    ├── quick-tool-dock.js
    ├── quick-tool-dock.css
    └── module.json
```

## Pravidlo migrácie

Pôvodný adresár `XC` zostáva zachovaný ako zdroj a referencia. Moduly sa prenášajú do `CC` samostatne vo vnútri príslušných funkčných skupín. Spoločné správanie patrí do explicitného infraštruktúrneho modulu; nesmie sa riešiť zlúčením susediacich používateľských modulov do jedného súboru.

Rozhodnutím používateľa zo 17. júla 2026 už funkčné overenie v `XC` nie je podmienkou samotného prenosu. Stav overenia sa však naďalej eviduje a nesmie sa predstierať.

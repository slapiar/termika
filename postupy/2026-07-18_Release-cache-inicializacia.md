# Release cache inicializácia inštancie

**Dátum:** 18. júl 2026  
**Stav:** IMPLEMENTOVANÉ, NEOVERENÉ V PREHLIADAČI

## Dôvod

Po nasadení novej verzie nesmie prehliadač používať staré JavaScript a CSS súbory z cache. Ručné hodnoty `$assetVersion` v PHP stránkach sa ľahko zabudnú zmeniť a nie sú spoľahlivým zdrojom pravdy.

## Prijaté riešenie

Jediný zdroj cache-busting verzie pre XC je:

```text
XC/asset/RELEASE_VERSION.txt
```

Spoločná inicializácia je v:

```text
XC/bootstrap-cache.php
```

Bootstrap robí tri veci:

- nastaví `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` pre HTML/PHP vstupy,
- používa release verziu ako `?v=` token pre lokálne CSS a JS assety,
- pri zmene release verzie v prehliadači vymaže dostupné Cache API záznamy, odregistruje prípadné service workery a jednorazovo načíta stránku s `termika_cache_bust` parametrom.

Prehliadačovú HTTP cache nemožno univerzálne fyzicky vymazať zo serverového kódu. Spoľahlivý mechanizmus je preto kombinácia no-store HTML odpovede, nových URL lokálnych assetov a klientského cache-resetu pri zmene release verzie.

## Zapojené vstupy

- `XC/index.php`,
- `XC/terrain-analysis-test.php`,
- `XC/explorer-core.php`,
- `XC/explorer.php`,
- `XC/analysis.php`,
- `XC/setup.php`.

`release.sh` pri auto-commite pridáva aj `XC/asset/RELEASE_VERSION.txt`, pretože tento súbor je nasadzovaný spolu s aplikáciou a riadi cache-busting inštancie.
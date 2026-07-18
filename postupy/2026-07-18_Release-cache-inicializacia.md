# Release cache inicializácia inštancie

**Dátum:** 18. júl 2026  
**Stav:** IMPLEMENTOVANÉ, RELEASE ZATIAĽ NEOVERENÝ NA HOSTINGU

## Autoritatívny runtime

TermikaXC sa vyvíja a nasadzuje výhradne zo stromu:

```text
CC/
```

Adresár `XC/` zostáva v repozitári iba ako historická referencia pôvodného hostiteľa. Nesmie byť zdrojom release balíka ani fallbackom pri jeho zostavovaní.

## Zdroj cache-busting verzie

Jediný nasadzovaný zdroj cache-busting verzie je:

```text
CC/app/asset/RELEASE_VERSION.txt
```

Koreňový súbor:

```text
RELEASE_VERSION
```

slúži na riadenie verzie v repozitári. `release.sh` z neho určí novú verziu a zrkadlí ju do `CC/app/asset/RELEASE_VERSION.txt`.

Spoločná inicializácia prehliadačovej cache je v:

```text
CC/app/bootstrap-cache.php
```

Bootstrap:

- nastavuje `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` pre HTML/PHP vstupy,
- používa release verziu ako `?v=` token pre lokálne CSS a JavaScript assety,
- pri zmene release verzie vymaže dostupné Cache API záznamy, odregistruje prípadné service workery a jednorazovo načíta stránku s `termika_cache_bust` parametrom.

## Zapojené vstupy

- `CC/app/index.php`,
- `CC/app/terrain-analysis-test.php`,
- `CC/app/explorer-core.php`,
- `CC/app/explorer.php`,
- `CC/app/analysis.php`,
- `CC/app/setup.php`.

Koreňový `CC/index.php` presmeruje používateľa na `CC/app/index.php`.

## Release pravidlo

`release.sh`:

1. overí povinné vstupy a modulové korene v `CC/`,
2. aktualizuje `RELEASE_VERSION` a `CC/app/asset/RELEASE_VERSION.txt`,
3. balí iba sledované súbory z `CC/`,
4. vykoná PHP lint všetkých balených PHP súborov,
5. po vytvorení ZIP-u overí, že archív obsahuje `CC/app/index.php`,
6. zastaví release, ak by sa v archíve objavil čo i len jeden súbor z `XC/`.

## Overenie

Pred označením za `OVERENÉ` treba vytvoriť nasledujúci release a skontrolovať:

- ZIP neobsahuje žiadnu cestu `XC/`,
- ZIP obsahuje celý strom `CC/`, najmä `CC/app`, `CC/ux`, `CC/infrastructure` a `CC/services`,
- po nasadení sa otvorí `CC/index.php` a presmeruje na `CC/app/index.php`,
- päta aj cache-busting používajú rovnakú novú verziu,
- testovacia stránka načítava modulové view a skripty z `CC/`, nie historické súbory z `XC/`.

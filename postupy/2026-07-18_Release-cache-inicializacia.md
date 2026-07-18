# Release marker a cache v CC runtime

**Dátum:** 18. júl 2026  
**Stav:** OPRAVENÁ DOKUMENTÁCIA – SPOLOČNÝ CC CACHE BOOTSTRAP ZATIAĽ NEEXISTUJE

## Autoritatívny runtime

TermikaXC sa vyvíja a nasadzuje výhradne zo zdrojového stromu `CC/`. Adresár `XC/` je iba historická referencia a nesmie byť zdrojom release ani fallbackom.

## Release marker

Repozitárový zdroj verzie:

```text
RELEASE_VERSION
```

Nasadzovaný marker aplikácie:

```text
CC/app/asset/RELEASE_VERSION.txt
```

`release.sh` zapíše požadovanú verziu do oboch súborov. Do ZIP-u sa dostane iba nasadzovaný marker z `CC/app/asset/RELEASE_VERSION.txt`, pretože ZIP obsahuje výhradne runtime odvodený z obsahu `CC/`.

Endpoint:

```text
CC/app/release-version.php
```

číta nasadzovaný marker a vracia iba validnú verziu ako `text/plain` bez cache.

## Oprava nepravdivého zápisu

Predchádzajúca verzia tohto dokumentu tvrdila, že existuje:

```text
CC/app/bootstrap-cache.php
```

Tento súbor v CC neexistuje. Išlo o cestu prenesenú zo starého stromu `XC/`. Release ju nesmie kontrolovať a dokumentácia ju nesmie označovať za súčasť CC runtime.

## Aktuálny stav cache-bustingu

CC stránky zatiaľ nepoužívajú jeden spoločný cache bootstrap. Jednotlivé hostiteľské vstupy používajú vlastné hodnoty `$assetVersion` alebo vlastné verzie modulových URL.

Z toho vyplýva:

- release marker spoľahlivo určuje zobrazenú release verziu,
- správne zostavený ZIP nasadí aktuálne CC súbory,
- samotná zmena `CC/app/asset/RELEASE_VERSION.txt` zatiaľ automaticky nezmení všetky URL JavaScriptu a CSS na všetkých CC stránkach,
- tvrdenie, že CC už má jednotné automatické vymazanie prehliadačovej cache, by bolo nepravdivé.

Zjednotenie cache-bustingu je samostatná úloha. Nesmie sa potichu primiešať do opravy release balenia.

## Záväzný release layout

Obsah `CC/` sa v ZIP-e uloží priamo do koreňa:

```text
index.php
app/
ux/
infrastructure/
services/
kernels/
registry/
```

ZIP neobsahuje nadradený priečinok `CC/`, žiadny priečinok `XC/` ani lokálne tajné konfigurácie.

## Overenie

Pred označením release za `OVERENÉ` treba potvrdiť:

- ZIP má `index.php` priamo v koreni,
- ZIP obsahuje `app/`, `ux/`, `infrastructure/`, `services/`, `kernels/` a `registry/`,
- ZIP neobsahuje `CC/` ani `XC/`,
- `app/asset/RELEASE_VERSION.txt` v ZIP-e zodpovedá požadovanej verzii,
- po rozbalení do document rootu funguje presmerovanie `index.php` → `app/index.php`,
- po nasadení sa v Network paneli neobjavujú požiadavky do historického stromu `XC/`,
- pri prípadnej starej browser cache sa stav označí pravdivo a rieši sa samostatnou cache-busting úlohou.
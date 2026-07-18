# Oprava koreňa CC release ZIP-u

**Dátum:** 18. júl 2026  
**Stav:** IMPLEMENTOVANÉ A OVERENÉ V SYNTETICKOM REPOZITÁRI, NEOVERENÉ NA REÁLNOM HOSTINGU

## Dôvod opravy

Po prechode release systému z historického stromu `XC/` na autoritatívny strom `CC/` vznikli dve chybné implementačné domnienky:

1. release kontroloval neexistujúci súbor `CC/app/bootstrap-cache.php`,
2. release ukladal do ZIP-u celý priečinok `CC/` namiesto jeho obsahu.

Prvá chyba blokovala vytvorenie release. Druhá by po rozbalení vytvorila ďalšiu vnorenú úroveň `CC/` a nezodpovedala priamemu document rootu aplikácie.

## Platný kontrakt

Zdrojom sú iba Gitom sledované súbory pod `CC/`. Pri stagingu sa prefix `CC/` odstráni.

Správny koreň ZIP-u:

```text
index.php
app/
ux/
infrastructure/
services/
kernels/
registry/
```

Zakázané koreňové priečinky:

```text
CC/
XC/
```

Lokálne tajné konfigurácie sa nesmú baliť.

## Zmeny v `release.sh`

- odstránená kontrola neexistujúceho cache bootstrapu,
- kontrolujú sa iba reálne CC vstupy,
- staging vzniká výhradne z `git ls-files "CC/"`,
- z každej cesty sa odstráni prefix `CC/`,
- PHP súbory prechádzajú `php -l`,
- výpis ZIP-u sa uloží do pomocného súboru a až potom sa kontroluje,
- overujú sa presné vstupy a celé runtime stromy,
- kontroluje sa neprítomnosť `CC/`, `XC/` a lokálnej konfigurácie,
- kontroluje sa verzia uložená priamo v ZIP-e,
- chybný ZIP sa odstráni.

## Vykonaný technický test

Aktuálny skript bol reprodukovaný v lokálnom testovacom prostredí a prešiel:

```text
bash -n release.sh
```

Následne bol spustený v čistom syntetickom Git repozitári s minimálnym stromom:

```text
CC/index.php
CC/app/index.php
CC/app/terrain-analysis-test.php
CC/app/release-version.php
CC/app/asset/RELEASE_VERSION.txt
CC/registry/modules.json
CC/ux/
CC/infrastructure/
CC/services/
CC/kernels/
```

Príkaz:

```text
./release.sh 3.1.5
```

úspešne vytvoril ZIP s týmto obsahom:

```text
app/asset/RELEASE_VERSION.txt
app/index.php
app/release-version.php
app/terrain-analysis-test.php
index.php
infrastructure/sample/file.txt
kernels/sample/file.txt
registry/modules.json
services/sample/file.txt
ux/workbench-shell/time-badges/module.json
```

Potvrdené bolo:

- `index.php` je priamo v koreni ZIP-u,
- v ZIP-e nie je `CC/` ani `XC/`,
- všetky povinné runtime stromy sú prítomné,
- koreňový marker, CC marker aj marker v ZIP-e majú hodnotu `3.1.5`.

## Hranica overenia

Test potvrdzuje syntax a algoritmus zostavenia ZIP-u. Nepotvrdzuje ešte:

- vytvorenie release v plnom reálnom repozitári,
- rozbalenie na cieľovom Hostingeri,
- dostupnosť všetkých modulov cez web server,
- správanie prehliadačovej cache,
- používateľské funkcie quick-docku a časových značiek po nasadení.

Tieto body sa môžu označiť za `OVERENÉ` až po nasledujúcom reálnom release a používateľskom teste.
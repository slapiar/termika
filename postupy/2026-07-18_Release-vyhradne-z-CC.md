# Release výhradne z CC

**Dátum rozhodnutia:** 18. júl 2026  
**Stav:** OPRAVENÉ PO NEÚSPEŠNOM RELEASE 3.1.4, ČAKÁ NA NOVÝ SKÚŠOBNÝ RELEASE

## Autoritatívny zdroj

TermikaXC sa vyvíja a nasadzuje výhradne zo stromu:

```text
CC/
```

Adresár `XC/` zostáva v repozitári iba ako historická referencia pôvodného riešenia. Nesmie byť runtime, zdroj buildu, fallback ani súčasť release balíka.

## Oprava chybného prvého návrhu

Prvý CC-only návrh obsahoval dve chyby:

1. kontroloval neexistujúci súbor `CC/app/bootstrap-cache.php`, ktorý patril iba starému stromu `XC/`,
2. ukladal do ZIP-u nadradený priečinok `CC/`, hoci nasadenie potrebuje obsah `CC/` priamo v koreňovom adresári aplikácie.

Obe pravidlá sú vyradené.

## Záväzná štruktúra ZIP-u

Zdrojové cesty v repozitári:

```text
CC/index.php
CC/app/
CC/ux/
CC/infrastructure/
CC/services/
CC/kernels/
CC/registry/
```

sa v ZIP-e ukladajú bez prefixu `CC/`:

```text
index.php
app/
ux/
infrastructure/
services/
kernels/
registry/
```

ZIP sa preto rozbaľuje priamo do document rootu aplikácie. Koreňový `index.php` následne presmeruje na `app/index.php`.

V ZIP-e NESMIE vzniknúť ani priečinok `CC/`, ani priečinok `XC/`.

## Release kontrakt

`release.sh` MUSÍ:

1. overiť iba skutočné nasadzované vstupy a koreňové moduly v `CC/`,
2. nikdy nehľadať chýbajúci súbor v `XC/`,
3. aktualizovať repozitárový `RELEASE_VERSION`,
4. zrkadliť verziu do `CC/app/asset/RELEASE_VERSION.txt`,
5. zostaviť dočasný staging výhradne z Gitom sledovaných súborov pod `CC/`,
6. pri stagingu odstrániť z ciest prefix `CC/`,
7. nevkladať do ZIP-u koreňový repozitárový `RELEASE_VERSION`, pretože nepatrí do nasadzovaného runtime,
8. nezabaliť `local-config.php` ani `.local-config.php`,
9. vykonať PHP lint všetkých balených PHP súborov,
10. vytvoriť ZIP s `index.php` priamo v jeho koreni,
11. po vytvorení uložiť výpis ZIP-u do súboru a kontrolovať ho bez krehkej pipeline `unzip | grep` pri `pipefail`,
12. overiť prítomnosť `index.php`, `app/index.php`, release endpointu, release markera a stromov `ux/`, `infrastructure/`, `services/`, `kernels/`,
13. overiť, že release marker v ZIP-e presne zodpovedá požadovanej verzii,
14. chybný ZIP okamžite odstrániť.

## Zakázané postupy

- baliť `XC/`,
- baliť nadradený priečinok `CC/`,
- kopírovať alebo generovať `CC/app` z `XC/` pred release,
- pridávať do kontroly cesty iba podľa pamäti bez overenia ich existencie,
- baliť lokálne tajné konfigurácie,
- označiť release za overený iba preto, že bol vytvorený ZIP alebo sa zmenilo číslo v päte.

## Povinné overenie nasledujúceho release

Výpis ZIP-u musí obsahovať napríklad:

```text
index.php
app/index.php
app/terrain-analysis-test.php
app/asset/RELEASE_VERSION.txt
ux/workbench-shell/time-badges/module.json
ux/workbench-shell/quick-tool-dock/quick-tool-dock.view.php
```

Nesmie obsahovať:

```text
CC/
XC/
local-config.php
.local-config.php
```

Po nasadení sa musí potvrdiť:

- otvorenie aplikácie cez koreňový `index.php`,
- načítanie modulov z `ux/`, `infrastructure/`, `services/` a `kernels/`,
- zobrazenie aktuálneho quick-docku a časových značiek,
- rovnaká verzia v päte a v `app/asset/RELEASE_VERSION.txt`,
- žiadna lokálna požiadavka smerujúca do `XC/`.
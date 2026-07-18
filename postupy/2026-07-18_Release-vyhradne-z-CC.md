# Release výhradne z CC

**Dátum rozhodnutia:** 18. júl 2026  
**Stav:** IMPLEMENTOVANÉ, NEOVERENÉ VYTVORENÍM A NASADENÍM NOVÉHO RELEASE

## Rozhodnutie

TermikaXC sa od tohto rozhodnutia vyvíja a nasadzuje výhradne zo stromu:

```text
CC/
```

Adresár:

```text
XC/
```

zostáva v repozitári iba ako historická referencia pôvodného riešenia. Slúži na kontrolu pôvodného zámeru pri diagnostike zrútenej alebo chýbajúcej funkcie. Nie je runtime, zdroj buildu ani súčasť release balíka.

## Dôvod

Predchádzajúci `release.sh` balil iba súbory z `XC/`. Preto sa do release nedostali nové modulové implementácie, view, štýly a hostiteľské proxy uložené v `CC/`. Číslo verzie v päte dokazovalo iba úspešné nasadenie starého XC balíka, nie nasadenie aktuálneho CC runtime.

## Nový release kontrakt

`release.sh` musí:

1. overiť existenciu povinných vstupov a modulových koreňov v `CC/`,
2. aktualizovať koreňový `RELEASE_VERSION`,
3. zrkadliť verziu do `CC/app/asset/RELEASE_VERSION.txt`,
4. baliť iba sledované súbory z `CC/`,
5. zachovať celý strom potrebný pre runtime: `app/`, `ux/`, `infrastructure/`, `services/`, `kernels/` a ďalšie súčasti CC,
6. nečítať, nekopírovať ani negenerovať runtime z `XC/`,
7. vykonať PHP lint všetkých balených PHP súborov,
8. po vytvorení ZIP-u overiť prítomnosť `CC/app/index.php`,
9. zastaviť release a odstrániť chybný ZIP, ak archív obsahuje ľubovoľnú cestu `XC/`.

## Vstup aplikácie

Release obsahuje:

```text
CC/index.php
```

ktorý presmeruje na:

```text
CC/app/index.php
```

Pri nasadení sa preto musí zachovať koreň stromu `CC/` alebo musí byť webový document root nastavený na rozbalený adresár `CC`.

## Zakázané postupy

- kopírovať zmeny z CC späť do XC iba kvôli release,
- spúšťať pred release build, ktorý prepíše aktuálny `CC/app` obsahom z `XC/`,
- používať XC ako tichý fallback pri chýbajúcom CC súbore,
- vydávať release iba podľa správneho čísla v päte bez kontroly, z ktorého stromu bol vytvorený.

## Povinné overenie nasledujúceho release

- výpis ZIP-u neobsahuje `XC/`,
- výpis ZIP-u obsahuje `CC/index.php` a `CC/app/index.php`,
- testovacia stránka načíta nové modulové view z `CC/ux`,
- časové značky a quick-dock zodpovedajú aktuálnemu CC zdroju,
- päta zobrazuje rovnakú verziu ako `CC/app/asset/RELEASE_VERSION.txt`,
- po nasadení sa v Network paneli neobjavujú lokálne požiadavky smerujúce do `XC/`.

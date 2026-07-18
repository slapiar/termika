# Release verzia a balík TermikaXC

## 1. Účel

Release systém má dve oddelené úlohy:

1. označiť nasadenú verziu aplikácie,
2. vytvoriť ZIP pripravený na priame rozbalenie do document rootu aplikácie.

Autoritatívnym runtime je výhradne `CC/`. `XC/` je iba historická referencia.

## 2. Identita a stav

| Položka | Hodnota |
|---|---|
| ID nástroja | `release-badge` |
| Stav | `ROZPRACOVANÉ` – release skript opravený po chybe 3.1.4, čaká na nový skúšobný release a nasadenie |
| Verzia nástroja | `1.0.1` |
| Vlastník badge | `CC/ux/system-status-bar/release-badge/` |
| Hostiteľský proxy vstup | `CC/app/js/terrain-release-badge.js` |
| Serverový endpoint | `CC/app/release-version.php` |
| Nasadzovaný zdroj verzie | `CC/app/asset/RELEASE_VERSION.txt` |
| Repozitárový zdroj verzie | `RELEASE_VERSION` |
| Release skript | `release.sh` |

## 3. Zobrazenie verzie

Platná verzia sa zobrazuje napríklad ako:

```text
TermikaXC v3.1.5
```

Endpoint `CC/app/release-version.php` číta `CC/app/asset/RELEASE_VERSION.txt`, vracia `text/plain`, zakazuje cache odpovede endpointu a odmieta neplatný formát.

## 4. Autoritatívny zdroj release

`release.sh` pracuje výhradne s obsahom:

```text
CC/
```

Nesmie:

- čítať runtime z `XC/`,
- dopĺňať chýbajúci CC súbor z `XC/`,
- pred release spúšťať build, ktorý prepíše `CC/app` obsahom z `XC/`,
- baliť nadradený priečinok `CC/`,
- baliť lokálne tajné konfigurácie.

## 5. Štruktúra ZIP-u

Zdroj v repozitári:

```text
CC/index.php
CC/app/
CC/ux/
CC/infrastructure/
CC/services/
CC/kernels/
CC/registry/
```

Výsledok v ZIP-e:

```text
index.php
app/
ux/
infrastructure/
services/
kernels/
registry/
```

ZIP sa rozbaľuje priamo do koreňa aplikácie. Súbor `index.php` potom presmeruje na `app/index.php`.

V ZIP-e nie je priečinok `CC/`, priečinok `XC/` ani koreňový repozitárový súbor `RELEASE_VERSION`.

## 6. Postup zostavenia

`release.sh`:

1. určí alebo zvýši verziu `x.y.z`,
2. overí existenciu skutočných CC vstupov a modulových koreňov,
3. skontroluje čistý pracovný strom,
4. zapíše verziu do `RELEASE_VERSION` a `CC/app/asset/RELEASE_VERSION.txt`,
5. vytvorí dočasný staging z Gitom sledovaných súborov pod `CC/`,
6. odstráni z ciest prefix `CC/`,
7. odmietne lokálne tajné konfigurácie,
8. vykoná PHP lint,
9. vytvorí ZIP zo staging koreňa,
10. uloží výpis ZIP-u do pomocného súboru,
11. overí požadované vstupy a celé runtime stromy,
12. overí neprítomnosť `CC/`, `XC/` a lokálnej konfigurácie,
13. overí obsah release markera priamo v ZIP-e,
14. pri chybe odstráni neplatný ZIP.

## 7. Použitie

```bash
./release.sh patch --auto-commit
```

Alebo explicitne:

```bash
./release.sh 3.1.5 --auto-commit
```

`--auto-push` pushne aktuálnu pracovnú vetvu. Pri súbežnej práci používateľa, Joyee a Copilota sa používa iba podľa dohodnutého vetvového postupu.

## 8. Cache

Nasadzovaný marker určuje release verziu, ale CC zatiaľ nemá jeden spoločný `bootstrap-cache.php`. Jednotlivé stránky stále používajú vlastné `$assetVersion` alebo verzie modulových URL.

Preto sa nesmie tvrdiť, že samotný release marker automaticky zmení URL všetkých CSS a JavaScript súborov. Zjednotenie cache-bustingu je samostatná úloha.

## 9. Správanie pri chybe

Pri chybe release:

- skript vypíše presnú chýbajúcu alebo neplatnú cestu,
- nevytvorí platný ZIP alebo chybný ZIP odstráni,
- nepoužije `XC/` ako fallback,
- necommitne neplatný release.

Pri chybe načítania badge zostane núdzový text, chyba sa zapíše do konzoly a aplikácia pokračuje bez zásahu do analytických výsledkov.

## 10. Povinné overenie

Pred označením za `OVERENÉ` sa skontroluje:

- `bash -n release.sh`,
- vytvorenie skúšobného ZIP-u,
- `index.php` priamo v koreni ZIP-u,
- prítomnosť `app/`, `ux/`, `infrastructure/`, `services/`, `kernels/`, `registry/`,
- neprítomnosť `CC/`, `XC/`, `local-config.php`, `.local-config.php`,
- zhoda markera v ZIP-e s požadovanou verziou,
- priame rozbalenie do document rootu,
- otvorenie aplikácie a testovacej stránky,
- načítanie aktuálneho quick-docku a časových značiek.

## 11. Súvisiace súbory

- [`../RELEASE_VERSION`](../RELEASE_VERSION)
- [`../release.sh`](../release.sh)
- [`../CC/index.php`](../CC/index.php)
- [`../CC/app/asset/RELEASE_VERSION.txt`](../CC/app/asset/RELEASE_VERSION.txt)
- [`../CC/app/release-version.php`](../CC/app/release-version.php)
- [`../CC/ux/system-status-bar/release-badge/`](../CC/ux/system-status-bar/release-badge/)
- [`../postupy/2026-07-18_Release-cache-inicializacia.md`](../postupy/2026-07-18_Release-cache-inicializacia.md)
- [`../postupy/2026-07-18_Release-vyhradne-z-CC.md`](../postupy/2026-07-18_Release-vyhradne-z-CC.md)
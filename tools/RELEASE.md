# Zobrazenie aktuálnej release verzie

## 1. Účel

Nástroj zobrazuje aktuálnu verziu nasadeného modulového runtime TermikaXC. Používateľ tak okamžite vidí, či pracuje s očakávaným release.

## 2. Identita a stav

| Položka | Hodnota |
|---|---|
| ID nástroja | `release-badge` |
| Stav | `ROZPRACOVANÉ` – čaká na opakované používateľské overenie po prechode release na CC |
| Verzia nástroja | `1.0.1` |
| Vlastník | `CC/ux/system-status-bar/release-badge/` |
| Hostiteľský proxy vstup | `CC/app/js/terrain-release-badge.js` |
| Serverový endpoint | `CC/app/release-version.php` |
| Nasadzovaný zdroj verzie | `CC/app/asset/RELEASE_VERSION.txt` |
| Repozitárový zdroj verzie | `RELEASE_VERSION` |

## 3. Zobrazenie

Platná verzia sa zobrazuje napríklad ako:

```text
TermikaXC v3.1.4
```

Rovnaký release marker používa päta stránok aj cache-busting lokálnych JavaScript a CSS súborov.

## 4. Spôsob načítania

Endpoint:

```text
CC/app/release-version.php
```

číta:

```text
CC/app/asset/RELEASE_VERSION.txt
```

Endpoint:

- vracia `Content-Type: text/plain`,
- zakazuje cache,
- prijíma iba prísny formát verzie,
- pri chybe vracia chybový stav, nie HTML stránku.

Klient vykoná druhú kontrolu regulárnym výrazom. Platný príklad:

```text
3.1.4
```

Neplatný obsah sa odmietne a do rozhrania sa nezapíše.

## 5. Release kontrakt

`release.sh` pracuje výhradne so stromom:

```text
CC/
```

Pri vytvorení release:

1. určí verziu z koreňového `RELEASE_VERSION`,
2. zapíše ju do `CC/app/asset/RELEASE_VERSION.txt`,
3. zabalí sledované súbory z `CC/`,
4. nezabalí žiadny súbor z `XC/`,
5. overí prítomnosť `CC/app/index.php` a neprítomnosť ciest `XC/` v hotovom ZIP-e.

`XC/` je iba historická referencia v repozitári a nie je súčasťou nasadzovaného produktu.

## 6. Správanie pri chybe

Pri chybe načítania alebo validácie:

- zostane pôvodný núdzový text,
- chyba sa zapíše do konzoly,
- neplatný obsah sa nikdy nezobrazí ako verzia,
- analytické výsledky a 3D scéna zostanú nedotknuté.

Pri chybe zostavenia release sa `release.sh` ukončí bez vytvorenia platného ZIP-u.

## 7. Verejné rozhranie

```js
window.TermikaReleaseBadge = {
    VERSION,
    RELEASE_URL,
    load,
    applyRelease,
    normalizeRelease,
    get release() {}
};
```

## 8. Súvisiace súbory

- [`../RELEASE_VERSION`](../RELEASE_VERSION)
- [`../release.sh`](../release.sh)
- [`../CC/app/asset/RELEASE_VERSION.txt`](../CC/app/asset/RELEASE_VERSION.txt)
- [`../CC/app/release-version.php`](../CC/app/release-version.php)
- [`../CC/app/js/terrain-release-badge.js`](../CC/app/js/terrain-release-badge.js)
- [`../CC/ux/system-status-bar/release-badge/`](../CC/ux/system-status-bar/release-badge/)
- [`../postupy/2026-07-18_Release-cache-inicializacia.md`](../postupy/2026-07-18_Release-cache-inicializacia.md)
- [`../postupy/2026-07-18_Release-vyhradne-z-CC.md`](../postupy/2026-07-18_Release-vyhradne-z-CC.md)

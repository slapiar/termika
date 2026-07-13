# Zobrazenie aktuálnej release verzie

## 1. Účel

Nástroj zobrazuje v hlavičke ovládacieho panela testovacej analýzy aktuálnu verziu zo súboru:

```text
RELEASE_VERSION
```

Používateľ tak okamžite vidí, či pracuje s očakávaným release.

## 2. Identita a stav

| Položka | Hodnota |
|---|---|
| ID nástroja | `release-badge` |
| Stav | `ROZPRACOVANÉ` – opravené po prvom teste, čaká na opakované používateľské overenie |
| Verzia nástroja | `1.0.1` |
| Klientská implementácia | `XC/js/terrain-release-badge.js` |
| Serverový endpoint | `XC/release-version.php` |
| Autoritatívny zdroj verzie | `RELEASE_VERSION` |

## 3. Zobrazenie

Statický núdzový text sa po úspešnom načítaní zmení napríklad na:

```text
TermikaXC v2.6.11 · modulárna analýza terénu
```

Rovnaká verzia sa použije aj v titulku karty prehliadača.

## 4. Spôsob načítania

Pôvodná verzia sa pokúšala čítať `../RELEASE_VERSION` priamo cez HTTP. Pri prvom používateľskom teste server namiesto textového súboru vrátil HTML dokument. Príliš benevolentná normalizácia následne odstránila značky a časť HTML zobrazila v hlavičke.

Od verzie nástroja `1.0.1` sa používa endpoint:

```text
release-version.php
```

Endpoint:

- číta koreňový `RELEASE_VERSION` priamo zo súborového systému,
- vracia `Content-Type: text/plain`,
- zakazuje cache,
- prijíma iba prísny formát verzie,
- pri chybe vracia chybový stav, nie HTML stránku.

Klient následne vykoná druhú kontrolu regulárnym výrazom. Platný príklad:

```text
2.6.11
```

Neplatný obsah, napríklad HTML dokument, sa odmietne a do hlavičky sa nezapíše.

## 5. Správanie pri chybe

Pri chybe načítania alebo validácie:

- zostane pôvodný núdzový text hlavičky,
- chyba sa zapíše do konzoly,
- neplatný obsah sa nikdy nezobrazí ako verzia,
- analytické výsledky a 3D scéna zostanú nedotknuté.

## 6. Verejné rozhranie

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

## 7. Súvisiace súbory

- [`../RELEASE_VERSION`](../RELEASE_VERSION)
- [`../XC/release-version.php`](../XC/release-version.php)
- [`../XC/js/terrain-release-badge.js`](../XC/js/terrain-release-badge.js)
- [`../postupy/TermikaXC-v2.6.11-oprava-release-a-mesh-renderera.md`](../postupy/TermikaXC-v2.6.11-oprava-release-a-mesh-renderera.md)
- [`../TOOLS.md`](../TOOLS.md)
- [`../CHANGELOG.md`](../CHANGELOG.md)

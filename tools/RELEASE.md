# Zobrazenie aktuálnej release verzie

## 1. Účel

Nástroj zobrazuje v hlavičke ovládacieho panela testovacej analýzy aktuálnu verziu načítanú zo súboru:

```text
RELEASE_VERSION
```

Používateľ tak okamžite vidí, či pracuje s očakávaným release.

## 2. Identita a stav

| Položka | Hodnota |
|---|---|
| ID nástroja | `release-badge` |
| Stav | `ROZPRACOVANÉ` – implementované, čaká na používateľské overenie |
| Verzia nástroja | `1.0.0` |
| Implementácia | `XC/js/terrain-release-badge.js` |
| Zdroj verzie | `RELEASE_VERSION` |

## 3. Zobrazenie

Pôvodný statický text:

```text
TermikaXC v2.6 · modulárna analýza terénu
```

sa po načítaní zmení napríklad na:

```text
TermikaXC v2.6.10 · modulárna analýza terénu
```

Rovnaká verzia sa použije aj v titulku karty prehliadača.

## 4. Správanie

- súbor `RELEASE_VERSION` sa načíta s nastavením `cache: no-store`,
- úvodné písmeno `v` sa normalizuje, aby sa nezobrazilo dvakrát,
- pri chybe načítania zostane pôvodný text a chyba sa zapíše iba do konzoly,
- nástroj nemení analytické výsledky ani stav 3D scény.

## 5. Verejné rozhranie

```js
window.TermikaReleaseBadge = {
    VERSION,
    RELEASE_URL,
    load,
    applyRelease,
    get release() {}
};
```

## 6. Súvisiace súbory

- [`../RELEASE_VERSION`](../RELEASE_VERSION)
- [`../XC/js/terrain-release-badge.js`](../XC/js/terrain-release-badge.js)
- [`../TOOLS.md`](../TOOLS.md)
- [`../CHANGELOG.md`](../CHANGELOG.md)
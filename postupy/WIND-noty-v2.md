# WIND noty v2

## Koncové rozhodnutie

Pre TermikaXC je najefektívnejšie riešenie:

- **Cesium = Zem a geolokácia**,
- **fokus = primárna jednotka priestoru**,
- **binárne polia = dátová pravda**,
- **WebM = výkonová vizualizačná cache**,
- **IGC = trasa pre preload a plynulé prepájanie fokusov**.

Jednou vetou:

**WebM je výkonová vrstva, binárne polia sú dátová pravda.**

## Prečo toto riešenie vyhráva

- Je rýchle počas letu: prehrávanie môže bežať z pripraveného WebM bez opakovaného výpočtu.
- Zachováva fyzikálnu presnosť: diagnostika, audit a reprocessing idú vždy z binárnych polí.
- Je kompatibilné s doterajším workflow: fokusy kopírujú reálne oblasti záujmu.
- Je škálovateľné pre históriu aj decentralizáciu: verzovanie, hash, synchronizácia, deduplikácia.

## Metodika Fokus-first

### 1) Cesium ostáva nositeľ terénu

- Neukladáme mapu ako fyzikálny základ.
- Ukladáme geometriu rozsahu fokusu, väzbu na Cesium priestor a jeho identitu.

### 2) Každý fokus má jedinečné ID

Pod identitou fokusu sa ukladajú minimálne:

- vstupné údaje,
- výsledky výpočtov,
- vrstvy,
- čas vzniku,
- čas platnosti,
- autor,
- verzia fyzikálneho modelu,
- hash vstupu a hash výsledku.

### 3) Autoritatívny základ sú binárne polia

Ukladajú sa minimálne vrstvy:

- `u_ms`, `v_ms`, neskôr `w_ms`,
- teplota, tlak, vlhkosť,
- strih, divergencia/konvergencia,
- confidence.

Každá vrstva musí niesť pôvod, čas platnosti, verziu modelu a integritný hash.

### 4) WebM je cache, nie zdroj pravdy

- WebM slúži na plynulé prehrávanie dynamiky.
- Klik diagnostika, porovnanie modelov a všetky odvodené výpočty sa robia z binárnych polí.
- WebM sa môže kedykoľvek prepočítať z autoritatívnych dát.

### 5) Nový výpočet = nová verzia

- Pri zmene vstupu alebo modelu vzniká nová verzia vrstvy, prípadne nový fokus.
- Pri prekryve platí pravidlo: prednosť má časovo platnejší a novší výpočet.

### 6) IGC riadi načítanie počas letu

- Fokusy sa načítavajú dopredu pozdĺž trasy.
- Prepínanie fokusov musí byť plynulé, bez zastavenia letového režimu.
- Letový režim nepovoľuje nepovinné výpočty ani veľké synchronizácie.

## Úložná efektivita bez straty presnosti

Primárne úspory sa robia nad binárnymi poľami, nie degradáciou fyziky:

- kompresia binárnych blokov,
- deduplikácia identických blokov podľa hash,
- verzovanie po vrstvách,
- retenčné pravidlá pre cache.

Pravidlo pri nedostatku priestoru:

1. najprv redukovať alebo mazať WebM cache,
2. potom redukovať sekundárne preview produkty,
3. autoritatívne binárne polia ponechať.

## Štruktúra dát fokusu (v1 návrh)

```text
focuses/
  FOCUS_ID/
    manifest.json
    inputs/
      temp.normalized.bin
      terrain.ref.json
    fields/
      wind_uv.layer-Lxx.valid-YYYYMMDDTHHMMSSZ.vN.bin
      thermo.layer-Lxx.valid-YYYYMMDDTHHMMSSZ.vN.bin
      derived.layer-Lxx.valid-YYYYMMDDTHHMMSSZ.vN.bin
    render-cache/
      wind.layer-Lxx.valid-YYYYMMDDTHHMMSSZ.vN.webm
    integrity/
      checksums.sha256
```

## Manifest fokusu (minimum)

`manifest.json` obsahuje minimálne:

- `focus_id`,
- priestorový rozsah a súradnicový systém,
- čas vzniku a interval platnosti,
- `source_temp_hash`,
- `terrain_version`,
- `model_version`,
- zoznam vrstiev a ich verzií,
- hash každého binárneho bloku,
- väzbu render cache na konkrétnu verziu vrstvy,
- autora a pôvod výpočtu.

## Prevádzkové pravidlo

- Počas letu prehrávať pripravenú cache.
- Pri analýze alebo audite čítať autoritatívne binárne polia.
- Nikdy nezamieňať vizuálny výstup s fyzikálnym zdrojom pravdy.

## Implementačné artefakty v1

- Manifest schema: [postupy/WIND-focus-manifest-schema-v1.json](postupy/WIND-focus-manifest-schema-v1.json)
- Binárny formát poľa: [postupy/WIND-binarne-pole-format-v1.md](postupy/WIND-binarne-pole-format-v1.md)
- Retenčné profily: [postupy/WIND-retencne-profily-v1.md](postupy/WIND-retencne-profily-v1.md)
- CLI validačný checker: [tools/validate-wind-focus-manifest.php](tools/validate-wind-focus-manifest.php)
- Ukážkový manifest: [postupy/WIND-focus-manifest-example-v1.json](postupy/WIND-focus-manifest-example-v1.json)

## Rýchly štart validácie

Spusti kontrolu na funkčnom príklade:

```bash
php tools/validate-wind-focus-manifest.php postupy/WIND-focus-manifest-example-v1.json
```

Očakávaný výsledok:

- `Manifest OK: ...` a návratový kód `0`.

Poznámka:

- Príkaz s `path/to/manifest.json` je iba placeholder a skončí kódom `2`, ak súbor neexistuje.

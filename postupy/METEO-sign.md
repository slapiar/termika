# METEO-sign

## Ucel

Tento zapis definuje jednotny slovnik meteorologickych prvkov (signs) pre TermikaXC, aby mali vsetky vrstvy rovnaky datovy model, farebnu logiku a diagnostiku.

## Zakladne zasady

- Meteo vrstva je analyticka vizualizacia, nie dekoracia.
- Kazdy vykresleny prvok musi mat vysvetlitelny vypocet.
- Kazda hodnota musi mat povod: MERANE, MODELOVE, INTERPOLOVANE, ODVODENE.
- Ak vstup chyba, prvok sa nezobrazi ako "hotovy", ale ako "nedostupny".
- Vizualizacia nesmie prepisovat geometriu terenu ani morfologicku vrstvu B.

## Prioritne meteo prvky (poradie implementacie)

1. WIND_FIELD_2D_AGL (prudemie pri zemi nad terenom)
2. TEMP_GRADIENT_SURFACE (teplotny kontrast povrchu a prilahlej vrstvy)
3. COOLING_BOUNDARY (ochladzovacie rozhrania: ladovec, voda, sneh)
4. CONVERGENCE_ZONE (linie zbiehania prudnic)
5. DIVERGENCE_ZONE (linie rozbiehania prudnic)
6. SHEAR_LAYER (strih vetra po vrstvach)
7. THERMAL_BUBBLES (diskretne stupave bubliny)

## Spolocny datovy model prvku

Kazdy prvok ma mat aspon:

- id: jednoznacny identifikator
- type: typ prvku (napr. WIND_FIELD_2D_AGL)
- source: povod dat
- validFrom, validTo: casova platnost
- geometry: bod, krivka, plocha, objem
- level: AGL/AMSL hladina alebo interval
- metrics: vypoctene metriky
- confidence: 0..1
- diagnostics: textovy dovod vzniku

Priklad:

```json
{
  "id": "wind-2d-001",
  "type": "WIND_FIELD_2D_AGL",
  "source": "ODVODENE",
  "level": { "agl_m": 30 },
  "metrics": {
    "windSpeedMs": 6.4,
    "windDirDeg": 228,
    "tempDeltaK": -1.8,
    "convergence": 0.22
  },
  "confidence": 0.74
}
```

## Render pravidla (global)

- Vektor smeru sa kresli sipkou po dotycnici prudnice.
- Hustota prudnic sa riadi rychlostou a divergence/convergence.
- Teplotna zmena moduluje farbu prudnice, nie orientaciu.
- Geometricky konflikt s terennymi bodmi sa riesi malym z-offsetom nad teren.
- Pri malych rychlostiach sa prudnice skracuju a rednu.

## Diagnostika

Kazdy klik na meteo prvok ma zobrazit:

- smer, rychlost, hladinu,
- teplotnu odchylku oproti okoliu,
- lokalnu convergenciu/divergenciu,
- zdroj dat a cas vypoctu,
- slovne vysvetlenie "preco sa prvok zobrazuje".

## Vazba na roadmapu v2.6

Najprv:

- stabilizovat WIND_FIELD_2D_AGL nad terenom,
- zaviest COOLING_BOUNDARY pre ladovec/sneh/vodu,
- potom aktivovat THERMAL_BUBBLES.

Az nasledne:

- prechod na 3D vrstvene prudenie a shear.

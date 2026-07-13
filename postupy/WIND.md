# WIND
Charakterictika prúdenia vzduchu - Vietor. Načítava sa z zvoleného meteorologického zdroja automaticky so zvoleným mapovým priestorom. 

## Ucel prvku

WIND je meteo prvok pre vizualizaciu prudenia vzduchu mapou pomocou prudnic so sipkami. Ma zobrazit:

- smer vetra,
- rychlost vetra,
- lokalny teplotny kontrast (napr. ochladenie nad ladovcom),
- zony zbiehania a rozbiehania,
- dynamicky potencial pre skorci vznik termickych bublin.

## Fyzikalna idea pre ladovec a ochladzovanie

Ked horizontalny tok prejde ponad chladny povrch (ladovec, sneh, studena voda), meni sa teplota prilahlej vrstvy a tym aj hustota. Na rozhrani teplot moze vzniknut:

- zmena vztlakovych pomerov,
- horizontalna tlakova nerovnovaha,
- lokalne zbiehanie prudenia,
- mechanicke alebo termicke "odpichnutie" prehriatej bubliny vedla chladneho jazyka.

Modelovy indikator spustenia:

- silny horizontalny teplotny gradient,
- pritomna convergencia,
- plus kladny buoyancy prebytok v susednej teplej bunke.

## Datovy model WIND bunky

```json
{
  "lat": 48.9,
  "lon": 19.6,
  "agl_m": 30,
  "u_ms": -3.9,
  "v_ms": 5.1,
  "speed_ms": 6.4,
  "dir_deg": 217,
  "temp_air_c": 12.6,
  "temp_surface_c": 3.4,
  "tempDeltaK": -2.1,
  "convergence": 0.18,
  "shear": 0.04,
  "confidence": 0.72,
  "source": "ODVODENE"
}
```

## Pipeline vypoctu (v1)

1. Vyber analyzovanej oblasti (podla kamery alebo test centra).
2. Vzorkovanie vetra na pravidelnej mriezke v jednej AGL hladine (napr. 30 m).
3. Interpolacia vektora vetra z dostupnych vstupov (TEMP, model, fallback).
4. Korekcia prudenia o terrain steering:
   - spomalenie v zavetri,
   - urychlenie v zuzeniach,
   - odchylka po svahoch a dolinach.
5. Odhad lokalnej teplotnej zmeny od povrchu:
   - povrchovy typ,
   - radacny stav,
   - chladne rozhrania (ladovec, sneh, voda).
6. Vypocet divergence/convergence z pola u,v.
7. Integracia prudnic od seed bodov.
8. Render prudnic so sipkami a farbou podla tempDeltaK.

## Vizualny jazyk

### Prudnice

- Smer: dotycnica prudnice.
- Sipka: periodicky marker v smere toku.
- Dlzka sipky: proporcionalna rychlosti.
- Hustota prudnic: proporcionalna |v| a |convergence|.

### Farba (odporucanie)

- Ochladzovanie: cyan az modra.
- Neutral: svetla siva.
- Ohrievanie: zlta az oranzova.

Priklad mapovania:

- tempDeltaK <= -2.0 -> #1E88E5
- -2.0 < tempDeltaK < 2.0 -> #B0BEC5
- tempDeltaK >= 2.0 -> #FFB300

### Hrubka

- 1 px az 4 px podla rychlosti v rozsahu 0 az 12 m/s.

### Animacia

- Posun textury alebo "dash phase" v smere toku.
- 20-30 FPS, adaptivne znizenie pri zatazi.

## Minimalna implementacia v kode (MVP)

Navrh modulov:

- XC/js/wind-field.js: vypocet vektora vetra a metrik.
- XC/js/wind-render.js: prudnice + sipky + farebna skala.
- XC/js/wind-ui.js: prepinace, legenda, diagnostika.

Integracny bod:

- napojit ako modul do TerrainAnalysisCore po geometrii,
- alebo samostatny registrator "meteo" vrstiev s rovnakou diagnostikou.

## Diagnosticke okno WIND

Po kliku na prudnicu zobrazit:

- speed, dir, u/v,
- tempDeltaK a typ povrchu,
- convergence/divergence,
- confidence a source,
- text: "co to znamena pre termiku".

## Napojenie na buduci prvok THERMAL_BUBBLES

WIND pripravi pre bubliny:

- advekcny vektor pri zemi,
- trigger zony (convergence + teplotny kontrast),
- hranice stabilnych a nestabilnych buniek.

THERMAL_BUBBLES budu vykreslene ako diskretne castice stupania (nie dlhe prudnice),
pricom horizontalny drift preberu z WIND pola a vertikalnu zlozku z thermal modelu.

## Test scenare

1. Bezvetrie, homogenny povrch: kratke, riedke prudnice, slaba convergencia.
2. Mierny vietor cez ladovec: viditelny chladny jazyk a zmena prudnic.
3. Vietor cez dolinu: steering po osi doliny, zbiehanie pri sutoku.
4. Silny strih vo vyske: pripava markerov pre buduce shear vrstvy.

## Definition of Done pre WIND v1

- Prudnice sa stabilne vykresluju v realnom case nad mapou.
- Sipky konzistentne ukazuju smer toku.
- Farba nesie informaciu o tempDeltaK.
- Diagnostika vysvetli vypocet bez "black box" spravania.
- Vykon zostane plynuly pri beznom testovacom rozsahu oblasti.

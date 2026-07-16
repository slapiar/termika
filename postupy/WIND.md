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

## Dynamicky model vetra z akceleracie castice

Zakladny vietor z TEMP je iba okrajova podmienka. Vnutorna dynamika WIND sa ma pocitat
z akceleracie vzduchovej castice a zmen energie, hmoty a hybnosti.

Pracovny tvar:

```text
V_total(x,y,z,t) = V_bg(z,t) + dV_conv + dV_terrain + dV_surface + dV_shear
```

Kde:

- `V_bg` je profilovy vietor z TEMP,
- `dV_conv` je prispevok konvekcie a vztlaku,
- `dV_terrain` je vedenie toku terenom (dolina, hrana, zlom),
- `dV_surface` je vplyv povrchu (ladovec, sneh, voda, suchy teren),
- `dV_shear` je zmena toku od strihu medzi vrstvami.

### Rezim pod LCL (nenasytena castica)

```text
dw/dt = B - D - P
B = g * (Tv_parcel - Tv_env) / Tv_env
dT_parcel/dt = -Gamma_d * w + M_T
```

Kde `D` je odpor, `P` tlakova brzda a `M_T` mieasanie teploty s okolim.

### Rezim nad LCL (nasytena castica)

Od LCL sa prepina fyzika na nasytenu vetvu:

```text
dT_parcel/dt = -Gamma_m * w + (Lv/Cp) * C + M_T
dqv/dt = -C + M_q
dql/dt = C - R
```

Kde:

- `C` je kondenzacia,
- `R` je odtok kvapociek (precipitacny odber),
- `M_q` je mieasanie vlhkosti.

Vztlak sa pocita s virtualnou teplotou a zatazenim kondenzatom.

### Dovod tejto formulacie

Vietor nesmie byt iba prepisany z jedneho cisla smeru a rychlosti. Ma byt vysledkom
lokalnej energetiky a dynamiky castice v case. Preto je prechod v LCL zavazny bod
modelu, kde sa meni termodynamicky rezim a pravidla vyvoja prudenia.

### Implementacna poznamka

V1 zostava 2D mapa prudnic ako diagnosticka vrstva. Dalsie kroky:

1. viac AGL hladin a medzi nimi strih (`du/dz`, `dv/dz`),
2. turbulence-risk vrstva z gradientu stability a strihu,
3. prepojenie na THERMAL_BUBBLES, kde horizontalny drift berie WIND a verticalna
   zlozka ide z parceloveho modelu (dry/moist podla LCL).

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

## Windy Map API ready checklist (prakticky zapis)

Tento checklist je pre embed Windy mapy v testovacom okne (ikona `W`) a sluzi na rychlu diagnostiku,
aby sa nestracal cas hladanim, kde je problem.

### Povinne predpoklady

1. API kluc je typu **Map Forecast API** (`WINDY_MAP_KEY`).
2. V browseri sa nacitava **Leaflet 1.4.x** pred `libBoot.js`.
3. `windyInit(options, callback)` je pouzity s kontajnerom mapy.
4. V konfiguracii je `WINDY_MAP_KEY` nacitany z `asset/local-config.php`.
5. Referrer/domain whitelist vo Windy je nastaveny na **origin** (nie URL cestu).

### Domain whitelist pravidlo

- Zapisuj host/origin, nie path.
- Spravne: `https://xc.flyfree.cloud`
- Nespravne: `https://xc.flyfree.cloud/termika`
- Pri Codespaces sa casto vyzaduje presna subdomena (`*.app.github.dev` alebo konkretna URL).

### Runtime signaly v okne WINDY MAPA

- `Windy: pripojene` -> embed je aktivny, mapa je pripravena.
- `Windy: nacitavam` -> prebieha bootstrap, cakat kratko.
- `Windy: chyba` + timeout po 3 pokusoch -> typicky whitelist/referrer problem alebo blokovanie skriptu v browseri.

### Typicke chyby a vyznam

1. `windyInit nie je dostupny`:
   - najprv chyba poradia skriptov alebo chybajuci Leaflet,
   - alebo script load race condition.
2. `Windy embed neodpovedal do 8 sekund`:
   - kluc/referrer obmedzenie,
   - pripadne browser blokovanie (CSP/adblock/firewall).

### Minimalny test po zmene kluca

1. Ulozit konfiguraciu (`setup.php`).
2. Hard refresh (`Ctrl+Shift+R`).
3. Otvorit okno `W`.
4. Overit prechod stavu na `Windy: pripojene`.
5. Otestovat flow: picker rezim -> klik do mapy -> `Pouzit tento fokus`.

# WIND noty v1 (naviazanie na meteo-core)

## Co uz vieme pouzit z meteo-core

Meteo jadro uz poskytuje data a funkcie, ktore sa daju okamzite pouzit pre vietor:

- tlakova, teplotna a vlhkostna struktura TEMP profilu (`p_hpa`, `z_m`, `T_c`, `Td_c`),
- vietor po hladinach (`w_dir_deg`, `w_speed_kts`),
- LCL (`vypocitajLclDetail`, `vypocitajLclZProfily`),
- draha castice (`vypocitajDrahuCastice`),
- 3D drift komina (`vypocitaj3DDriftKomina`) s prepnutim KOMIN/BUBLINY.

## Co meteo-core zatial nedava priamo

- horizontalne pole vetra nad mapou (2D grid),
- mapu teploty povrchu,
- mapu podkladov (ladovec/sneh/voda/vegetacia),
- priame pole convergencie/divergencie v priestore.

Preto WIND v1 sklada pole z:

- vertikalneho TEMP profilu (smer + rychlost vo vyske),
- lokalnej mriezky analyzovanej oblasti,
- odhadu ochladzovacich zon (pracovne),
- vypoctu convergencie z pola u,v.

## Noty pre vietor (specifikacia)

### Nota 1 - vstupna hladina vetra

- cielova vyska: `targetAltMsl = surfaceAltM + aglM`,
- z TEMP profilu interpolovat `u_ms`, `v_ms`, `T_c`, `Td_c` na tejto vyske,
- ak profil chyba: fallback na `baseDirDeg`, `baseSpeedMs`.

### Nota 2 - prevod smeru vetra

- `w_dir_deg` je meteorologicky smer "odkial fuka",
- pre advekciu do mapy pouzit:
  - `u = -sin(dir) * speed`,
  - `v = -cos(dir) * speed`.

### Nota 3 - terenna korekcia (v1 pracovna)

- ochladzovacie zony menia:
  - `tempDeltaK`,
  - lokalny drift (`driftU`, `driftV`),
  - lokalnu istotu (`confidence`).

### Nota 4 - convergencia/divergencia

- z mriezky u,v pocitat divergence:
  - `div = du/dx + dv/dy`,
  - `convergence = -div`.

### Nota 5 - vizualna notacia

- prudnice idu po integrovanom poli,
- sipka na konci prudnice ukazuje smer toku,
- farba: podla `tempDeltaK`,
- hrubka: podla `speed_ms`.

### Nota 6 - diagnostika bunky

Minimalne polia pre klik:

- `speed_ms`, `dir_deg`, `u_ms`, `v_ms`,
- `temp_air_c`, `dewpoint_c`, `tempDeltaK`,
- `convergence`, `confidence`,
- `source`, `weatherTracking.mode`.

## Stav implementacie po tomto kroku

- WIND vie citat TEMP profil a vyhodnotit vietor pre hladinu AGL,
- WIND vie oznacit, ci bezal z TEMP alebo fallbacku,
- zatial je to jedna hladina (2D), nie plny 3D stack.

## Dalsie kroky (bez kolizie s Joyee)

1. Prepojit `surfaceAltM` na realnu vysku stredu analyzy z Cesium.
2. Rozsirit na 2-3 AGL hladiny (napr. 30 m, 150 m, 400 m).
3. Pridat shear notu medzi hladinami.
4. Napojit trigger pre buduce `THERMAL_BUBBLES`:
   - podmienka: kladna convergencia + vyrazny teplotny kontrast + priazniva vztlakova rezervna nota.

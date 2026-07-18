# TermikaXC v2.6 - realna obloha nad Cesium mapou: MVP postup

Vytvorene: 2026-07-18 04:14 UTC

## Ucel dokumentu

Tento postup definuje prvu implementacnu etapu nastroja realneho zobrazovania oblohy nad Cesium mapou v CC pracovisku TermikaXC.

Cielom nie je hned vytvorit plne meteorologicky dokonaly model oblakov. Cielom MVP je vytvorit stabilny samostatny nastroj, ktory vie:

- rucne zapnut a vypnut vizualnu oblohu cez quick dock,
- automaticky sa zapnut po nacitani `.igc`, ked sa zaroven pripoji TEMP profil cez existujuci `FlightTempLinker`,
- pouzit existujuce TEMP a vietorne data ako fyzikalny zaklad,
- pripravit rozhranie pre neskorsie vkladanie 3D objektov oblacnosti nad Cesium scenu,
- oddelit vlastnu fyzikalnu vizualizaciu TermikaXC od orientacnych vrstiev Windy Map Forecast API.

## Zakladne rozhodnutie

Prva verzia sa implementuje ako samostatny CC UX modul pre Cesium scenu, nie ako rozsirena cast WIND jadra.

Odporucany nazov modulu:

- skupina: `sky-weather`
- modul: `sky-visualizer`
- globalne API: `window.TermikaSkyVisualizer`

Modul ma byt vizualny a pracoviskovy nastroj. Nesmie preberat vlastnictvo nad TEMP, WIND ani IGC pipeline. Tieto data iba cita cez existujuce verejne rozhrania.

## Vztah k Windy

Windy sa pouzije dvomi odlisnymi sposobmi:

1. **Numericke data** - iba cez oficialne API a serverovy proxy, podobne ako dnes `windy-temp-proxy.php`.
2. **Orientacne mapove vrstvy** - cez existujuce Windy okno a Map Forecast API, nie ako primarna fyzikalna pravda v Cesiu.

Meteoradar, satelit a cloud/radar mapove vrstvy sa v MVP nemaju tahat cez nezdokumentovane URL ani priamo z klienta. Ak budu pouzite, musia ist cez oficialne API alebo oficialny Windy mapovy vizual podla licencie.

## Existujuce integracne body

Pouzit existujuce zapojenie:

- quick dock: `CC/ux/workbench-shell/quick-tool-dock/quick-tool-dock.view.php`,
- runtime udalosti: `CC/app/js/terrain-analysis-runtime.js`,
- IGC -> TEMP prepojenie: `CC/app/js/flight-temp-linker.js`,
- TEMP loader: `CC/app/js/wind-temp-loader.js`,
- Windy TEMP proxy: `CC/app/windy-temp-proxy.php`,
- Windy mapove okno: `CC/ux/windy-map/windy-map-window/windy-map-window.view.php`,
- Windy bridge/adaptér: `CC/infrastructure/windy-bridge-adapter/`.

## Navrhovane subory

Minimalna CC struktura:

```text
CC/ux/sky-weather/sky-visualizer/
  sky-visualizer.js
  sky-visualizer.css
  module.json
```

Host proxy pre app vrstvu:

```text
CC/app/js/sky-visualizer.js
```

Volitelne neskor:

```text
CC/services/weather-provider-service/windy-weather-proxy.php
CC/services/weather-provider-service/windy-weather-proxy.js
tools/SKY-VISUALIZER.md
```

## Verejne API modulu

Prva verzia ma poskytovat male a stabilne API:

```js
window.TermikaSkyVisualizer = {
  VERSION: '0.1.0',
  enable(viewer, options),
  disable(viewer),
  toggle(viewer, options),
  refresh(viewer, options),
  isEnabled(),
  getState()
};
```

`options` moze obsahovat:

```js
{
  route: points,
  center: { lat, lon },
  flightDate: '2026-07-18',
  source: 'manual' | 'igc-temp' | 'windy-map',
  profiles: FlightTempLinker.getActiveProfiles()
}
```

## Fyzikalny zaklad MVP

MVP nesmie hadat meteorologicke hodnoty bez oznacenia povodu. Pouzivat sa maju len tieto zdroje:

1. `FlightTempLinker.getActiveProfiles()` - aktivne TEMP profily pripojene k letu.
2. `FlightTempLinker.interpolateAt(lat, lon)` - priestorovo interpolovany TEMP profil pre konkretny bod trate.
3. `WindTempLoader.loadProfile()` - iba ako explicitny fallback alebo rucny zdroj.
4. `WindUI.state.lastField` / `WindRender` - iba ak uz existuje aktualna WIND generacia.

Zakladne odvodene hodnoty pre oblohu:

- vyska zakladne oblakov z LCL alebo dostupneho meteo jadra,
- vlhkostna blizkost vrstvy: rozdiel `T_c - Td_c`,
- smer a rychlost vetra v hladine zakladne,
- hruba stabilita vrstiev pod a nad zakladnou,
- priznak neistoty, ak TEMP profil nezodpoveda datumu letu (`isMismatched`).

## Vizualny rozsah prvej verzie

Prva verzia ma zobrazit:

- jemne zmeneny stav Cesium oblohy a hmly podla vlhkosti/stability,
- transparentnu hladinu alebo pasmo predpokladanej zakladne oblakov,
- jednoduche 3D markery oblacnosti nad vybranymi bodmi trate alebo nad aktivnym fokusom,
- orientaciu oblacnych pasov podla vetra v hladine zakladne,
- stavovy priznak, ak su data len orientacne alebo casovo nezhodne.

Nemusi este zobrazovat fotorealisticke oblaky. Dolezitejsie je spravne rozhranie, zdroj dat a moznost vypnut vrstvu bez zvyskov v Cesium scene.

## 3D objekty oblacnosti

Pre pripravovane 3D objekty oblacnosti treba modul navrhnut tak, aby podporoval vymenitelny renderer.

Prva implementacia moze pouzit Cesium entity alebo primitive:

- `viewer.entities.add()` pre jednoduche billboardy/modely,
- `Cesium.ModelGraphics` alebo `model.uri` pre `.glb` oblaky,
- samostatnu kolekciu entit s prefixom `sky-visualizer-*`,
- centralny cleanup pri `disable()`.

Neskor sa moze doplnit:

- katalog 3D oblakov,
- instancing viacerych objektov,
- LOD podla vzdialenosti kamery,
- animacia driftu podla vetra,
- prepinanie typov oblakov podla stability a vlhkosti.

## Quick dock ovladanie

Do quick docku pridat jedno tlacidlo:

```html
<button type="button" id="quickSkyToggleButton" title="Reálna obloha">☁</button>
```

Ak sa bude dodrziavat ASCII v ikonach, moze sa docasne pouzit text `S` alebo `CL` a ikona sa vymeni neskor.

Spravanie:

- klik zapne/vypne `TermikaSkyVisualizer.toggle(viewer, ...)`,
- aktivny stav sa oznaci triedou `.is-active`,
- pri chybe sa vypise `logStatus(...)`,
- vypnutie musi odstranit vsetky entity/primitives vytvorene modulom.

## Automaticke zapnutie po IGC

V existujucom IGC handleri v `terrain-analysis-runtime.js` uz prebieha:

1. nacitanie `.igc`,
2. parsovanie bodov,
3. vykreslenie trate cez `CesiumRender.pripravCelyLet(...)`,
4. volanie `FlightTempLinker.handleIgcLoaded(...)`.

Po uspesnom dokonceni `FlightTempLinker.handleIgcLoaded(...)` sa ma zavolat:

```js
window.TermikaSkyVisualizer?.enable?.(viewer, {
  route: points,
  flightDate: parsedShared?.flightDate || null,
  source: 'igc-temp'
});
```

Ak TEMP link zlyha, obloha sa nema ticho tvarit ako realna. Mozne su dve spravania:

- nezapnut ju vobec,
- alebo zapnut iba vizualny rezim s jasnym statusom `orientacne / bez TEMP`.

Pre letove rozhodovanie je bezpecnejsie prve spravanie.

## Stavovy model

Modul ma drzat vlastny stav:

```js
{
  enabled: false,
  source: 'manual',
  entities: [],
  primitives: [],
  lastProfiles: [],
  lastRouteSummary: null,
  lastGeneratedAtIso: null,
  confidence: 'unknown'
}
```

`confidence` odporucane hodnoty:

- `high` - TEMP sedi datumom aj vzdialenostou,
- `medium` - TEMP je priestorovo pouzitelny, ale nie idealny,
- `low` - pouzity fallback alebo casovo nezhodny profil,
- `unknown` - bez meteo dat.

## Akceptacne kriterium MVP

MVP je hotove, ak plati:

1. Quick dock tlacidlo vie oblohu zapnut aj vypnut bez reloadu.
2. Vypnutie odstrani vsetky entity/primitives vytvorene modulom.
3. Po nacitani `.igc` a uspesnom pripojeni TEMP sa obloha zapne automaticky.
4. Obloha pouziva `FlightTempLinker` alebo `WindTempLoader`, nie vymyslene konstanty bez oznacenia.
5. Ak je TEMP casovo nezhodny, UI alebo debug log to jasne oznami.
6. Windy radar/cloud vrstvy ostavaju v MVP orientacne cez Windy mapove okno.
7. Cesium ovladanie, HUD, quick dock a IGC playback ostanu funkcne.

## Poradie implementacie

1. Vytvorit `sky-visualizer` modul s `enable/disable/toggle` a cleanupom.
2. Pridat host proxy `CC/app/js/sky-visualizer.js` a nacitat ho pred `terrain-analysis-runtime.js`.
3. Pridat quick dock tlacidlo a handler v runtime.
4. Vykreslit prvu jednoduchu vrstvu: zakladna oblakov + par transparentnych 3D markerov.
5. Napojit automaticke zapnutie po uspesnom `FlightTempLinker.handleIgcLoaded(...)`.
6. Doplnit status/confidence do debug logu.
7. Overit manual toggle, IGC auto flow a cleanup po vypnuti.
8. Az potom riesit 3D katalog oblakov, drift a pripadne serverove cloud/radar data.

## Otvorene rozhodnutia

- Presny format 3D objektov oblacnosti (`.glb`, billboard, volumetricky shader, kombinacia).
- Ci budu oblaky viazane na celu trasu, aktualnu polohu pilota alebo analyzovany fokus.
- Ci sa bude obloha animovat pocas playbacku, alebo iba regenerovat pri zmene casu/bodu.
- Ktore cloud/radar parametre su realne dostupne cez aktualny Windy plan a licenciu.
- Ako oddelit treningovu vizualizaciu od letovo rozhodovacej vrstvy, aby sa neprezentovala neista predpoved ako fakt.

## Bezpecnostna zasada

Obloha je v MVP rozhodovacia pomocka, nie certifikovany meteorologicky pristroj. Kazda vrstva musi vediet ukazat povod dat a mieru istoty. Ak povod alebo casova zhoda dat nie je jasna, vrstva sa musi oznacit ako orientacna.
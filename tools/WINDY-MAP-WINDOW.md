# Okno „Windy mapa“ (plávajúci nástroj)

## 1. Účel

Plávajúce okno **Windy mapa** vkladá do TermikaXC živý embed Windy Map Forecast API, aby pilot mohol:

- nájsť orientačnú meteo/mapovú situáciu na Windy mape, na ktorú je zvyknutý,
- vybrať konkrétny bod (lat/lon/zoom) priamo klikom do Windy mapy,
- jedným tlačidlom preniesť tento bod ako fokus do hlavnej Cesium mapy TermikaXC a spustiť tam analýzu/TEMP.

Okno je doplnkový orientačný nástroj, nie náhrada hlavnej 3D mapy.

## 2. Identita a stav

| Položka | Hodnota |
|---|---|
| ID nástroja | `windy-map-window` |
| Názov | Okno Windy mapa |
| Stav | Implementované a funkčné (overené 16.7.2026) |
| Implementácia | `XC/terrain-analysis-test.php` (sekcia `#windyMapWindow` + súvisiaci JS blok) |
| Závislosti | `WINDY_MAP_KEY` (Windy Map Forecast API, viazaný na doménu), `Leaflet 1.4.x`, `libBoot.js` |
| Súvisiaci dokument | [tools/WINDY.md](WINDY.md) – produktový návrh a fázy rozšírenia integrácie |

## 3. Otvorenie okna

Okno je plávajúce (`floating-window`), skryté (`hidden`) do prvého otvorenia z navigácie. Pri prvom zobrazení (zrušenie `hidden` atribútu, sledované cez `MutationObserver`) sa automaticky:

1. spustí načítanie `libBoot.js` (ak ešte nie je načítaný),
2. zavolá `initWindyMap()`, ktorý inicializuje Windy embed cez `windyInit(...)`,
3. zobrazí panel „WINDY MAPA – STAV PRIPOJENIA“ s priebežnou diagnostikou.

## 4. Prvky hlavičky okna

| Prvok | Funkcia |
|---|---|
| Odznak stavu pripojenia (vľavo od tlačidiel) | Zobrazuje aktuálny stav: `Windy: pripojené` / `Windy: načítavam` / `Windy: offline` / `Windy: chýba kľúč` / `Windy: chyba`. Farba odznaku sa mení podľa stavu (zelená = ready, modrá = loading, červená = chyba/missing_key). Tooltip odznaku (`title`) obsahuje doplnkový popis stavu. |
| Ikona `⌖` / `✦` (prepínač režimu výberu fokusu) | Prepína **režim výberu fokusu z mapy** – pozri sekciu 6. |
| Tlačidlo `×` | Zatvorí plávajúce okno (bežné správanie `floating-window`). |

## 5. Panel „WINDY MAPA – STAV PRIPOJENIA“

Polopriehľadný panel prekrývajúci mapu (`#windyMapLoadingPanel`), zobrazuje priebežné hlásenia počas pripájania a zmizne, keď je mapa pripravená (`clearWindyMapLoadingMessage()`).



Typické hlásenia:

- `Čakám na otvorenie okna Windy...` – počiatočný text pred prvým otvorením.
- `Načítavam Windy knižnicu libBoot.js...` – prebieha načítanie externého skriptu `https://api.windy.com/assets/map-forecast/libBoot.js`.
- `Knižnica pripravená. Pripájam Windy mapu... Pokus X z 3.` – prebieha `windyInit()`, počíta sa max. 3 pokusy (`WINDY_MAP_INIT_MAX_ATTEMPTS`).
- `Chyba: chýba WINDY_MAP_KEY v konfigurácii...` – `WINDY_MAP_KEY` nie je nastavený v `setup.php`.
- `Chyba: Windy embed neodpovedal do 8 sekúnd...` – timeout inicializácie (`windyMapInitFailTimer`, 8000 ms).
- `Windy API vrátilo 403 (unauthorized domain)...` – Windy odmietol doménu; hlásenie obsahuje **presný aktuálny origin**, **maskovaný fingerprint aktívneho `WINDY_MAP_KEY`** (prvých 6 + posledné 4 znaky) a odporúčanie opraviť whitelist.

Panel po úspešnom pripojení zmizne a stavový odznak prejde na `Windy: pripojené`.

## 6. Diagnostická logika (JS)

Kľúčové funkcie v `terrain-analysis-test.php`:

- `formatWindyMapKeyFingerprint(rawKey)` – maskuje kľúč na bezpečné zobrazenie (`GHd9jf...Fucz`), aby sa v UI/logoch nikdy nezobrazoval celý tajný reťazec.
- `readWindyUnauthorizedMessage()` – skenuje textový obsah kontajnera `#windy` a regexom (`cannot use windy api|unauthorized domain|statuscode\s*[:=]\s*403|forbidden`) rozpozná, či Windy vrátil chybu neautorizovanej domény priamo do DOM (namiesto tichého zlyhania).
- `isWindyMapDomReady()` – overuje prítomnosť reálnych Windy/Leaflet prvkov (`.leaflet-container`, `.leaflet-pane`, `canvas`, `.windy-logo`, `#logo-wrapper`) v DOM ako náhradný signál pripravenosti, ak samotný `windyInit` callback ešte neprišiel.
- `markWindyReadyFromDom()` – najprv skontroluje `readWindyUnauthorizedMessage()` (403 má prednosť pred akýmkoľvek iným stavom), inak overí `isWindyMapDomReady()` a podľa toho nastaví stav `ready`/`error`.
- `ensureWindyLibBootLoaded()` – zabezpečí jednorazové načítanie `libBoot.js`, s cache-buster retry a 4.5 s timeoutom pre prípad adblocku/CSP blokovania skriptu.
- `scheduleWindyMapInitRetry()` – interval (500 ms) opakovane skúšajúci `initWindyMap()` do max. 3 pokusov, ak mapa ešte nie je pripravená a nejde o trvalú 403 chybu.
- `initWindyMap()` – hlavná inicializačná funkcia: kontroluje limit pokusov, prítomnosť `WINDY_MAP_KEY`, dostupnosť `windyInit`, volá `windyInit({ key, lat, lon, zoom }, callback)` so stredom podľa aktuálne vybraného bodu TermikaXC (`selectedCenter`, fallback `{ lat: 46.43, lon: 11.85 }`).
- `refreshWindyMapSize()` – po pripojení/zmene veľkosti okna zavolá `invalidateSize()` + `redraw()` na Leaflet mape (Windy embed sa inak môže zobraziť orezaný).

## 7. Režim výberu fokusu (`⌖` / `✦`)

Ovláda ho `setWindyMapFocusPickerEnabled(enabled)`, prepínané tlačidlom `windyFocusPickerToggleButton` v hlavičke okna.

**Vypnutý stav (predvolený, ikona `⌖`):**

- kurzor nad mapou je normálny,
- label pod mapou (`windyMapFocusLabel`) priebežne ukazuje **stred aktuálnej Windy mapy** (lat/lon zaokrúhlené na 5 desatinných miest + zoom) pri každom posune mapy (`api.map.on('move', ...)`),
- klik do mapy sa ignoruje (picker neaktívny).

**Zapnutý stav (klik na ikonu, zmení sa na `✦`, modrá farba):**

- kurzor nad mapou sa zmení na `crosshair`,
- ďalší klik do mapy zachytí **presné súradnice kliknutého bodu** (nie stred mapy) cez `api.map.on('click', ...)` a uloží ich do `windyMapPickedFocus = { lat, lon, zoom }`,
- na kliknuté miesto sa priamo na Windy mape vloží **viditeľný Leaflet marker/pin** (`setWindyMapFocusMarker(api, lat, lon)`) – bez neho by klik pôsobil, akoby sa nič nedialo, keďže jediná pôvodná spätná väzba bol malý text pod mapou,
- pri ďalšom kliku sa predchádzajúci marker odstráni (`api.map.removeLayer(...)`) a nahradí novým,
- label sa zmení na `Vybraný fokus: <lat, lon> (zoom Z)`,
- kým je vybraný fokus nastavený, posun mapy label už neprepisuje (zostáva zobrazený vybraný bod, nie stred mapy).

Picker sa automaticky vypne (`setWindyMapFocusPickerEnabled(false)`) vždy po úspešnom (opätovnom) pripojení mapy a po použití tlačidla „Použiť tento fokus“. Marker na Windy mape sa odstráni (`clearWindyMapFocusMarker()`) až po úspešnom prenose fokusu tlačidlom „Použiť tento fokus“ – dovtedy ostáva viditeľný aj pri prepínaní medzi režimami.

## 8. Tlačidlo „Použiť tento fokus ↗“

Handler `windyUseFocusButton`:

1. Ak mapa ešte nie je pripojená (`windyAPI` chýba), zobrazí chybové hlásenie a nič nerobí.
2. Zoberie buď `windyMapPickedFocus` (ak bol vybraný cez picker), alebo aktuálny stred Windy mapy (`windyAPI.map.getCenter()`).
3. Zaokrúhli lat/lon na 5 desatinných miest.
4. Nastaví tento bod ako `selectedCenter`/`previewCenter` TermikaXC, presunie značku (`selectedPoint.position`), zosynchronizuje UI (`syncCenterUi`) a nastaví TEMP fokus bod (`setTempFocusPoint`).
5. Preletí kamerou Cesium na daný bod (`viewer.camera.flyTo`), s výškou dopočítanou zo zoomu (`zoomToAltitudeM(zoom)` – orientačný prevod Leaflet zoom → výška kamery v metroch, min. 500 m).
6. Spustí načítanie TEMP dát pre nový bod (`loadTempOnPointClick(point)`).
7. Vypne picker, odstráni marker z Windy mapy (`clearWindyMapFocusMarker()`) a odošle udalosť cez `TermikaCommunicationTool.send('windy-focus', {...})` (nekritické – zlyhanie sa ignoruje), aby sa o novom fokuse mohli dozvedieť aj iné napojené nástroje/adaptéry.

## 9. Konfigurácia a typické chyby

Kľúč `WINDY_MAP_KEY` sa nastavuje cez `setup.php` a číta z `XC/asset/local-config.php` (mimo git repozitára – pozri `.gitignore`).

**Dôležité (overené 16.7.2026):** Windy Map Forecast API whitelist domén sa zapisuje ako **holý hostname bez `https://` a bez cesty** (napr. `xc.flyfree.cloud`), nie ako plný origin s protokolom. Detailné pravidlo a história overenia sú v [postupy/WIND.md – sekcia „Domain whitelist pravidlo“](../postupy/WIND.md#domain-whitelist-pravidlo).

| Príznak | Typická príčina |
|---|---|
| `Windy: chýba kľúč` | `WINDY_MAP_KEY` nie je vyplnený v `setup.php`. |
| `Windy: chyba` + hlásenie o 403 unauthorized domain | Aktuálny origin appky nie je vo whiste kľúča (alebo je zapísaný s `https://` namiesto holého hostname). |
| `Windy embed neodpovedal do 8 sekúnd` | Sieťový/CDN problém, blokovanie skriptu (adblock/CSP), alebo kľúč/whitelist problém, ktorý sa neprejavil textom v DOM. |
| `Windy libBoot.js sa nepodarilo načítať` | Skript zablokovaný prehliadačom/rozšírením, alebo výpadok `api.windy.com`. |

## 10. Vzťah k inému dokumentu

[tools/WINDY.md](WINDY.md) opisuje **produktový zámer a plánované fázy** rozšírenia Windy integrácie (dátový kontrakt, komunikačné kanály, budúce `TermikaToolCore`). Tento dokument (`WINDY-MAP-WINDOW.md`) opisuje **aktuálne implementované správanie konkrétneho okna** tak, ako reálne funguje v `terrain-analysis-test.php`.

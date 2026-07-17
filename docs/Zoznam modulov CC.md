# Zoznam modulov CC

**Stav:** PRACOVNÁ FUNKČNÁ INVENTÚRA – nepoužívať ako príkaz na migráciu  
**Dátum inventúry:** 17. júl 2026  
**Skúmaná vetva:** `main`  
**Skúmaný commit:** `b2b32855701c2c17f1316e3276b0adc4fcaf3461`

## Evidencia migrácie

> Rozhodnutím používateľa zo 17. júla 2026 možno identifikované moduly preniesť do CC aj pred funkčným overením v XC. Pôvod a skutočný stav overenia sa musia naďalej evidovať; prenos nesmie byť vydávaný za potvrdenie funkčnosti.

Tento zoznam vznikol priamym prechodom zdrojových stránok, inline skriptov, samostatných JavaScriptov, CSS a serverových koncových bodov. Kandidátom nie je automaticky každý `.js` súbor. Kandidát musí predstavovať používateľsky alebo prevádzkovo rozpoznateľnú funkciu, ktorú možno oddeliť jasným kontraktom.

Stav `NEOVERENÉ` znamená, že existencia a zapojenie boli nájdené v kóde, ale modul ešte neprešiel samostatným funkčným a regresným testom potrebným pre migráciu.

## Výsledok hromadnej triáže

Pôvodných 69 evidovaných položiek nie je 69 samostatných modulov. Po funkčnom zoskupení vzniká tento pracovný katalóg. Toto je rozhodujúca vrstva pre ďalší postup; podrobná inventúra nižšie zostáva dôkazovým rozpisom zdrojov.

### Funkčné skupiny používateľských modulov CC

| # | Cieľová skupina | Obsahuje alebo zastrešuje dnešné samostatné moduly | Migračná vlna |
|---:|---|---|---:|
| 1 | `system-status-bar` | `release-footer`, `release-badge`; budúce segmenty zariadenia, siete a externých zdrojov | 1 |
| 2 | `window-core` | `window-manager` a spoločné správanie presunu, resize, fokusu, z-indexu, skrytia a obnovy okien | 1 |
| 3 | `workbench-shell` | `workspace-theme`, `workspace-navigation`, `quick-tool-dock`, `window-launcher-dock`, `cesium-toolbar-offset`, `setup-launcher` | 1 |
| 4 | `map-pointer-tools` | `workspace-crosshair`, `cursor-coordinate-badge` | 1 |
| 5 | `camera-hud` | `terrain-camera-hud`, `camera-hud-coordinates`, `camera-hud-toggle` | 1 |
| 6 | `cesium-basemap-control` | `cesium-basemap-toggle` | 1 |
| 7 | `diagnostics-console` | obe dnešné implementácie `debug-console` | 1 |
| 8 | `terrain-legend` | `terrain-legend` | 1 |
| 9 | `route-planner` | `route-task-planner` | 2 |
| 10 | `route-import` | `explorer-route-import` | 2 |
| 11 | `terrain-profile` | `terrain-profile`, `terrain-profile-dock`, `terrain-profile-follow` | 2 |
| 12 | `explorer-analysis-transfer` | `explorer-analysis-bridge`, `explorer-analysis-arrival` | 2 |
| 13 | `flight-data-loader` | `igc-temp-loader` pre IGC časť; TEMP vstup odovzdáva modulu TEMP | 2 |
| 14 | `flight-playback` | `flight-playback`, používateľské ovládanie `flight-track-renderer` a časová os | 2 |
| 15 | `camera-mode-controller` | `camera-mode-controller` | 2 |
| 16 | `pilot-physiology-panel` | `pilot-physiology-panel` | 2 |
| 17 | `flight-meteo-panel` | `flight-meteo-panel` | 2 |
| 18 | `skewt-instrument` | `skewt-panel` | 2 |
| 19 | `flight-simulator` | `flight-simulator`, `flight-simulator-toggle`, `flight-emergency-disengage` | 3 |
| 20 | `terrain-source-manager` | `source-manager` | 3 |
| 21 | `temp-source-manager` | `temp-source-selector`, `wind-temp-loader`, používateľská časť `temp-record-cleanup` | 3 |
| 22 | `analysis-focus-control` | `analysis-focus-controls`, `analysis-focus-summary` | 3 |
| 23 | `analysis-layer-control` | `analysis-layer-toggle`, používateľské prepínače `terrain-mesh-controls` | 3 |
| 24 | `cell-diagnostics` | `cell-diagnostics`, `terrain-hover-tooltip`, prezentačná časť `terrain-morphology-diagnostics` | 3 |
| 25 | `wind-workbench` | `wind-control-panel`, `wind-fps-indicator` | 3 |
| 26 | `windy-map` | `windy-map-window`, `windy-adapter-monitor`; používa bridge a adaptér ako vnútorné služby | 3 |
| 27 | `temp-profile-workbench` | `temp-profile-workbench` | 3 |
| 28 | `screen-recorder` | `screen-recorder` | 3 |
| 29 | `generation-manager` | `generation-manager` pre WIND/MAP/TEMP prevádzkové záznamy | 3 |
| 30 | `wind-video` | `wind-webm-export`, `wind-cache-preview` | 3 |
| 31 | `terrain-visualization-layers` | spoločný hostiteľ pre `terrain-contours-layer`, `terrain-design-layer`, `terrain-mesh-wireframe`, `terrain-mesh-surface`; jednotlivé renderery zostávajú zásuvnými vrstvami | 4 |

Výsledok: **31 funkčných skupín**. Identifikované nástroje, prístroje, adaptéry, okná a pomocné prvky v nich zostávajú samostatnými modulmi s vlastnými súbormi; skupina nie je povolením na ich zlúčenie.

Záväzná adresárová a súborová zásada je zapísaná v `postupy/2026-07-17_06-06_CC-modularna-struktura-a-kontrola-postupov.md`.

### Infraštruktúrne a servisné moduly CC

Tieto položky sa pripravujú raz ako spoločná infraštruktúra. Netestujú sa ako samostatné používateľské okná.

| Modul | Zlučuje alebo nahrádza |
|---|---|
| `module-loader` | `style-loader` a budúce načítanie JS/CSS/manifestov |
| `communication-bus` | `tool-communication` |
| `release-version-service` | `release-version-service`; jediný zdroj `XC/asset/RELEASE_VERSION.txt` počas overovania v XC |
| `windy-bridge-adapter` | `windy-map-bridge`, `windy-map-adapter` ako vnútorné služby modulu `windy-map` |
| `temp-provider-service` | servisná časť `wind-temp-loader`, `windy-temp-proxy` |
| `generation-storage-service` | `genauto-service` |
| `local-config-service` | `local-config-setup` |
| `runtime-data-service` | `runtime-data-update` |

### Nemigrovať ako UX modul

Tieto položky zostávajú analytickým alebo fyzikálnym jadrom. UX moduly ich smú používať iba cez kontrakt:

- `terrain-analysis.js`,
- `terrain-analysis-core.js`,
- `terrain-analysis-geometry.js`,
- výpočtová časť `terrain-analysis-diagnostics.js`,
- `terrain-morphology.js`,
- výpočtová topológia `terrain-mesh.js`,
- `wind-field.js`,
- `wind-effects-core.js`,
- `wind-effect-terrain.js`,
- `wind-effect-surface.js` po oddelení dnes primiešaného UI bootstrapu,
- `meteo-core.js`,
- `glider-core.js`.

### Pravidlo tempa

Ladenie sa nerobí po každom riadku pôvodnej inventúry. Robí sa po celom cieľovom module a jeho hostiteľskom pracovisku. Podradené prvky zdedia stav svojho cieľového modulu. Hĺbková analýza sa otvorí iba pri chybe alebo nejasnom kontrakte.

## A. Spoločné pracoviskové a systémové moduly

| ID kandidáta | Pracovný názov | Typ | Skutočný účel | Dôkaz v kóde | Hlavné závislosti | Univerzálnosť | Stav XC |
|---|---|---|---|---|---|---|---|
| `window-manager` | Správca pracovných okien | system | Presun, resize, z-index, skrytie, obnova polohy a reset panelov. | `XC/js/workspace-ui.js`, `window.WorkspacePanels`; `#leftPanel`, `#rightPanel`, `#debugConsole` | DOM okien, `localStorage` | vysoká | NEOVERENÉ |
| `style-loader` | Idempotentný loader štýlov | system | Načíta rodinný alebo oknový CSS asset iba raz a eviduje stav načítania. | `XC/js/termika-style-loader.js`, `window.TermikaStyleLoader` | `<head>`, CSS manifest/URL | vysoká | NEOVERENÉ |
| `tool-communication` | Komunikačná zbernica nástrojov | adapter | Registry adaptérov, udalosti, validácia kanálov, request/response a lokálna komunikácia nástrojov. | `XC/js/tool-communication.js`, `window.TermikaCommunicationTool` | udalosti prehliadača | vysoká | NEOVERENÉ |
| `workspace-theme` | Prepínač témy pracoviska | component | Prepína svetlú/tmavú tému a uchováva voľbu. Existujú najmenej dve implementácie, ktoré treba neskôr porovnať podľa kontraktu. | `XC/js/explorer-theme.js`; inline `#navThemeToggleButton` v `XC/terrain-analysis-test.php` | dátové atribúty `body`, `localStorage`, dizajnové tokeny | vysoká | NEOVERENÉ |
| `workspace-navigation` | Dokovateľná navigácia pracoviska | component | Sekcie pracoviska, vysúvací obsah, zatvorenie a zmena polohy navigácie. | `XC/js/explorer-nav.js`, `#explorerNavShell`; inline `#navShell`, `#navDrawer`, `#navDockMode` v `XC/terrain-analysis-test.php` | hostiteľské sekcie, téma | vysoká | NEOVERENÉ |
| `quick-tool-dock` | Rýchly dock nástrojov | component | Jednoklikový prístup k zdrojom, analýze, mazaniu, režimu kurzora a oknám. | `XC/terrain-analysis-test.php`, `#quickToolDock`, `data-show-window` | hostiteľské akcie a okná | vysoká | NEOVERENÉ |
| `workspace-crosshair` | Režim zameriavacieho kurzora | tool | Prepína mapový kurzor a zjednocuje pracoviskové pomenovanie ovládania. | `XC/js/workspace-crosshair.js`; `#quickCursorModeButton`; `body.map-crosshair-mode` | mapový kontajner | vysoká | NEOVERENÉ |
| `cursor-coordinate-badge` | Súradnicový odznak kurzora | instrument | Zobrazuje súradnice polohy pod kurzorom v pracovisku. | `XC/terrain-analysis-test.php`, `#cursorCoordsBadge` a jeho inline obsluha | Cesium viewer, pohyb kurzora | vysoká | NEOVERENÉ |
| `cesium-toolbar-offset` | Automatický odstup Cesium toolbaru | utility | Posúva natívny toolbar tak, aby ho neprekrývala navigácia v rôznych dock režimoch. | `XC/js/workspace-cesium-toolbar-offset.js`, `XC/asset/workspace-cesium-toolbar-offset.css` | Cesium DOM, `#navShell` | stredná | NEOVERENÉ |
| `release-badge` | Odznak release verzie | system | Načíta, validuje a zobrazí release verziu v hlavičke panela. | `XC/js/terrain-release-badge.js`, `XC/release-version.php` | cieľová hlavička, release endpoint | vysoká | NEOVERENÉ |
| `release-footer` | Copyright a release pätička | system | Zobrazuje vlastníka, aktuálny rok a nasadenú verziu v stále viditeľnej pätičke. | `XC/terrain-analysis-test.php`: `$currentYear`, `$releaseVersion`, `#appFooter`, `© PIAR Team`; pôvodná produkčná funkcia potvrdená 17. 7. 2026, po zjednotení zdroja na `XC/asset/RELEASE_VERSION.txt` čaká na opakovaný produkčný test | release súbor, PHP render, CSS | vysoká | DEBUGGING_XC |
| `test-page-link` | Rýchly vstup na testovaciu stránku | component | Dynamicky pridá do toolbaru odkaz na terénne testovacie pracovisko. | `XC/js/terrain-test-link.js`, `#openTerrainTestButton` | `.map-actions-primary` | stredná | NEOVERENÉ |
| `setup-launcher` | Otvorenie konfigurácie | component | Otvorí samostatné nastavenie zdrojov a API konfigurácie. | `XC/terrain-analysis-test.php`, `#openSetupButton`; `XC/setup.php` | popup/nové okno, serverová konfigurácia | stredná | NEOVERENÉ |

### Plánované rozšírenie `release-footer`

Poznámka používateľa z 17. 7. 2026:

`release-footer` nemá zostať iba formálnou copyright pätičkou. Má sa postupne rozšíriť na systémovú informačnú a stavovú lištu pracoviska. Okrem vlastníka, roku a verzie má byť pripravená niesť najmä:

- technické informácie zariadenia,
- informácie o sieťovom pripojení, napríklad IP a podľa možností konkrétneho runtime aj MAC,
- stav a technické informácie pripojených externých modulov,
- stav Cesium,
- stav Windy,
- informácie o pripojených meteorologických staniciach,
- informácie o použitých satelitných alebo ďalších dátových zdrojoch,
- ďalšie prevádzkové údaje, ktoré budú dôležité pre kontrolu pracoviska.

Rozšírenie sa má robiť po samostatných stavových segmentoch a adaptéroch. Výpadok jedného externého zdroja nesmie znefunkčniť ostatné časti lišty. Každý dynamický údaj má niesť aj stav dostupnosti a čas poslednej aktualizácie.

## B. Mapa, kamera a letové pracovisko

| ID kandidáta | Pracovný názov | Typ | Skutočný účel | Dôkaz v kóde | Hlavné závislosti | Univerzálnosť | Stav XC |
|---|---|---|---|---|---|---|---|
| `terrain-camera-hud` | Kamerový HUD | HUD | Zobrazuje azimut, vertikálny uhol, roll, výšku kamery a dostupný AGL bez zásahu do analýzy. | `XC/js/terrain-camera-hud.js`, `window.TerrainCameraHUD` | Cesium viewer, terén | vysoká | NEOVERENÉ |
| `camera-hud-coordinates` | Súradnice v kamerovom HUD | instrument | Rozširuje HUD o súradnice polohy kamery/fokusu a udržiava ich aktuálne. | `XC/js/terrain-camera-hud-coordinates.js`, `window.TerrainCameraHUDCoordinates` | `TerrainCameraHUD` alebo Cesium viewer | vysoká | NEOVERENÉ |
| `camera-hud-toggle` | Prepínač kamerového HUD | component | Lazy-load, zobrazenie/skrytie HUD a uchovanie používateľskej voľby. | `XC/js/workspace-hud-toggle.js` | `terrain-camera-hud.js`, `localStorage` | vysoká | NEOVERENÉ |
| `cesium-basemap-toggle` | Viditeľnosť obrazovej podkladovej mapy | tool | Skryje alebo obnoví obrazovú vrstvu bez vypnutia 3D reliéfu. | `XC/js/terrain-basemap-visibility.js`, `window.TerrainBasemapVisibility` | Cesium globe/imagery | vysoká | NEOVERENÉ |
| `camera-mode-controller` | Režimy kamery letu | instrument | Prepína voľnú kameru, celý let, sledovanie pilota a pohľad pilota. | `XC/index.php`, `.camera-mode-button[data-camera-mode]`; obsluha v inline JS a `XC/js/pilot-network.js` | Cesium viewer, letová stopa | vysoká | NEOVERENÉ |
| `flight-simulator` | Simulátor letu | instrument | Riadi fyzikálny stav simulovaného letu, vstupy a publikuje stav letu. | `XC/js/flight-simulator.js`, `window.TermikaFlightSimulator` | Cesium, glider/terénne dáta, komunikačné udalosti | stredná | NEOVERENÉ |
| `flight-simulator-toggle` | Ovládanie simulátora | component | Pripája tlačidlo zapnutia/vypnutia simulátora a stavové správanie pracoviska. | `XC/js/workspace-flight-toggle.js` | `TermikaFlightSimulator` | vysoká | NEOVERENÉ |
| `flight-emergency-disengage` | Núdzové odpojenie riadenia | safety tool | Zachytí núdzový vstup a bezpečne odpojí simulátor/riadenie. | `XC/js/flight-emergency-disengage.js`, `window.TermikaFlightEmergencyDisengage` | `TermikaFlightSimulator`, udalosti vstupu | vysoká | NEOVERENÉ |
| `flight-track-renderer` | Renderer letovej stopy | visualization | Vykresľuje letovú stopu, prehrané úseky, pilota, štart, cieľ a súvisiace entity v Cesiu. | `XC/js/cesium-render.js`, `window.CesiumRender` | Cesium, dáta IGC | stredná | NEOVERENÉ |
| `flight-playback` | Prehrávač letu a časová os | instrument | Načítanie IGC, play/pause/stop, posun po časovej osi, synchronizácia pilotných a meteo údajov. | `XC/js/pilot-network.js`, `#flightControls`, `#flightTimeline`, `#playPauseButton` | IGC, CesiumRender, MeteoCore, DOM panelov | stredná | NEOVERENÉ |
| `igc-temp-loader` | Načítanie IGC a TEMP | tool | Výber lokálnych súborov a URL zdroja, načítanie a odovzdanie dát pracovnému toku. | `XC/index.php`: `#igcFileInput`, `#tempFileInput`, `#igcTempSourceSelect`, `#loadIgcButton`, `#loadTempButton`; `XC/js/pilot-network.js` | File API, fetch, parsery | vysoká | NEOVERENÉ |
| `pilot-physiology-panel` | Panel fyziológie pilota | instrument | Zobrazuje identitu pilota, tep, SpO₂, stav tela a živý graf. | `XC/index.php`, `#leftPanel`, `#liveBioChart`, `#pHr`, `#pSpo2` | Chart.js, telemetrické/IGC dáta | vysoká | NEOVERENÉ |
| `flight-meteo-panel` | Panel meteo a 3D geometrie | instrument | Zobrazuje vario, výšky, AGL, polohu, LCL, stav priestoru a zdrojové údaje. | `XC/index.php`, `#rightPanel`, `#pVario`, `#pAlt`, `#pAgl`, `#pLcl` | PilotNetwork, MeteoCore, Cesium | vysoká | NEOVERENÉ |
| `debug-console` | Systémový monitor a debugger | window | Zobrazenie, skrývanie a čistenie prevádzkového logu. Existuje na hlavnej aj testovacej stránke. | `XC/index.php`: `#debugConsole`, `#debugLog`; `XC/terrain-analysis-test.php`: `#debugConsole`, `#status` | zdroj logovacích udalostí, window manager | vysoká | NEOVERENÉ |
| `skewt-panel` | Pohyblivý Skew‑T / log‑P prístroj | instrument | Samostatné okno atmosférického profilu s grafom, metadátami, presunom a resize. | `XC/js/skewt-render.js`, `window.SkewTRender`; `#skewTPanel`, `#skewTCanvas` | TEMP profil, canvas | vysoká | NEOVERENÉ |

## C. Explorer – plánovanie trate a profil

| ID kandidáta | Pracovný názov | Typ | Skutočný účel | Dôkaz v kóde | Hlavné závislosti | Univerzálnosť | Stav XC |
|---|---|---|---|---|---|---|---|
| `route-task-planner` | Plánovač trate | instrument | Vytvára body trate a štartovú pásku, upravuje poradie/radiusy, počíta vzdialenosť a exportuje JSON/IGC. | `XC/explorer-core.php`: `#sidebar`, `#pointList`, `#addPointsButton`, `#saveJsonButton`, `#exportIgcButton` a funkcie `renderMap`, `buildIgc`, `taskPayload` | Cesium, lokálny stav, File download | stredná | NEOVERENÉ |
| `explorer-route-import` | Import trate/IGC do Explorera | tool | Dynamicky vytvorí importné rozhranie, načíta IGC/JSON a odovzdá body plánovaču. | `XC/js/explorer-import.js`, `#explorerIgcInput`, `.explorer-import-box` | route planner, File API | vysoká | NEOVERENÉ |
| `terrain-profile` | Výškový profil trate | visualization | Vzorkuje terén po trati, kreslí profil, štatistiky a tooltip. | `XC/js/explorer-profile.js`; `#explorerProfileCanvas`, `#explorerProfileTooltip`, `#explorerProfileSamples` | Cesium terrain sampling, plán trate | vysoká | NEOVERENÉ |
| `terrain-profile-dock` | Dokovanie výškového profilu | component | Presunie profil medzi bočný panel a spodný dock a uchová umiestnenie. | `XC/js/explorer-profile-dock.js`, `#explorerProfileBottomDock`, `#explorerProfileDockToggle` | terrain-profile, `localStorage` | vysoká | NEOVERENÉ |
| `terrain-profile-follow` | Prepojenie profilu s mapou | tool | Pri pohybe po profile zvýrazní a sleduje zodpovedajúce miesto na mape. | `XC/js/explorer-profile-follow.js`, `#explorerProfileFollowToggle` | profil, Cesium viewer, dock | vysoká | NEOVERENÉ |
| `explorer-analysis-bridge` | Prenos trate do analýzy | adapter | Serializuje kontext Explorera, prenesie ho do analytického pracoviska a zobrazuje analytickú vrstvu trate. | `XC/js/explorer-analysis-bridge.js`, `localStorage` kľúč `termikaXC.explorer.analysisContext.v1` | Explorer state, analysis.php, Cesium | vysoká | NEOVERENÉ |
| `explorer-analysis-arrival` | Prijatie kontextu v analýze | adapter | Pri otvorení analýzy načíta prenesený kontext, nastaví fokus a oznámi pôvod. | `XC/js/explorer-analysis-arrival.js` | explorer-analysis-bridge, URL parametre, `localStorage` | vysoká | NEOVERENÉ |

## D. Terénne testovacie pracovisko – priamo vnorené nástroje

| ID kandidáta | Pracovný názov | Typ | Skutočný účel | Dôkaz v kóde | Hlavné závislosti | Univerzálnosť | Stav XC |
|---|---|---|---|---|---|---|---|
| `source-manager` | Správa vstupných zdrojov | tool | Načíta IGC/TEMP, nastaví stred analýzy a zobrazuje stav načítaných zdrojov. | `XC/terrain-analysis-test.php`: `#igcFileInput`, `#tempFileInput`, `#centerInput`, `#centerApplyButton` | File API, viewer, TEMP parser | vysoká | NEOVERENÉ |
| `temp-source-selector` | Výber zdroja TEMP | tool | Vyberá Windy, stanicu alebo URL/súbor a spravuje príslušné adresy. | `XC/terrain-analysis-test.php`: `#windTempSourceMode`, `#windTempSourceUrl`, `#windyTempUrl`, `#stationIndexUrl`, `#stationProfileUrlTemplate` | WindTempLoader, proxy/stanice | vysoká | NEOVERENÉ |
| `temp-record-cleanup` | Čistenie nepoužitých TEMP záznamov | admin tool | Zistí počet nepoužitých automatických TEMP záznamov a bezpečne spustí ich čistenie. | `XC/terrain-analysis-test.php`: `#tempCleanupButton`, `#tempUnusedCountBadge`, `#tempCleanupStatus`; `XC/genauto.php` | GENauto databáza/API | stredná | NEOVERENÉ |
| `analysis-focus-controls` | Ovládanie rozsahu analýzy | instrument | Nastavuje stred, polomer, rozostup a spúšťa alebo skrýva výsledok analýzy. | `XC/terrain-analysis-test.php`: `#radiusInput`, `#spacingInput`, `#analyzeButton`, `#clearButton`; `XC/js/terrain-analysis-focus-ui.js` | TerrainAnalysis/Core, viewer | stredná | NEOVERENÉ |
| `analysis-layer-toggle` | Viditeľnosť analytických vrstiev | component | Zapína/vypína geometriu, vrstevnice a ďalšie vizualizačné vrstvy bez prepočtu jadra. | `XC/terrain-analysis-test.php`: `#geometryVisible`, `#contoursVisible`; príslušné renderery | Cesium data sources, analýza | vysoká | NEOVERENÉ |
| `terrain-legend` | Legenda terénu | window | Vysvetľuje farby a význam terénnych geometrických tried v samostatnom okne. | `XC/terrain-analysis-test.php`, `#legend`, `.legend-item`, `data-window-name="Legenda"` | dizajnové triedy, window manager | vysoká | NEOVERENÉ |
| `cell-diagnostics` | Diagnostika bunky | window | Po kliknutí vysvetlí geometrické a morfologické metriky konkrétnej bunky. | `XC/terrain-analysis-test.php`, `#cellDiagnostics`, `#cellDiagnosticsBody`; `XC/js/terrain-analysis-diagnostics.js` | výsledok TerrainAnalysis, výber bunky | stredná | NEOVERENÉ |
| `wind-control-panel` | Ovládanie modelu vetra | instrument | Nastavuje AGL, rozostup, rýchlosť, smer, TEMP, farebný režim, animáciu a generovanie vetra. | `XC/terrain-analysis-test.php`: `#windEnabled`, `#windAglInput`, `#windSpeedInput`, `#windDirInput`, `#windColorMode`, `#windAnimate`; `XC/js/wind-ui.js` | WindField, WindEffectsCore, WindRender, WindTempLoader | stredná | NEOVERENÉ |
| `wind-fps-indicator` | Indikátor výkonu animácie vetra | instrument | Zobrazuje aktuálnu výkonnosť/FPS veterného vykreslenia. | `XC/terrain-analysis-test.php`, `#windFpsIndicator` a inline aktualizácia | render loop | vysoká | NEOVERENÉ |
| `windy-adapter-monitor` | Monitor spojenia s Windy | instrument | Zobrazuje stav, zdroj a posledný update mosta; umožňuje pripojenie a test prenosu fokusu. | `XC/terrain-analysis-test.php`: `#windyAdapterStatusBadge`, `#windyAdapterLastUpdateBadge`, `#windyAdapterConnectButton`, `#windBroadcastFocusButton` | WindyMapAdapterTool, TermikaCommunicationTool | vysoká | NEOVERENÉ |
| `windy-map-window` | Windy mapa | window | Hostí Windy Map Forecast, načítanie, výber fokusu, stav spojenia a použitie fokusu v TermikaXC. | `XC/terrain-analysis-test.php`: `#windyMapWindow`, `#windy`, `#windyFocusPickerToggleButton`, `#windyUseFocusButton` | Windy Map API, Leaflet, API kľúč, bridge/adapter | vysoká | NEOVERENÉ |
| `temp-profile-workbench` | TEMP profil – graf, tabuľka a záznamy | instrument | Zobrazuje aktuálny TEMP graf/tabuľku, sťahuje JSON, ukladá a načítava profily z databázy. | `XC/terrain-analysis-test.php`: `#tempProfileGraph`, `#tempProfileTableWrap`, `#tempDownloadButton`, `#tempSaveDbButton`, `#tempSavedSelect` | TEMP dáta, canvas, GENauto API | vysoká | NEOVERENÉ |
| `screen-recorder` | Záznam pracoviska do videa | tool | Zachytáva canvas pracoviska cez MediaRecorder, nastavuje FPS/kvalitu, čas a voliteľné skrytie UI. | `XC/terrain-analysis-test.php`: `#recordFps`, `#recordQuality`, `#recordAutoHideUi`, `#recordToggleButton`, `MediaRecorder` | Canvas CaptureStream, MediaRecorder | vysoká | NEOVERENÉ |
| `window-launcher-dock` | Dock otvárania okien | component | Zobrazuje/skrýva legendu, diagnostiku, debugger a Windy okno z viacerých miest. | `XC/terrain-analysis-test.php`, `data-show-window`, sekcia `windows`, `#quickToolDock` | konkrétne okná, inline window správanie | vysoká | NEOVERENÉ |

## E. Vietor, cache a medzinástrojové adaptéry

| ID kandidáta | Pracovný názov | Typ | Skutočný účel | Dôkaz v kóde | Hlavné závislosti | Univerzálnosť | Stav XC |
|---|---|---|---|---|---|---|---|
| `wind-streamline-renderer` | Renderer interného veterného poľa | visualization | Vykresľuje v Cesiu prúdnice vypočítaného poľa, farebné režimy, vrstvy a animované segmenty. Nie je Windy mapou ani jej náhradou. | `XC/js/wind-render.js`, `window.WindRender`, data source `WIND_STREAMLINES` | WindField, Cesium | stredná | NEOVERENÉ |
| `wind-temp-loader` | Univerzálny loader TEMP pre vietor | service | Načíta a normalizuje TEMP z Windy, stanice alebo súboru/URL. | `XC/js/wind-temp-loader.js`, `window.WindTempLoader`; `XC/windy-temp-proxy.php` | fetch, zdrojové adaptéry | vysoká | NEOVERENÉ |
| `windy-map-bridge` | Most na mapový objekt Windy/Leaflet | adapter | Deteguje mapu, poskytuje `getFocus`, `setFocus`, odber zmeny fokusu a oznámenie pripravenosti. Nie je renderer vetra. | `XC/js/windy-map-bridge.js`, `window.WindyMapBridgeBootstrap`, `window.WindyMapBridge` | Windy/Leaflet mapa, komunikačné udalosti | vysoká | NEOVERENÉ |
| `windy-map-adapter` | Komunikačný adaptér Windy | adapter | Registruje Windy ako nástroj v komunikačnej zbernici, sleduje heartbeat a prenáša fokus. | `XC/js/windy-map-adapter.js`, `window.WindyMapAdapterTool` | ToolCommunication, WindyMapBridge | vysoká | NEOVERENÉ |
| `generation-manager` | Správa WIND/MAP generácií | tool | Zachová, maže, načíta a porovnáva uložené generácie vetra a mapy. Je prítomná na hlavnej aj testovacej stránke. | `XC/index.php`: `#windClearTodayButtonMain`, `#windCompareGenerationMain`, `#mapCompareGenerationMain`; `XC/terrain-analysis-test.php`: zodpovedajúce `*Test`; `XC/genauto.php` | GENauto API, WindRender/Cesium vrstvy | stredná | NEOVERENÉ |
| `wind-cache-preview` | Náhľad vygenerovaného WIND videa | window | Zobrazí WebM z cache v samostatnom prekryvnom paneli a umožní ho zatvoriť. | `XC/index.php`, `#windCachePreview`, `#windCacheVideo`, `#closeWindCachePreviewButton` | video URL/blob, MediaRecorder/export | vysoká | NEOVERENÉ |
| `wind-webm-export` | Export veterného zobrazenia do WebM | tool | Zachytí Cesium canvas, vykreslí veternú animáciu a vytvorí prehrateľný/exportný WebM záznam. | inline logika `MediaRecorder` v `XC/index.php`; prepojenie na `windCachePreview` | Cesium canvas, MediaRecorder, WindRender | stredná | NEOVERENÉ |

## F. Serverové servisné kandidáty

Tieto položky nie sú UX okná, ale majú samostatný prevádzkový kontrakt a UX moduly ich môžu používať ako služby.

| ID kandidáta | Názov | Typ | Účel | Dôkaz | Stav XC |
|---|---|---|---|---|---|
| `genauto-service` | GENauto úložisko generácií | service | Ukladanie, výpis, načítanie, mazanie a strážca TEMP/WIND/MAP záznamov. | `XC/genauto.php` | NEOVERENÉ |
| `windy-temp-proxy` | Serverový Windy Point Forecast proxy | service | Skrýva API kľúč a vracia normalizovaný TEMP profil pre polohu. | `XC/windy-temp-proxy.php` | NEOVERENÉ |
| `release-version-service` | Zdroj release verzie | service | Bezpečne poskytne aktuálnu verziu klientskym modulom. | `XC/release-version.php`, `XC/asset/RELEASE_VERSION.txt` | NEOVERENÉ |
| `local-config-setup` | Správca lokálnej konfigurácie | admin tool | Číta, validuje a zapisuje lokálnu serverovú konfiguráciu a API kľúče. | `XC/setup.php`, `XC/asset/local-config.php.example` | NEOVERENÉ |
| `runtime-data-update` | Atomická aktualizácia runtime dát | service | Validuje vstup a atomicky zapisuje JSON runtime stav. | `XC/update.php` | NEOVERENÉ |

## G. Vizualizačné vrstvy viazané na analytický kontrakt

Tieto položky môžu byť modulárne, ale nesmú sa prenášať ako bežné UX doplnky bez presného kontraktu s analytickým jadrom.

| ID kandidáta | Názov | Čo zobrazuje | Dôkaz | Kritická väzba | Stav XC |
|---|---|---|---|---|---|
| `terrain-contours-layer` | Vrstevnicová vrstva | Súvislé 3D vrstevnice vzorkované na reálnom teréne. | `XC/js/terrain-contours.js` | TerrainAnalysisCore, Cesium terrain | NEOVERENÉ |
| `terrain-design-layer` | Farebný dizajn reliéfu | Farebné rodiny geometrie a morfologických kandidátov. | `XC/js/terrain-design.js`, `XC/js/terrain-design-ui.js` | analytické metriky a manuál terénneho dizajnu | NEOVERENÉ |
| `terrain-mesh-wireframe` | Drôtený mesh | Diagnostická topológia vrcholov, hrán a trojuholníkov. | `XC/js/terrain-mesh.js` | TerrainAnalysisCore a mesh dáta | NEOVERENÉ |
| `terrain-mesh-surface` | Plošná výplň meshu | Farebné alebo sivé diagnostické plochy terénneho meshu. | `XC/js/terrain-mesh-surface.js` | terrain mesh a farebné rodiny | NEOVERENÉ |
| `terrain-hover-tooltip` | Diagnostický tooltip bunky | Dynamický stručný náhľad geometrie a nadmorskej výšky bunky pod kurzorom. | `XC/js/terrain-analysis-diagnostics.js`, dynamický `#terrain-analysis-hover-tooltip` | výsledok analýzy a mapový pick | NEOVERENÉ |
| `analysis-focus-summary` | Súhrn aktuálneho fokusu | Dynamicky vložený stav a parametre opakovaného prepočtu zvoleného diagnostického fokusu. | `XC/js/terrain-analysis-focus-ui.js` | TerrainAnalysis a hostiteľský panel | NEOVERENÉ |
| `terrain-morphology-diagnostics` | Diagnostika morfologických metrík | Vkladá stavový prepínač a vysvetľujúce karty viacmierkových metrík. | `XC/js/terrain-morphology.js` | analytický výsledok morfológie | NEOVERENÉ |
| `terrain-mesh-controls` | Ovládanie mesh vrstiev | Dynamicky vytvára prepínače drôteného meshu, plošnej výplne, režimu farieb a stavové údaje. | `XC/js/terrain-mesh.js`, `XC/js/terrain-mesh-surface.js`; `#meshVisible`, `#meshFillVisible`, `#meshFillMode` | mesh renderery a hostiteľský panel | NEOVERENÉ |

## H. Analytické jadrá – evidovať, ale nemigrovať ako UX

Nasledujúce súbory sú dôležité, ale nie sú používateľskými modulmi. UX ich môže volať iba cez definovaný analytický kontrakt:

- `XC/js/terrain-analysis.js` – lokálna geometrická analýza terénu,
- `XC/js/terrain-analysis-core.js` – register a orchestrace analytických vrstiev,
- `XC/js/terrain-analysis-geometry.js` – adaptér geometrickej analýzy,
- `XC/js/terrain-analysis-ui.js` – staršie zapojenie analytiky do konkrétnych tlačidiel hlavnej aplikácie; pred zaradením treba preveriť, či je ešte aktívne alebo iba kompatibilný most,
- `XC/js/terrain-analysis-diagnostics.js` – výpočtová časť vysvetliteľnej diagnostiky,
- `XC/js/terrain-morphology.js` – viacmierkové morfologické metriky,
- `XC/js/terrain-mesh.js` – výpočtová topológia meshu,
- `XC/js/wind-field.js` – výpočet 3D veterného poľa,
- `XC/js/wind-effects-core.js`, `wind-effect-terrain.js`, `wind-effect-surface.js` – register a fyzikálne vplyvy vetra,
- `XC/js/meteo-core.js` – termodynamické výpočty,
- `XC/js/glider-core.js` – model klzáka.

## Overené rozlíšenia, ktoré nesmú byť označené za duplicitu

### `windy-map-bridge` verzus `wind-streamline-renderer`

- `windy-map-bridge` je komunikačný adaptér na externú Windy/Leaflet mapu a jej fokus.
- `wind-streamline-renderer` vykresľuje interne vypočítané 3D veterné pole do Cesia.
- Funkcie sú komplementárne. Samotná podobnosť slova „wind“ nie je dôkazom duplicity.

### `release-badge` verzus `release-footer`

- Badge patrí do hlavičky konkrétneho panela a verziu získava cez endpoint.
- Footer zobrazuje copyright, rok a verziu stránky.
- Môžu zdieľať službu verzie, ale ide o dva rozdielne prezentačné moduly.

### `screen-recorder` verzus `wind-webm-export`

- Screen recorder zaznamenáva celé testovacie pracovisko podľa používateľských volieb.
- Wind WebM export cielene vytvára záznam veterného zobrazenia a používa cache preview.
- Zdieľajú technológiu MediaRecorder, nie nevyhnutne rovnaký používateľský kontrakt.

## Zistené pasce súčasného zapojenia

Tieto nálezy sú dôvodom, prečo existencia súboru ešte nedokazuje pripravenosť modulu:

1. `XC/index.php` načítava cez `glob(XC/js/*.js)` prakticky všetky JavaScripty v adresári. Súbor sa preto môže spustiť aj na stránke, pre ktorú nebol vytvorený.
2. `XC/js/workspace-hud-toggle.js` dočasne vytvára skrytý falošný prvok `#radiusInput`, aby starší `terrain-camera-hud.js` prešiel svojou kontrolou hostiteľskej stránky. Je to kompatibilný most a pred migráciou sa musí odstrániť riadnym kontextovým kontraktom.
3. `XC/js/wind-effect-surface.js`, hoci je pomenovaný ako fyzikálny vplyv povrchu, dynamicky pripája viaceré pracoviskové CSS a JS doplnky. Fyzikálna a UI zodpovednosť sú v ňom premiešané.
4. `terrain-release-badge.js` existuje ako samostatný modul, ale testovacia stránka ho vo svojom explicitnom zozname skriptov nenačítava. Jeho skutočné runtime zapojenie treba najprv odsledovať a opraviť v XC.
5. Viaceré nástroje majú CSS, DOM aj obsluhu vložené priamo v `terrain-analysis-test.php`; samostatný `.js` súbor preto nie je podmienkou existencie kandidáta.
6. Rovnaké prevádzkové funkcie (debugger, téma, správa generácií, MediaRecorder) majú viac hostiteľských implementácií. Zdieľaná technológia sama osebe ešte neznamená rovnaký modul ani bezpečnú duplicitu.

## Ďalší spôsob práce

Každý samostatný modul musí mať vlastný manifest a evidenciu stavu:

```text
DISCOVERED → DEBUGGING_XC → VERIFIED_XC → WRAPPED_CC → VERIFIED_CC → ACCEPTED
```

Stavový reťazec eviduje poznanie a overenie modulu, ale už nie je bránou samotného kopírovania zdroja do CC. Moduly sa prenášajú samostatne vo vnútri funkčných skupín.

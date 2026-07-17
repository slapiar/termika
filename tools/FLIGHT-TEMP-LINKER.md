# IGC → TEMP linker (dátum letu a dosah meteo profilov)

## 1. Účel

Nástroj automaticky prepája načítaný `.igc` súbor s TEMP meteorologickými profilmi podľa **skutočného dátumu letu**, nie podľa aktuálneho dňa.

Rieši dva prípady:

- let je **čerstvý** (aktuálny alebo pár dní starý) → použije sa živé aktuálne predpoveďové TEMP z Windy,
- let je **starší** → nástroj hľadá najbližší **starší** archivovaný TEMP profil (nikdy nie profil z budúcnosti voči dátumu letu) v okruhu 100 km od miesta štartu, prípadne pripája ďalšie profily, ak trať presahuje dosah jedného profilu.

Dodržiava zásadu z `postupy/WIND-noty-v1.md`: meteorologické hodnoty sa nesmú hádať ani nahrádzať vymyslenými dátami bez upozornenia. Ak sa použije nezodpovedajúci (mismatched) profil, je to viditeľne označené.

## 2. Identita a stav

| Položka | Hodnota |
|---|---|
| ID nástroja | `flight-temp-linker` |
| Názov | IGC → TEMP linker |
| Stav | `AKTÍVNE` – implementované a overené end-to-end |
| Verzia | `1.0.0` |
| Implementácia | `CC/app/js/flight-temp-linker.js`, akcia `findTempNear` v `CC/app/genauto.php` |
| Oblasť použitia | `CC/app/terrain-analysis-test.php` |
| Predvolené správanie | spúšťa sa automaticky pri načítaní `.igc` súboru |

## 3. Ovládanie – nové ikony rýchleho panela

V plávajúcom rýchlom paneli (quick-tool-dock) pribudli dve nové ikony:

| Ikona | ID | Funkcia |
|---|---|---|
| `⇧` | `quickLoadIgcButton` | Otvorí výber `.igc` súboru (reuse existujúceho `#igcFileInput`) |
| `⊚` | `quickTempReachButton` | Zapne/vypne zobrazenie kruhov dosahu (100 km) okolo pripojených TEMP profilov na mape |

Obe ikony využívajú existujúcu IGC načítavaciu logiku v sekcii „Zdroje“ (`workspace-navigation.terrain.view.php`), nie sú duplicitnou implementáciou.

## 4. Ako funguje výber TEMP profilu

Pri načítaní `.igc` sa prečíta dátum letu (`flightDate`) a bod štartu.

1. **Čerstvý let** (`≤ 2 dni` od aktuálneho dátumu): skúsi sa živé stiahnutie z Windy. Profil sa označí `source: "windy-live"`.
2. **Starší let**: cez `genauto.php?action=findTempNear` sa prehľadá archív uložených TEMP profilov (`temp_profile_events`/`temp_profiles`) v okruhu 100 km a nájde sa najbližší **starší alebo rovnaký deň** ako dátum letu. Profil sa označí `source: "archive-nearest-older"`.
3. **Nič nenájdené**: ako núdzové riešenie sa použije živé Windy TEMP, ale s príznakom `isMismatched: true` a slovenským varovaním, že dáta nezodpovedajú dátumu letu.

Každý pripojený profil nesie explicitnú proveniencia (`source`, `dayUtc`, `distanceKm`, `isMismatched`) – nič sa nezobrazuje ako spoľahlivé bez overenia.

## 5. Viacstaničný dosah

Nástroj prejde vzorky trate letu a zisťuje, či niektorý úsek presahuje 100 km od všetkých aktuálne pripojených profilov. Ak áno, automaticky dotiahne ďalší najbližší profil pre daný úsek (do maximálne 6 profilov na let).

## 6. Priestorová interpolácia (API pripravené, zatiaľ nenapojené na fyziku)

Modul poskytuje `window.FlightTempLinker.interpolateAt(lat, lon)` – váženú interpoláciu (IDW, mocnina 2) medzi všetkými aktívnymi TEMP profilmi pre daný bod trate, vrátane miery spoľahlivosti (`confidence: high/medium/low`) a zoznamu prispievajúcich profilov s váhami.

Táto funkcia **zatiaľ nie je volaná** žiadnym fyzikálnym alebo termickým výpočtom – je to pripravené rozšírenie pre budúcu integráciu.

## 7. Verejné API

```js
window.FlightTempLinker = {
  VERSION: "1.0.0",
  REACH_KM: 100,
  handleIgcLoaded({ flightDate, route, viewer, settings }),
  toggleReachOverlay(viewer),
  interpolateAt(lat, lon),
  getActiveProfiles(),
  getFlightDate(),
};
```

## 8. Súvisiaca oprava

Počas implementácie bola nájdená a opravená chyba v `CC/ux/flight-playback/flight-track-renderer/source/XC__js__cesium-render.js`: funkcia `nastavRezimKamery()` volala globálnu funkciu `setMapState(...)` bez `window.` prefixu. Táto funkcia existuje iba na `index.php`, nie na `terrain-analysis-test.php`, čo pred opravou spôsobovalo `ReferenceError` a blokovalo **celé** načítanie IGC (aj pôvodné tlačidlo v sekcii „Zdroje“). Opravené na defenzívne `window.setMapState?.(...)`.

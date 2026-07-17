# Oddeľovanie hostiteľských zdrojov CC od modulov

**Dátum:** 17. júl 2026  
**Hostiteľ:** `CC/app`  
**Referencia:** `XC` zostáva nezmenené

## Dokončené

- `CC/app` je paralelná hostiteľská kópia aplikácie odvodená z `XC`.
- 47 samostatných JavaScriptových implementácií v `CC/app/js` bolo nahradených tenkými proxy volaniami na jediného vlastníka v modulovom strome.
- Zachovalo sa pôvodné pomenovanie a poradie `<script>` vstupov hostiteľa.
- 14 samostatných DOM okien, panelov a líšt bolo vybratých z hostiteľských PHP stránok do príslušných modulov.
- Hostiteľské PHP stránky na ich pôvodných miestach obsahujú iba `require` volanie modulového view.
- Vlastníctvo je strojovo evidované v `CC/registry/host-code-owners.json`.

## Zostávajúci inline dlh

Veľký inline skript bol z `CC/app/terrain-analysis-test.php` odstránený. Jeho zostávajúca hostiteľská orchestrace je dočasne uložená v `CC/app/js/terrain-analysis-runtime.js` a zdieľa najmä:

- zvolený fokus a Cesium viewer,
- TEMP profil a jeho databázový stav,
- generácie WIND/MAP,
- Windy spojenie,
- navigačný a oknový stav,
- záznam MediaRecorder,
- spoločné logovanie a cleanup.

Vznikol nový architektonický modul `CC/infrastructure/host-context/host-context`, ktorý poskytuje stav, služby, udalosti a cleanup bez priamej väzby na konkrétne UX moduly.

Zo spoločného runtime bol ako prvý úplne vyčlenený `window-manager`. Hostiteľ ho načíta ako samostatný modul a diagnostika bunky používa jeho verejné `bringToFront()` namiesto zdieľanej premennej `highestWindowZ`.

Zostávajúci runtime sa nesmie plošne rozdeliť iba podľa názvov funkcií. Jednotlivé bloky sa budú vyberať cez explicitný hostiteľský kontext a udalostné kontrakty. Stav `HOST_RUNTIME_EXTRACTED` preto znamená, že PHP už neobsahuje monolitický inline skript; neznamená ešte úplné rozdelenie všetkých jeho funkcií.

## Reprodukcia

Hostiteľský strom a vlastnícke proxy vytvára `tools/build-cc-app.mjs`. Skript nikdy nekopíruje `asset/local-config.php` ani `.local-config.php` a nemení `XC`.

Lokálny štart používa document root `CC/app`. Ak existuje `XC/asset/local-config.php` alebo koreňový `.local-config.php`, `start-termikaxc.sh` ho poskytne PHP cez `TERMIKA_LOCAL_CONFIG_PATH`; tajné kľúče sa nekopírujú do `CC`.

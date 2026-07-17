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

Veľký inline skript v `CC/app/terrain-analysis-test.php` zatiaľ obsahuje spoločný stav a obsluhu viacerých modulov. Zdieľa najmä:

- zvolený fokus a Cesium viewer,
- TEMP profil a jeho databázový stav,
- generácie WIND/MAP,
- Windy spojenie,
- navigačný a oknový stav,
- záznam MediaRecorder,
- spoločné logovanie a cleanup.

Tento blok nesmie byť plošne rozdelený iba podľa názvov funkcií. Pred odstránením z hostiteľa treba zaviesť explicitný hostiteľský kontext a udalostné kontrakty. Dovtedy zostáva v registri označený `PENDING`; jeho existencia sa nesmie vydávať za dokončené oddelenie.

## Reprodukcia

Hostiteľský strom a vlastnícke proxy vytvára `tools/build-cc-app.mjs`. Skript nikdy nekopíruje `asset/local-config.php` ani `.local-config.php` a nemení `XC`.

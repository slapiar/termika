# Časové značky pracoviska

## 1. Účel

Modul `time-badges` zobrazuje v ľavom hornom rohu pracoviska dva časové riadky bez blokovania mapy alebo stránky.

```text
NOW - DD. MM. RRRR: HH:MM:SS
IGC DD.MM. RRRR, Štart - HH:MM:SS - Pristátie: HH:MM:SS
```

## 2. Identita a stav

| Položka | Hodnota |
|---|---|
| ID nástroja | `time-badges` |
| Typ | prístroj / HUD pracoviska |
| Verzia | `1.0.0` |
| Stav | `IMPLEMENTOVANÉ – NEOVERENÉ V PREHLIADAČI` |
| Predvolené správanie | implicitne aktívny |
| Vlastník | `CC/ux/workbench-shell/time-badges/` |

## 3. Riadok NOW

Riadok `NOW` používa výhradne lokálny dátum a čas zariadenia používateľa.

- Načítanie IGC ho nemení.
- Prehrávanie letu ho nemení.
- Posun časovej osi ho nemení.
- Zmena Cesium hodín ho nemení.
- Vymazanie IGC ho nemení.

## 4. Riadok IGC

Riadok `IGC` používa:

- dátum letu z hlavičky IGC,
- čas prvého platného B-záznamu ako štart,
- čas posledného platného B-záznamu ako pristátie.

Pri načítaní ďalšieho IGC sa obsah nahradí. Keď spoločný stav neobsahuje načítaný let, obsah riadku sa vyprázdni. Prázdny riadok zostáva v DOM a zachováva výšku modulu.

## 5. Závislosti a údaje

Modul môže čítať spoločný stav:

```text
PilotNetwork.metadata.flightDate
PilotNetwork.letoveBody
```

Podporuje aj udalosti:

```text
termika:igc-loaded
termika:igc-cleared
```

Modul nemení IGC dáta, Cesium hodiny, oblohu ani analytické výsledky.

## 6. Životný cyklus a API

Verejné API:

```js
window.TermikaTimeBadges
```

Metódy:

```text
install()
activate()
deactivate()
destroy()
updateNow()
updateIgc(metadata, points)
clearIgc()
syncIgcFromSharedState()
getState()
```

## 7. Súvisiace súbory

```text
CC/ux/workbench-shell/time-badges/module.json
CC/ux/workbench-shell/time-badges/time-badges.js
CC/ux/workbench-shell/time-badges/time-badges.css
CC/app/js/time-badges.js
```

## 8. Povinné overenie

Pred zmenou stavu na `OVERENÉ` treba v každom podporovanom pracovisku skontrolovať:

1. jedinú inštanciu modulu,
2. lokálny čas zariadenia v riadku `NOW`,
3. načítanie prvého IGC,
4. nahradenie údajov druhým IGC,
5. vymazanie IGC,
6. nezávislosť riadku `NOW` od Cesium času,
7. deaktiváciu a opätovnú aktiváciu,
8. zrušenie časovačov a listenerov pri `destroy()`.

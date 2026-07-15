# Letový režim kamery

## 1. Účel

Letový režim kamery je univerzálny nástroj TermikaXC na plynulý pohyb v 3D scéne Cesium z pohľadu pilota.

Nástroj nevytvára model lietadla, vetroňa ani závesného klzáka. Kamera predstavuje polohu a smer pohľadu pilota. Existujúce ovládanie myšou v Cesium zostáva zachované a slúži ako prirodzené riadenie smeru pohľadu. Klávesnica určuje doprednú rýchlosť.

Prvá verzia je zámerne kinematická. Neobsahuje ešte poláru, stratu výšky, vztlak, pádovú rýchlosť, vplyv vetra ani stúpania. Tieto fyzikálne vrstvy sa majú pripájať neskôr ako samostatné moduly.

## 2. Identita a stav

| Položka | Hodnota |
|---|---|
| ID nástroja | `flight-simulator` |
| Názov | Letový režim kamery |
| Stav | `ROZPRACOVANÉ` |
| Verzia | `1.0.0` |
| Jadro | `XC/js/flight-simulator.js` |
| Ovládanie pracoviska | `XC/js/workspace-flight-toggle.js` |
| Vizuál | `XC/asset/workspace-flight-simulator.css` |
| Oblasti použitia | Prieskumník, Analýza, ďalšie Cesium pracoviská |
| Predvolený stav | vypnutý |

## 3. Kde je dostupný

Nástroj je aktuálne pripojený do:

```text
XC/explorer.php
XC/analysis.php
```

V hornej pracovnej lište sa zobrazuje tlačidlo:

```text
LET
```

Tlačidlo je umiestnené pri prepínači HUD-u a témy.

## 4. Základné ovládanie

### 4.1 Zapnutie

Klikni na tlačidlo:

```text
LET
```

Aktívny stav sa farebne zvýrazní. Let sa nezačne pohybom sám. Po aktivácii je cieľová rýchlosť nulová a pilot ju vedome zvýši klávesnicou.

### 4.2 Myš ako knipel

Nástroj nemení natívne ovládanie Cesium.

Myš naďalej ovláda:

- smer pohľadu,
- azimut,
- sklon pohľadu,
- náklon a priestorovú orientáciu podľa možností aktuálneho režimu Cesium.

Letový modul iba posúva kameru dopredu v jej aktuálnom smere.

### 4.3 Rýchlosť

| Kláves | Funkcia |
|---|---|
| `↑` | zvýši cieľovú rýchlosť o `1 m/s` |
| `↓` | zníži cieľovú rýchlosť o `1 m/s` |
| `Shift + ↑` | zvýši cieľovú rýchlosť o `5 m/s` |
| `Shift + ↓` | zníži cieľovú rýchlosť o `5 m/s` |
| `medzerník` | nastaví cieľovú rýchlosť na `0 m/s` |

Rýchlosť sa nemení skokom. Aktuálna rýchlosť sa plynulo približuje k cieľovej hodnote.

Predvolené pracovné hodnoty:

```text
zrýchlenie: 4 m/s²
spomalenie: 7 m/s²
minimum: 0 m/s
maximum: 100 m/s
```

Tieto hodnoty sú konfiguračné parametre nástroja, nie aerodynamické vlastnosti konkrétneho lietadla.

## 5. Stavové zobrazenie

Pri aktívnom letovom režime sa zobrazí kompaktný stavový panel:

```text
LETOVÝ REŽIM   54 km/h   cieľ 72 km/h
```

Panel zobrazuje:

- aktuálnu doprednú rýchlosť,
- cieľovú rýchlosť,
- stručnú nápovedu klávesov.

Ak je v Prieskumníkovi výškový profil pripnutý dole, stavový panel sa automaticky posunie nad profil.

## 6. Pohyb kamery

Pri každom animačnom snímku sa vykoná:

```text
prejdená vzdialenosť
=
aktuálna rýchlosť
×
čas od posledného snímku
```

Pohyb zabezpečuje natívna metóda Cesium:

```js
viewer.camera.moveForward(distanceMeters);
```

Smer pohybu je preto vždy aktuálny smer kamery.

Pri zmene azimutu alebo sklonu myšou sa ďalší pohyb okamžite prispôsobí novému smeru.

## 7. Ochrana terénu

Prvá verzia obsahuje jednoduchú ochranu pred prechodom kamery pod načítaný terén.

Ak je v Cesium dostupná výška terénu pod kamerou a kamera by klesla nižšie než pracovná bezpečnostná medzera, poloha sa upraví približne na:

```text
výška terénu + 3 m
```

Táto ochrana:

- nie je model kolízie lietadla,
- nevyhodnocuje náraz,
- nepočíta energiu ani poškodenie,
- iba bráni technickému zmiznutiu kamery pod zobrazený povrch.

Ak výška terénu ešte nie je načítaná, modul si ju nevymýšľa.

## 8. Správanie v 3D

Letový režim je určený predovšetkým pre `SCENE3D`.

Pri aktivácii sa pracovisko podľa možnosti prepne do 3D režimu Cesium. Nástroj nemení textúry, terén, analytické vrstvy ani výsledky výpočtov.

## 9. Verejné programové rozhranie

Globálne API:

```js
window.TermikaFlightSimulator
```

Hlavné metódy:

```js
TermikaFlightSimulator.install(viewer, options);
TermikaFlightSimulator.bindViewer(viewer);
TermikaFlightSimulator.activate();
TermikaFlightSimulator.deactivate();
TermikaFlightSimulator.toggle();
TermikaFlightSimulator.stop();
TermikaFlightSimulator.setTargetSpeedMs(20);
TermikaFlightSimulator.adjustSpeedMs(2);
TermikaFlightSimulator.getState();
TermikaFlightSimulator.destroy();
```

Stavové vlastnosti:

```js
TermikaFlightSimulator.active
TermikaFlightSimulator.installed
TermikaFlightSimulator.viewer
TermikaFlightSimulator.speedMs
TermikaFlightSimulator.targetSpeedMs
```

## 10. Stavové udalosti

Nástroj vysiela DOM udalosť:

```text
termikaxc:flight-state
```

Príklad odberu:

```js
document.addEventListener('termikaxc:flight-state', (event) => {
    console.log(event.detail.speedKmh);
});
```

Obsah `event.detail`:

```js
{
    version,
    active,
    speedMs,
    targetSpeedMs,
    speedKmh,
    targetSpeedKmh,
    coordinates: {
        lat,
        lon,
        heightM
    },
    timestamp
}
```

Ak je dostupný univerzálny komunikačný modul, stav sa zároveň publikuje lokálnym eventom:

```text
flight:state
```

cez:

```js
TermikaCommunicationTool.emit('flight:state', detail);
```

## 11. Závislosti

Povinné:

- Cesium,
- pripravený Cesium `viewer`,
- 3D kontajner pracoviska.

Voliteľné:

- Kamerový HUD,
- rozšírenie HUD-u o súradnice,
- `TermikaCommunicationTool`,
- spoločná horná navigácia TermikaXC.

Letové jadro nie je závislé od Windy ani od konkrétneho meteorologického zdroja.

## 12. Životný cyklus

### Inštalácia

```js
TermikaFlightSimulator.install(viewer);
```

Pripojí klávesnicové udalosti a pripraví stavové zobrazenie.

### Aktivácia

```js
TermikaFlightSimulator.activate();
```

Spustí animačnú slučku.

### Deaktivácia

```js
TermikaFlightSimulator.deactivate();
```

Zastaví animačnú slučku a vynuluje rýchlosť.

### Zrušenie

```js
TermikaFlightSimulator.destroy();
```

Odpojí klávesnicu, animačný cyklus, stavové prvky a väzbu na viewer.

## 13. Obmedzenia prvej verzie

Aktuálna verzia ešte nepočíta:

- aerodynamickú poláru,
- minimálnu a maximálnu rýchlosť konkrétneho typu,
- pádovú rýchlosť,
- preťaženie,
- sklz,
- koordináciu zatáčky,
- vztlak,
- odpor,
- klesavosť,
- zmenu energie pri zrýchlení,
- vietor,
- termické stúpania,
- rotor,
- turbulenciu,
- stúpavé a klesavé polia,
- obmedzenie podľa reliéfu pred kamerou.

Preto sa aktuálna rýchlosť nesmie interpretovať ako výsledok fyzikálneho letového modelu. Je to riadená rýchlosť pohybu virtuálnej kamery.

## 14. Plánované rozšírenia

Nasledujúce vrstvy sa majú pripájať modulárne:

1. výber typu lietadla a jeho poláry,
2. vzťah rýchlosť ↔ klesavosť,
3. energetická výmena pri zrýchlení a spomalení,
4. vietor z univerzálneho komunikačného modulu,
5. drift podľa vetra,
6. stúpania a klesania z WIND poľa,
7. variometer,
8. indikovaná a traťová rýchlosť,
9. let po naplánovanej trati,
10. záznam a replay letu,
11. napojenie na HUD bez duplikovania údajov,
12. fyzikálne obmedzenia podľa zvoleného typu klzáka alebo lietadla.

## 15. Súvisiace súbory

```text
XC/js/flight-simulator.js
XC/js/workspace-flight-toggle.js
XC/asset/workspace-flight-simulator.css
XC/js/terrain-camera-hud.js
XC/js/terrain-camera-hud-coordinates.js
XC/explorer.php
XC/analysis.php
TOOLS.md
tools/HUD.md
tools/COMMUNICATION.md
```

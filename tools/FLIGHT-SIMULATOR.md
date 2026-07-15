# Letový režim kamery

## 1. Účel

Letový režim kamery je univerzálny nástroj TermikaXC na plynulý pohyb v 3D scéne Cesium z pohľadu pilota.

Nástroj nevytvára model lietadla, vetroňa ani závesného klzáka. Kamera predstavuje oči pilota. Samotný let má vlastnú orientáciu a smer pohybu; pilot sa môže nezávisle obzerať bez toho, aby tým menil smer letu.

Verzia `1.1.0` oddeľuje dve vrstvy:

1. **riadenie letu** – myš ako knipel,
2. **pohľad pilota** – klávesy `Q/W/A/D/S`.

Prvá verzia je stále zámerne kinematická. Neobsahuje ešte poláru, klesavosť, vztlak, pádovú rýchlosť, vietor ani termické stúpania. Tieto fyzikálne vrstvy sa majú pripájať samostatne.

## 2. Identita a stav

| Položka | Hodnota |
|---|---|
| ID nástroja | `flight-simulator` |
| Názov | Letový režim kamery |
| Stav | `ROZPRACOVANÉ` |
| Verzia | `1.1.0` |
| Jadro | `XC/js/flight-simulator.js` |
| Ovládanie pracoviska | `XC/js/workspace-flight-toggle.js` |
| Vizuál | `XC/asset/workspace-flight-simulator.css` |
| Oblasti použitia | Prieskumník, Analýza a ďalšie Cesium pracoviská |
| Predvolený stav | vypnutý |

## 3. Kde je dostupný

Nástroj je pripojený do:

```text
XC/explorer.php
XC/analysis.php
```

V hornej pracovnej lište sa zobrazuje tlačidlo:

```text
LET
```

Tlačidlo je umiestnené pri prepínači HUD-u a témy.

## 4. Zapnutie a vypnutie

Kliknutím na:

```text
LET
```

sa aktivuje pilotný režim.

Po zapnutí:

- nástroj prevezme riadenie kamery,
- natívne pohybové ovládanie Cesium sa dočasne vypne, aby sa s pilotným riadením nebilo,
- cieľová rýchlosť zostane `0 m/s`,
- let sa nezačne bez vedomého stlačenia šípky hore.

Po vypnutí:

- pohyb sa zastaví,
- rýchlosť sa vynuluje,
- pôvodné ovládanie Cesium sa obnoví,
- prípadný pointer-lock sa uvoľní.

## 5. Myš ako knipel

### 5.1 Pozdĺžne riadenie – pitch

Pohyb myši po stole ovláda pozdĺžne riadenie:

| Pohyb myši | Reakcia letu |
|---|---|
| od seba | nos dole |
| k sebe | nos hore |

Pri prvom stlačení ľavého alebo pravého tlačidla nad mapou si prehliadač podľa možností aktivuje `Pointer Lock`. Kurzor sa tým prestane opierať o okraje obrazovky a pohyb knipla môže pokračovať plynulo.

Pracovný limit pitchu je predvolene približne:

```text
−55° až +55°
```

Ide o ochranný limit virtuálnej kamery, nie o letovú obálku konkrétneho lietadla.

### 5.2 Priečne riadenie – náklon

| Ovládanie | Reakcia letu |
|---|---|
| držané ľavé tlačidlo myši | rastúci náklon vľavo |
| držané pravé tlačidlo myši | rastúci náklon vpravo |
| uvoľnenie tlačidla | zmena náklonu sa zastaví; dosiahnutý náklon zostane |

Náklon sa nemení skokom. Rastie približne rýchlosťou:

```text
34°/s
```

Pracovný limit je približne:

```text
−72° až +72°
```

Na návrat do menšieho náklonu sa použije opačné tlačidlo.

### 5.3 Základ koordinovanej zatáčky

Náklon nie je iba grafické otočenie obrazu.

Pri nenulovej rýchlosti modul mení aj smer letu podľa základného vzťahu koordinovanej zatáčky:

```text
uhlová rýchlosť zatáčky
≈
g × tan(náklon)
──────────────
rýchlosť
```

Výpočet je bezpečnostne obmedzený maximálnou pracovnou uhlovou rýchlosťou. Ide o prvý kinematický základ, nie o úplný aerodynamický model.

## 6. Ovládanie rýchlosti

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

Tieto hodnoty sú konfiguračné parametre nástroja, nie vlastnosti konkrétneho typu lietadla.

## 7. Pohľad pilota

Pohľad pilota je oddelený od osi letu.

| Kláves | Pohľad kamery |
|---|---|
| `Q` | plynulo vľavo |
| `W` | plynulo vpravo |
| `A` | plynulo dole |
| `D` | plynulo hore |
| `S` | návrat pohľadu dopredu do horizontu |

Klávesy `Q/W/A/D` sa držia. Po ich uvoľnení sa pohyb pohľadu zastaví v dosiahnutej polohe.

Dôležité:

- obzretie doľava nemení smer letu,
- pohľad hore nemení pitch lietadla,
- dopredný pohyb sa stále počíta podľa letovej osi,
- kamera iba zobrazuje inú časť okolia pilota.

Kláves `S` nastaví:

- pohľad späť do smeru letu,
- zvislý pohľad na horizont,
- vyrovnaný horizont kamery.

Nemení pritom samotný náklon ani pitch letu.

## 8. Stavové zobrazenie

Pri aktívnom letovom režime sa zobrazí kompaktný stavový panel, napríklad:

```text
LETOVÝ REŽIM   54 km/h   cieľ 72 km/h   náklon −24°   pitch +6°
```

Panel zobrazuje:

- aktuálnu doprednú rýchlosť,
- cieľovú rýchlosť,
- aktuálny náklon letovej osi,
- aktuálny pitch letovej osi,
- stručnú nápovedu ovládania.

Ak je v Prieskumníkovi výškový profil pripnutý dole, stavový panel sa automaticky posunie nad profil.

## 9. Pohyb v priestore

Letová orientácia je uložená oddelene od smeru pohľadu kamery:

```text
letová orientácia
=
azimut + pitch + náklon

pohľad pilota
=
odchýlka do strán + odchýlka hore/dole + vyrovnanie horizontu
```

Pri každom animačnom snímku sa vypočíta:

```text
prejdená vzdialenosť
=
aktuálna rýchlosť
×
čas od posledného snímku
```

Smerový vektor letu sa vytvára v miestnej sústave East–North–Up a následne sa prevedie do priestorovej sústavy Cesium.

Vďaka tomu pilot môže pozerať bokom a stroj pritom pokračuje po pôvodnej osi letu.

## 10. Ochrana terénu

Ak je v Cesium dostupná výška terénu pod kamerou a nová poloha by klesla pod povrch, kamera sa upraví približne na:

```text
výška terénu + 3 m
```

Táto ochrana:

- nie je model kolízie,
- nevyhodnocuje náraz,
- nepočíta energiu ani poškodenie,
- iba bráni technickému zmiznutiu kamery pod načítaný povrch.

Ak výška terénu ešte nie je dostupná, modul si ju nevymýšľa.

## 11. Verejné programové rozhranie

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
TermikaFlightSimulator.resetViewToHorizon();
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

## 12. Stavové udalosti

Nástroj vysiela DOM udalosť:

```text
termikaxc:flight-state
```

Príklad:

```js
document.addEventListener('termikaxc:flight-state', (event) => {
    console.log(event.detail.speedKmh);
    console.log(event.detail.flight.rollDeg);
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
    flight: {
        headingDeg,
        pitchDeg,
        rollDeg
    },
    view: {
        yawOffsetDeg,
        pitchOffsetDeg,
        rollOffsetDeg
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

## 13. Závislosti

Povinné:

- Cesium,
- pripravený Cesium `viewer`,
- 3D scéna a canvas pracoviska.

Voliteľné:

- Kamerový HUD,
- rozšírenie HUD-u o súradnice,
- `TermikaCommunicationTool`,
- spoločná horná navigácia TermikaXC.

Letové jadro nie je závislé od Windy ani od konkrétneho meteorologického zdroja.

## 14. Životný cyklus

### Inštalácia

```js
TermikaFlightSimulator.install(viewer);
```

Pripojí klávesnicu, myš, pointer-lock a pripraví stavové zobrazenie.

### Aktivácia

```js
TermikaFlightSimulator.activate();
```

Prevezme riadenie kamery a spustí animačnú slučku.

### Deaktivácia

```js
TermikaFlightSimulator.deactivate();
```

Zastaví slučku, vynuluje rýchlosť a obnoví pôvodné ovládanie Cesium.

### Zrušenie

```js
TermikaFlightSimulator.destroy();
```

Odpojí všetky udalosti, pointer-lock, stavové prvky a väzbu na viewer.

## 15. Obmedzenia aktuálnej verzie

Aktuálna verzia ešte nepočíta:

- aerodynamickú poláru,
- minimálnu a maximálnu rýchlosť konkrétneho typu,
- pádovú rýchlosť,
- preťaženie,
- sklz,
- dynamiku nábehu a výškového kormidla,
- vztlak,
- odpor,
- klesavosť,
- zmenu energie pri zrýchlení,
- vietor,
- termické stúpania,
- rotor,
- turbulenciu,
- stúpavé a klesavé polia,
- predikciu kolízie s reliéfom pred kamerou.

Základ koordinovanej zatáčky je iba prvý kinematický vzťah. Aktuálna rýchlosť sa preto nesmie interpretovať ako výsledok úplného fyzikálneho letového modelu.

## 16. Plánované rozšírenia

1. výber typu lietadla a jeho poláry,
2. vzťah rýchlosť ↔ klesavosť,
3. energetická výmena pri zrýchlení a spomalení,
4. vietor z univerzálneho komunikačného modulu,
5. drift podľa vetra,
6. stúpania a klesania z WIND poľa,
7. variometer,
8. indikovaná, vzdušná a traťová rýchlosť,
9. fyzikálna dynamika pitchu, rollu a koordinácie zatáčky,
10. let po naplánovanej trati,
11. záznam a replay letu,
12. napojenie na HUD bez duplikovania údajov,
13. fyzikálne obmedzenia podľa zvoleného typu klzáka alebo lietadla.

## 17. Súvisiace súbory

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

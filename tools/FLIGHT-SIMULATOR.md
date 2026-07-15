# Letový režim kamery

## 1. Účel

Letový režim kamery je univerzálny nástroj TermikaXC na plynulý pohyb v 3D scéne Cesium z pohľadu pilota.

Nástroj nevytvára model lietadla, vetroňa ani závesného klzáka. Kamera predstavuje oči pilota. Samotný let má vlastnú orientáciu a smer pohybu; pilot sa môže nezávisle obzerať bez toho, aby tým menil smer letu.

Verzia `1.1.1` oddeľuje dve vrstvy:

1. **riadenie letu** – myš ako knipel pri držanom ľavom tlačidle,
2. **pohľad pilota** – klávesy `Q/W/A/D/S`.

Aktuálna verzia je zámerne kinematická. Neobsahuje ešte poláru, klesavosť, vztlak, pádovú rýchlosť, vietor ani termické stúpania. Tieto fyzikálne vrstvy sa majú pripájať samostatne.

## 2. Identita a stav

| Položka | Hodnota |
|---|---|
| ID nástroja | `flight-simulator` |
| Názov | Letový režim kamery |
| Stav | `ROZPRACOVANÉ` |
| Verzia | `1.1.1` |
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

## 4. Zapnutie a vypnutie

Kliknutím na `LET` sa aktivuje pilotný režim.

Po zapnutí:

- nástroj prevezme riadenie kamery,
- natívne pohybové ovládanie Cesium sa dočasne vypne,
- cieľová rýchlosť zostane `0 m/s`,
- let sa nezačne bez vedomého stlačenia šípky hore.

Po vypnutí:

- pohyb sa zastaví,
- rýchlosť sa vynuluje,
- pôvodné ovládanie Cesium sa obnoví,
- prípadný Pointer Lock sa uvoľní.

## 5. Myš ako jeden knipel

Celé letové riadenie myšou sa aktivuje **iba držaním ľavého tlačidla myši**.

| Ovládanie pri držanom ľavom tlačidle | Reakcia letu |
|---|---|
| pohyb myši doľava | náklon vľavo |
| pohyb myši doprava | náklon vpravo |
| pohyb myši od seba | nos dole |
| pohyb myši k sebe | nos hore |
| uvoľnenie ľavého tlačidla | zmena náklonu a pitchu sa zastaví; dosiahnutá orientácia zostane |

Pravé tlačidlo myši nemá v letovom režime žiadnu riadiacu funkciu.

Pri prvom stlačení ľavého tlačidla nad mapou si prehliadač podľa možností aktivuje `Pointer Lock`. Kurzor sa tým prestane opierať o okraje obrazovky a pohyb knipla môže pokračovať plynulo. Kláves `Esc` Pointer Lock uvoľní.

Pracovné limity:

```text
náklon: −72° až +72°
pitch:  −55° až +55°
```

Citlivosť oboch osí je konfigurovateľná:

```js
mouseRollSensitivityDegPx
mousePitchSensitivityDegPx
```

## 6. Základ koordinovanej zatáčky

Náklon nie je iba grafické otočenie obrazu.

Pri nenulovej rýchlosti modul mení aj smer letu podľa základného vzťahu:

```text
uhlová rýchlosť zatáčky ≈ g × tan(náklon) / rýchlosť
```

Výpočet je bezpečnostne obmedzený maximálnou pracovnou uhlovou rýchlosťou. Ide o prvý kinematický základ, nie o úplný aerodynamický model.

## 7. Ovládanie rýchlosti

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

Tieto hodnoty nie sú aerodynamické vlastnosti konkrétneho typu lietadla.

## 8. Pohľad pilota

Pohľad pilota je oddelený od osi letu.

| Kláves | Pohľad kamery |
|---|---|
| `Q` | plynulo vľavo |
| `W` | plynulo vpravo |
| `A` | plynulo dole |
| `D` | plynulo hore |
| `S` | návrat pohľadu dopredu do horizontu |

Klávesy `Q/W/A/D` sa držia. Po ich uvoľnení sa pohyb pohľadu zastaví v dosiahnutej polohe.

Obzretie doľava nemení smer letu a pohľad hore nemení pitch lietadla. Dopredný pohyb sa stále počíta podľa letovej osi.

## 9. Stavové zobrazenie

Pri aktívnom režime sa zobrazí napríklad:

```text
LETOVÝ REŽIM · 54 km/h · cieľ 72 km/h · náklon −24° · pitch +6°
```

Panel obsahuje aj skrátenú nápovedu:

```text
↑/↓ rýchlosť · drž L + myš do strán náklon · myš dopredu/dozadu pitch
```

## 10. Pohyb a ochrana terénu

Letová orientácia je uložená oddelene od pohľadu pilota:

```text
letová orientácia = azimut + pitch + náklon
pohľad pilota = bočná a zvislá odchýlka + vyrovnanie horizontu
```

Pri každom animačnom snímku sa vypočíta:

```text
prejdená vzdialenosť = aktuálna rýchlosť × čas od posledného snímku
```

Ak je v Cesium dostupná výška terénu a nová poloha by klesla pod povrch, kamera sa udrží približne na:

```text
výška terénu + 3 m
```

Táto ochrana nie je model kolízie ani poškodenia.

## 11. Verejné API

Globálne rozhranie:

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

Stav obsahuje rýchlosť, súradnice, letový azimut, pitch, náklon a odchýlku pohľadu pilota.

## 12. Udalosti a komunikácia

Nástroj vysiela DOM udalosť:

```text
termikaxc:flight-state
```

Ak je dostupný univerzálny komunikačný modul, publikuje aj:

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
- 3D kontajner pracoviska.

Voliteľné:

- Kamerový HUD,
- rozšírenie HUD-u o súradnice,
- `TermikaCommunicationTool`,
- spoločná navigácia TermikaXC.

Letové jadro nie je závislé od Windy ani od konkrétneho meteorologického zdroja.

## 14. Obmedzenia aktuálnej verzie

Verzia `1.1.1` ešte nepočíta:

- aerodynamickú poláru,
- klesavosť,
- vztlak a odpor,
- pádovú rýchlosť,
- zmenu energie pri zrýchlení,
- vietor a drift,
- termické stúpania,
- rotor a turbulenciu,
- fyzikálny náraz do terénu.

Rýchlosť je zatiaľ riadená rýchlosť virtuálnej kamery.

## 15. Plánované rozšírenia

1. výber typu lietadla a jeho poláry,
2. vzťah rýchlosť ↔ klesavosť,
3. energetická výmena pri zrýchlení a spomalení,
4. vietor z univerzálneho komunikačného modulu,
5. drift podľa vetra,
6. stúpania a klesania z WIND poľa,
7. variometer,
8. indikovaná a traťová rýchlosť,
9. let po naplánovanej trati,
10. záznam a replay letu.

## 16. Súvisiace súbory

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

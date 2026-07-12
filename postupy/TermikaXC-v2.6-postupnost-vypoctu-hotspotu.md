# TermikaXC v2.6 – postupnosť výpočtu hotspotu

## Účel dokumentu

Tento dokument zachytáva prijatú pracovnú architektúru verzie v2.6 pre vyhľadanie termických hotspotov na skutočnom 3D teréne a pre následné modelovanie stúpavého prúdenia.

Cieľom nie je vložiť do mapy vopred pripravený ukážkový komín. Hotspot musí vzniknúť ako výsledok výpočtu nad reálnym terénom, atmosférickým profilom a časom.

## Základná postupnosť

```text
3D terén Cesium
        ↓
lokálna výšková mriežka
        ↓
sklon a orientácia každej bunky
        ↓
poloha Slnka podľa času letu
        ↓
oslnenie a terénny tieň
        ↓
zdrojové plochy ohriateho vzduchu
        ↓
anabatický transport
        ↓
rebrá, hrany, žľaby a miesta zbiehania
        ↓
kandidáti hotspotov
        ↓
TEMP: vztlak a vertikálny dosah
        ↓
vietor a strih po vrstvách
        ↓
živý 3D stúpavý prúd
```

## Tvrdá zásada v2.6

Najprv sa musí nájsť hotspot z geometrie a fyziky terénu. Až potom sa nad ním vytvorí model stúpavého prúdu.

Nesmie platiť opačný postup, pri ktorom sa do mapy vloží vopred definovaný valec alebo kužeľ a následne sa spätne označí za termiku.

## Nadväznosť na v2.5

Existujúce moduly ostávajú zachované:

- `PilotNetwork` drží IGC, aktuálny index a čas prehrávania, TEMP profil a Cesium viewer;
- `MeteoCore` už obsahuje výpočet LCL, pracovnú dráhu častice, vztlakový základ a drift podľa vetra vo výškových vrstvách;
- `CesiumRender` už vykresľuje letovú stopu, pilota a pracovné termické teleso.

Verzia v2.6 nebude tieto časti prepisovať bez potreby. Doplní samostatné vrstvy analýzy terénu, Slnka, hotspotov a dynamického prúdenia.

## Navrhované moduly

```text
XC/js/
├── terrain-analysis.js
├── solar-model.js
├── hotspot-engine.js
└── thermal-flow-render.js
```

### `terrain-analysis.js`

Prvá úloha v2.6.

Z vybranej oblasti skutočného Cesium terénu vytvorí lokálnu mriežku a pre každú bunku vypočíta najmä:

- zemepisnú polohu;
- nadmorskú výšku;
- sklon;
- azimut svahu;
- lokálne zakrivenie;
- konvexnosť alebo konkávnosť;
- vzťah k rebru, hrane, žľabu alebo sedlu;
- susedné vyššie a nižšie bunky;
- možné smery lokálneho zberu a odtoku vzduchu.

Výstupom nebude ešte hotspot, ale fyzikálna kostra krajiny.

### `solar-model.js`

Pre dátum, čas a polohu vypočíta:

- azimut Slnka;
- výšku Slnka nad horizontom;
- uhol dopadu žiarenia na každú terénnu bunku;
- geometrické oslnenie;
- terénny tieň;
- časový vývoj oslnenia.

### `hotspot-engine.js`

Spojí:

- geometriu terénu;
- orientáciu a sklon;
- oslnenie;
- priestorové rozdiely ohrevu;
- zbernú plochu;
- predpokladaný anabatický transport;
- terénne spúšťače;
- TEMP profil;
- LCL;
- stabilné vrstvy a inverzie;
- vietor podľa výšky.

Výstupom bude zoznam kandidátov hotspotov s vysvetlením, prečo boli vybrané.

Príklad pracovného výstupu:

```text
HOTSPOT H-017
zdrojová oblasť:       14 800 m²
spúšťacie rozhranie:   osvetlený svah / hrebeň rebra
orientácia:            JZ
sklon:                 31°
oslnenie:              vypočítané pre 12:18
tepelný kontrast:      voči okoliu
zber anabatiky:        potvrdený geometriou terénu
LCL:                   2 870 m AMSL
inverzia:              3 420–3 560 m
odhad stúpania:        vypočítaná hodnota
očakávaný dosah:       po stabilnú vrstvu
stav:                  vznikajúci / aktívny / slabnúci
```

### `thermal-flow-render.js`

Nahradí alebo doplní dnešný statický valcový model živým prúdením.

Prúd sa bude zobrazovať animovanými časticami alebo krátkymi vektormi podobne ako zobrazenie vetra vo Windy:

- dĺžka vyjadruje intenzitu;
- rýchlosť pohybu vertikálnu rýchlosť;
- hustota hmotnostný tok alebo aktivitu jadra;
- smer náklonu drift vetrom;
- zmena smeru po výške strih vetra;
- vlnenie turbulenciu a nestálosť;
- rozširovanie entrainment a miešanie s okolím.

Pri slabej termike budú častice kratšie, redšie a pomalšie. Pri silnom jadre budú dlhšie, hustejšie a rýchlejšie.

## Stabilná vrstva – „dekel“

Vertikálny prúd nie je súvislý objekt a nesmie sa automaticky predĺžiť až po základňu oblakov.

Vývoj sa musí počítať po atmosférických vrstvách. Pri dosiahnutí stabilnej vrstvy, inverzie alebo výrazného rozhrania môže dôjsť k:

- prudkému zoslabeniu vertikálneho pohybu;
- rozliatiu prúdu do strán;
- hromadeniu vzduchu pod vrstvou;
- pulzovaniu;
- lokálnemu prerazeniu vrstvy;
- turbulentným okrajom;
- vzniku kompenzačných zostupov;
- zániku samostatného jadra.

Vo vizualizácii sa to prejaví tak, že častice pred vrstvou stúpajú rýchlo, pri vrstve sa skracujú a spomaľujú, časť sa rozbieha horizontálne, časť zaniká a iba niektoré pulzy pokračujú vyššie.

## Stav dát a poctivosť výstupu

Systém si nesmie potichu vymýšľať chýbajúce vstupy.

Pri každom výsledku sa musí evidovať pôvod údajov:

- merané;
- modelová analýza;
- archív predpovede;
- interpolované;
- odvodené výpočtom;
- nezadané alebo nedostupné.

Ak chýba napríklad typ povrchu, oblačný tieň alebo HFX, výsledok sa označí ako neúplný terénno-radiačný odhad, nie ako úplný povrchovo-atmosférický model.

## Prvá etapa implementácie

Prvým konkrétnym cieľom v2.6 je:

> Naučiť TermikaXC čítať tvar skutočného terénu tak, ako ho číta pilot.

Postup:

1. vybrať pracovnú oblasť okolo letu alebo zvoleného bodu;
2. vzorkovať reálnu výšku Cesium terénu do lokálnej mriežky;
3. vypočítať sklon a orientáciu každej bunky;
4. identifikovať základné terénne tvary;
5. zobraziť diagnostickú vrstvu nad mapou;
6. až po overení geometrie doplniť Slnko a oslnenie.

## Pracovný záver

SoaringMeteo môže zostať regionálnou referenčnou a porovnávacou vrstvou. Nemá nahradiť vlastnú fyziku TermikaXC ani generovať lokálne hotspoty.

TermikaXC má ísť od regionálnej atmosféry k detailnému terénu, oslneniu, lokálnemu prúdeniu, miestu odtrhnutia a následne k vrstvenému 3D vývoju termického prúdu.

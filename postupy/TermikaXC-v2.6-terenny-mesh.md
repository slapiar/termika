# TermikaXC v2.6 – terénny mesh ako výpočtová kostra krajiny

## 1. Účel

TermikaXC už nepracuje iba s nepopísaným oblakom výškových bodov. Každá bunka geometrickej analýzy pozná polohu, nadmorskú výšku, sklon, orientáciu, krivosť, lokálnu geometriu, pracovnú farebnú rodinu a postupne aj morfologickú rolu širšieho terénneho celku.

Ďalším prirodzeným krokom je doplniť medzi body topológiu:

```text
body
→ hrany medzi susedmi
→ trojuholníkové plochy
→ súvislý 3D terénny mesh
```

Terénny mesh nemá byť iba grafickou drôtenou vizualizáciou. Má sa stať spoločnou výpočtovou kostrou pre:

- energetickú bilanciu povrchu,
- výpočet skutočných 3D plôch,
- normálové vektory a uhol dopadu slnečných lúčov,
- transport energie a ohriateho vzduchu medzi susednými plochami,
- geometrické zlomy a zmeny smeru povrchu,
- zbiehanie, rozbiehanie a odtrhnutie prízemného prúdenia,
- neskoršie adaptívne zahusťovanie a zjednodušovanie siete.

## 2. Základný dátový model

Výsledok modulu má mať tri hlavné skupiny prvkov:

```js
terrainMesh = {
    vertices: [],
    edges: [],
    faces: [],
    summary: {}
};
```

### 2.1 Vrchol siete – vertex

Vrchol siete odkazuje na existujúcu analyzovanú bunku. Nemá duplikovať fyzikálne údaje bez potreby; má niesť stabilné ID a väzbu na zdrojovú bunku.

```js
vertex = {
    id: "v:12:18",
    row: 12,
    col: 18,
    lat: 46.430123,
    lon: 11.850456,
    eastM: 120,
    northM: 80,
    heightM: 1842.6,
    cell: sourceCell
};
```

### 2.2 Trojuholníková plocha – face

Každý trojuholník je malá fyzikálna plocha terénu.

```js
face = {
    id: "f:128",
    vertexIds: ["v:12:18", "v:12:19", "v:13:19"],
    area3DM2: 812.4,
    areaHorizontalM2: 746.8,
    centroid: {
        eastM: 133.3,
        northM: 93.3,
        heightM: 1847.1
    },
    normal: {
        east: 0.31,
        north: -0.47,
        up: 0.83
    },
    slopeDeg: 33.9,
    aspectDeg: 146.7,
    edgeIds: [],
    neighborFaceIds: []
};
```

Neskôr sa na plochu doplnia energetické veličiny, napríklad:

```js
energy = {
    solarIncidence: 0.91,
    incomingShortwaveWm2: 780,
    absorbedShortwaveWm2: 624,
    emittedLongwaveWm2: 0,
    sensibleHeatFluxWm2: 0,
    groundHeatFluxWm2: 0,
    accumulatedEnergyJ: 0
};
```

### 2.3 Hrana – edge

Hrana spája dva vrcholy a pozná jednu alebo dve susedné plochy.

```js
edge = {
    id: "e:v:12:18|v:13:19",
    vertexIds: ["v:12:18", "v:13:19"],
    faceIds: ["f:128", "f:129"],
    length3DM: 42.7,
    lengthHorizontalM: 40.0,
    dihedralDeg: 38.4,
    breakStrength: 0.78,
    boundary: false
};
```

Neskôr sa na hranu doplní morfologický a dynamický význam:

```js
flowEffect = {
    role: "HORNÁ_HRANA",
    convergence: 0.63,
    divergence: 0.08,
    separationPotential: 0.81,
    preferredFlowDeflection: null
};
```

## 3. Fyzikálny význam plôch

Energia nedopadá na bod, ale na plochu. Mesh preto umožní počítať energetickú bilanciu prirodzenejšie než samostatné bodové hodnotenie.

Pre každú plochu bude možné určiť:

- skutočnú 3D plochu,
- horizontálnu projekciu,
- normálový vektor,
- sklon a orientáciu,
- uhol dopadu slnečných lúčov,
- zatienenie okolitým terénom,
- typ povrchového krytu,
- albedo, emisivitu, tepelnú kapacitu a vodivosť,
- okamžitý energetický tok,
- akumulovanú energiu za zvolený čas.

Pracovný princíp:

```text
energia plochy
=
skutočná plocha
× dopadajúce žiarenie
× absorpcia povrchu
× čas
− energetické straty
```

## 4. Fyzikálny význam hrán

Hrana nesie informáciu o zmene geometrie medzi susednými plochami.

Z rozdielu normálových vektorov možno vypočítať priestorový, dihedrálny uhol. Ten je číselným podkladom pre:

- plynulý prechod svahu,
- hrebeň alebo rebro,
- hornú hranu,
- dolnú hranu,
- žľab,
- ostrý zlom,
- stenu.

Hrana sa neskôr použije pri výpočte povrchového prúdenia:

- zmena smeru prúdu pri prechode na susednú plochu,
- geometrické stlačenie alebo rozšírenie prúdnic,
- zbiehanie a rozbiehanie,
- zvýšenie pravdepodobnosti odtrhnutia pri ostrej hrane,
- mechanické oddelenie prúdu od podložia,
- väzba na smer vetra a anabatický transport.

## 5. Triangulácia pravidelnej mriežky

Každý štvoruholník štyroch susedných bodov možno rozdeliť dvoma spôsobmi:

```text
A ───── B       A ───── B
│ \     │       │     / │
│   \   │       │   /   │
C ───── D       C ───── D
```

Diagonála sa nesmie voliť bezmyšlienkovite vždy rovnakým smerom. Má sa vyberať podľa geometrickej kontinuity.

V etape M1 sa použije pracovné pravidlo:

- porovnať výškový rozdiel koncových bodov oboch diagonál,
- porovnať podobnosť lokálnej geometrie ich koncových bodov,
- uprednostniť diagonálu, ktorá lepšie spája podobnú výšku a podobný geometrický charakter,
- uložiť skóre a dôvod rozhodnutia pre diagnostiku.

Tým sa už základná triangulácia snaží viesť hrany po prirodzených líniách reliéfu.

V etape M2 sa rozhodovanie doplní o konečnú morfologickú rolu B:

- zachovať hrebeň a rebro ako súvislú hranu siete,
- zachovať os žľabu a doliny,
- nevyhladiť horné a dolné zlomy,
- rešpektovať steny a výrazné rozhrania,
- využívať kontinuitu morfologických línií vo väčšom okolí.

## 6. Etapa M1 – základný terénny mesh

### Cieľ

Vytvoriť výpočtovo použiteľnú trojuholníkovú sieť bez zmeny dnešnej geometrickej klasifikácie a farebného dizajnu.

### Výstupy

- `XC/js/terrain-mesh.js`,
- samostatný modul `mesh` so závislosťou od `geometry`,
- pole `vertices`,
- pole `faces`,
- pole `edges`,
- výpočet normál, plôch, sklonu a orientácie každej plochy,
- výpočet dĺžok hrán a dihedrálneho uhla medzi susednými plochami,
- pracovná intenzita geometrického rozhrania,
- voliteľný drôtený model v Cesium,
- diagnostický súhrn počtu vrcholov, hrán, plôch a celkovej 3D plochy.

### Kritériá hotovo

1. Mesh sa vytvorí iba z platných susedných bodov analyzovanej kruhovej oblasti.
2. Každá plocha má kladnú normálu smerujúcu nahor.
3. Súčet 3D plôch je väčší alebo rovný súčtu horizontálnych projekcií.
4. Každá vnútorná hrana pozná dve susedné plochy.
5. Hraničná hrana pozná jednu plochu a má `boundary: true`.
6. Drôtený model možno samostatne zobraziť a skryť.
7. Vypnutie mesh vrstvy nemení dnešné farby ani výsledky geometrie A a morfológie B.
8. Diagnostika jasne označuje, že morfologický význam hrán je zatiaľ pracovný.

## 7. Etapa M2 – morfologicky viazaný adaptívny mesh

Po stabilizácii vrstvy B sa doplní:

- vedenie triangulácie podľa hrebeňov, rebier, žľabov a dolín,
- ochrana zlomov pred vyhladením,
- zahusťovanie siete v členitom teréne,
- zjednodušovanie veľkých rovinných a plynulých plôch,
- väzba hrán na morfologické rozhrania,
- výpočet `hRel`, `dRel`, `ridgeRel`, `valleyRel` a `scaleRel` na sieťových prvkoch.

## 8. Miesto v celkovom výpočtovom reťazci

```text
3D terén Cesium
        ↓
výškové body a lokálna geometria A
        ↓
morfologická rola B
        ↓
terénny mesh: vrcholy + hrany + plochy
        ↓
energia každej plochy
        ↓
povrchové vektory ohriateho vzduchu
        ↓
transport medzi susednými plochami
        ↓
zbiehanie, rozbiehanie a geometrická indukcia na hranách
        ↓
kritické miesta akumulácie a odtrhnutia
        ↓
hotspot
        ↓
vrstvový model atmosféry a živý 3D prúd
```

## 9. Zásady

1. Mesh nesmie meniť zdrojové výšky Cesium terénu.
2. Mesh nesmie predstierať energetické hodnoty, kým nie sú dostupné Slnko, povrch a fyzikálne parametre.
3. Dihedrálny uhol je geometrická veličina; sám osebe ešte nie je definitívnou morfologickou rolou ani dôkazom odtrhnutia prúdu.
4. Všetky odvodené hodnoty musia mať uvedenú metódu a pôvod `ODVODENÉ VÝPOČTOM`.
5. Drôtené zobrazenie je diagnostická vrstva. Hlavnou hodnotou meshu je jeho výpočtová topológia.
6. Etapa M1 nesmie zablokovať ani predbiehať dokončenie morfologickej vrstvy B; pripravuje spoločnú kostru, na ktorú sa B následne presnejšie naviaže.

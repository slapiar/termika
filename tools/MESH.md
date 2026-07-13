# Terénny mesh – drôt a plošná výplň

## 1. Účel

Terénny mesh premieňa analyzované výškové body na súvislú topologickú kostru:

```text
body
→ hrany
→ trojuholníkové plochy
→ súvislý 3D model terénu
```

Drôtený model zobrazuje hrany a geometrické rozhrania. Plošná vrstva M1.2 vypĺňa trojuholníkové plochy dominantnou farebnou rodinou okolitého terénu alebo jednotnou šedou farbou.

Mesh je určený na budúce výpočty plôch, normálových vektorov, energetickej bilancie a dynamických účinkov zlomov na prúdenie.

## 2. Identita a stav

| Položka | Hodnota |
|---|---|
| ID drôteného nástroja | `mesh-viewer` |
| ID plošnej vrstvy | `mesh-surface` |
| Stav | `ROZPRACOVANÉ` – implementované, čaká na používateľské overenie |
| Drôtená implementácia | `XC/js/terrain-mesh.js` |
| Plošná implementácia | `XC/js/terrain-mesh-surface.js` |
| Verzia plošnej vrstvy | `2.6.0-m1.2-surface.1` |
| Oblasť použitia | testovacia 3D analýza terénu |

## 3. Ovládacie prvky

V časti **Analytické vrstvy** sú dostupné:

```text
☑ Terénny mesh M1
☑ Plošná výplň meshu M1.2
```

Prvý modul vytvorí vrcholy, hrany a trojuholníkové plochy. Druhý dopočíta dominantnú farebnú rodinu širšieho okolia každej plochy.

V časti **Mapové vrstvy** sú dostupné:

```text
☑ Zobraziť drôtený model
☐ Vyplniť plochy meshu
Farba výplne: Dominantná G01–G16 / Jednotná šedá
```

Drôt a výplň možno zapínať nezávisle.

## 4. Drôtený model

Drôtený model zobrazuje všetky hrany trojuholníkovej siete.

Pracovná farebná logika hrán:

- azúrová – plynulejší geometrický prechod,
- žltá – výraznejšie rozhranie,
- oranžová – silné geometrické rozhranie.

Farba hrany je odvodená od zmeny normálových vektorov susedných plôch a od lokálnej intenzity zlomu. Zatiaľ ešte nejde o konečný morfologický význam typu hrebeň, horná hrana alebo žľab.

## 5. Dominantná farebná výplň

Režim **Dominantná G01–G16** určuje pre každý trojuholník prevládajúcu farebnú rodinu v jeho bezprostrednom okolí.

Používa sa pracovná metóda:

```text
ONE_RING_DOMINANT_FAMILY_V1
```

Postup:

1. tri vrcholy plochy majú váhu `3`,
2. unikátne susedné body v okolí jedného kroku mriežky majú váhu `1`,
3. sčítajú sa váhy jednotlivých rodín G01–G16,
4. vyberie sa rodina s najvyššou váhou,
5. pri zhode rozhoduje väčšia váha vlastných vrcholov, potom počet vzoriek a stabilné ID rodiny.

Každá plocha si ukladá:

```js
face.surfaceFill = {
    family: "G10",
    familyName: "Žľab / zbernica",
    baseHex: "#00B7FF",
    confidence: 0.68,
    sampleCount: 7,
    method: "ONE_RING_DOMINANT_FAMILY_V1"
};
```

Používa sa základná farba rodiny, nie individuálne vytieňovaný odtieň každého bodu. Susedné trojuholníky rovnakej rodiny preto opticky vytvoria väčšie celistvé farebné oblasti.

## 6. Jednotná šedá výplň

Režim **Jednotná šedá** vykreslí všetky plochy rovnakou neutrálnou šedou farbou.

Je vhodný na:

- kontrolu samotného tvaru meshu,
- čítanie reliéfu bez vplyvu klasifikačných farieb,
- kontrolu zlomov pomocou drôteného modelu,
- budúce porovnanie s energetickými alebo meteorologickými vrstvami.

Pracovná farba:

```text
#858B91
```

## 7. Celistvé plochy a mnohouholníky

Aktuálna verzia vytvára **vizuálne súvislé oblasti**, nie ešte topologicky zlúčené mnohouholníky.

To znamená:

- fyzikálnou jednotkou zostáva trojuholník,
- susedné trojuholníky rovnakej rodiny sa bez drôtu opticky spoja,
- hranice medzi rodinami vytvoria nepravidelné farebné oblasti,
- veľké oblasti môžu obsahovať malé ostrovy alebo jednotlivé odlišné bunky.

Budúca etapa môže zoskupiť susedné plochy rovnakej morfologickej a farebnej triedy do skutočných mnohouholníkov. Také zlúčenie však nesmie zničiť pôvodnú trojuholníkovú sieť potrebnú pre fyzikálne výpočty.

## 8. Odporúčaný pracovný postup

Pre kontrolu celistvých oblastí:

1. vykonaj analýzu s modulmi `mesh` a `mesh-surface`,
2. zapni `Vyplniť plochy meshu`,
3. ponechaj režim `Dominantná G01–G16`,
4. podľa potreby vypni farebné body,
5. vypni drôtený model, aby vynikli celistvé oblasti,
6. vypni základnú mapu Cesium, ak chceš posudzovať iba naše analytické vrstvy.

Pre kontrolu čistej geometrie:

1. zvoľ `Jednotná šedá`,
2. zapni drôtený model,
3. podľa potreby skry podkladovú mapu a farebné body.

## 9. Výškové usporiadanie vrstiev

Diagnostické vrstvy sú mierne odsadené nad 3D reliéf, aby sa obmedzilo preblikávanie plôch:

```text
terén Cesium
→ plošná výplň meshu
→ farebné body
→ drôtené hrany
```

Výplň nepoužíva picking a nemá blokovať kliknutie na farebné body ani výber terénu.

## 10. Diagnostika

Po kliknutí na bod pribudne karta **Plošná výplň meshu M1.2**.

Zobrazuje:

- dominantnú rodinu incidentných plôch,
- priemernú dôveru dominantnej klasifikácie,
- aktuálny režim výplne,
- použitú metódu,
- upozornenie, že topologické zlučovanie mnohouholníkov ešte nie je aktívne.

## 11. Verejné programové rozhranie

Plošný modul zverejňuje:

```js
window.TerrainMeshSurface = {
    VERSION,
    METHOD,
    FILL_METHOD,
    assignDominantFill,
    render,
    clear,
    setVisible,
    setMode,
    get visible() {},
    get mode() {},
    get primitive() {},
    get mesh() {}
};
```

Príklady:

```js
TerrainMeshSurface.setVisible(true);
TerrainMeshSurface.setMode("dominant");
TerrainMeshSurface.setMode("gray");
TerrainMeshSurface.setVisible(false);
```

## 12. Obmedzenia aktuálnej verzie

1. Farebná rodina je stále pracovná vrstva založená na lokálnej geometrii A a doterajšom kandidátovi; finálna morfologická rola B ešte nie je uzavretá.
2. Súvislé farebné oblasti ešte nie sú zlučované do jedného topologického mnohouholníka.
3. Výplň zatiaľ nepoužíva skutočné `hRel` a `dRel`.
4. Pri veľmi hustej mriežke môže vykreslenie tisícov plôch zvýšiť nároky na GPU.
5. Farebná výplň je diagnostická vizualizácia a zatiaľ nie energetická mapa.

## 13. Plánované rozšírenia

- väzba dominantnej výplne na finálnu morfologickú rolu B,
- zobrazenie skutočného výškového tieňovania,
- topologická agregácia susedných plôch do mnohouholníkov,
- zachovanie hrebeňov, žľabov a zlomov ako pevných hraníc oblastí,
- výplň podľa oslnenia,
- výplň podľa okamžitej a akumulovanej energie,
- výplň podľa konvergencie, divergencie a potenciálu odtrhnutia prúdu.

## 14. Súvisiace súbory

- [`../TOOLS.md`](../TOOLS.md)
- [`../XC/js/terrain-mesh.js`](../XC/js/terrain-mesh.js)
- [`../XC/js/terrain-mesh-surface.js`](../XC/js/terrain-mesh-surface.js)
- [`../postupy/TermikaXC-v2.6-terenny-mesh.md`](../postupy/TermikaXC-v2.6-terenny-mesh.md)
- [`../postupy/TermikaXC-v2.6-terenny-mesh-M1.2-vypln.md`](../postupy/TermikaXC-v2.6-terenny-mesh-M1.2-vypln.md)
- [`../CHANGELOG.md`](../CHANGELOG.md)
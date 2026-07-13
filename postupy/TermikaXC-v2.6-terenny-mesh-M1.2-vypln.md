# TermikaXC v2.6 – terénny mesh M1.2: plošná výplň

## 1. Rozhodnutie

Terénny mesh M1 sa rozširuje o samostatnú vrstvu M1.2, ktorá umožní zobraziť trojuholníkové plochy ako súvislý farebný alebo šedý povrch.

Rozšírenie zostáva oddelené od drôteného rendereru:

```text
terrain-mesh.js
→ topológia, plochy, hrany, normály a drôt

terrain-mesh-surface.js
→ dominantná alebo šedá plošná výplň
```

Tým sa zachová modularita a plošný renderer možno neskôr nahradiť alebo rozšíriť bez zásahu do výpočtovej kostry meshu.

## 2. Cieľ

Z množstva podrobne klasifikovaných bodov vytvoriť vizuálne celistvé oblasti, ktoré umožnia:

- čítať súvislé terénne celky,
- odhaliť ostrovy a malé odlišné oblasti,
- posudzovať stabilitu klasifikácie pri zmene hustoty bodov,
- pripraviť plošný podklad pre energetickú bilanciu,
- pripraviť rozhrania pre dynamickú indukciu prúdenia.

## 3. Dominantná rodina plochy

Každý trojuholník dostane dominantnú farebnú rodinu G01–G16.

Používa sa pracovná metóda:

```text
ONE_RING_DOMINANT_FAMILY_V1
```

Vstupy:

- tri vrcholy plochy,
- unikátne body v bezprostrednom okolí jedného kroku mriežky.

Váhy:

```text
vrchol plochy = 3
susedný bod    = 1
```

Víťazná rodina sa určí podľa:

1. najvyššieho súčtu váh,
2. vyššej váhy vlastných vrcholov,
3. vyššieho počtu podporných vzoriek,
4. stabilného ID rodiny pri úplnej zhode.

Výsledok sa uloží do:

```js
face.surfaceFill = {
    method: "ONE_RING_DOMINANT_FAMILY_V1",
    family: "G10",
    familyName: "Žľab / zbernica",
    baseHex: "#00B7FF",
    confidence: 0.68,
    sampleCount: 7,
    scores: {}
};
```

## 4. Farebný režim

Režim `dominant` používa základnú farbu víťaznej rodiny G01–G16.

Dôvod:

- susedné plochy rovnakej rodiny majú rovnaký základný odtieň,
- plochy sa preto opticky spájajú do väčších celkov,
- individuálne bodové tieňovanie zatiaľ nevytvára šum v plošnej agregácii.

Skutočné výškové tieňovanie sa doplní až po výpočte morfologickej roly B, `hRel` a `dRel`.

## 5. Šedý režim

Režim `gray` používa jednotnú pracovnú farbu:

```text
#858B91
```

Je určený na kontrolu:

- čistého tvaru siete,
- normál a zlomov,
- vplyvu drôtených hrán,
- geometrie bez klasifikačnej farby.

## 6. Vizuálne a topologické spojenie

M1.2 zatiaľ nevytvára skutočné zlúčené mnohouholníky.

Aktuálny stav:

```text
rovnaká rodina susedných trojuholníkov
→ rovnaká farba
→ vizuálne súvislá oblasť
```

Budúca etapa:

```text
susedné plochy rovnakej morfologickej roly
+ zachované hrebeňové, žľabové a zlomové hranice
→ topologická agregácia
→ skutočný mnohouholník oblasti
```

Pôvodné trojuholníky sa nesmú zrušiť, pretože zostávajú základnou fyzikálnou jednotkou pre plochu, normálu, oslnenie a energetickú bilanciu.

## 7. Vrstvenie v 3D

Pracovné poradie nad reliéfom:

```text
3D terén Cesium
→ plošná výplň meshu
→ farebné diagnostické body
→ drôtené hrany
```

Výplň je mierne odsadená nad reliéf a má vypnutý picking, aby neblokovala diagnostiku bodov ani výber terénu.

## 8. Ovládanie

Analytický modul:

```text
☑ Plošná výplň meshu M1.2
```

Mapové ovládanie:

```text
☐ Vyplniť plochy meshu
Farba výplne: Dominantná G01–G16 / Jednotná šedá
```

Výpočet dominantnej rodiny a samotná viditeľnosť sú oddelené.

## 9. Väzba na podkladovú mapu

Súčasne vzniká samostatný nástroj na vypnutie základnej obrazovej mapy Cesium.

Pri vypnutej obrazovej vrstve zostáva zachovaný 3D reliéf. To umožní posudzovať iba:

- naše farebné plochy,
- drôt,
- body,
- vrstevnice,
- budúce fyzikálne vrstvy.

## 10. Kritériá hotovo

1. Plošná vrstva je samostatný modul a nemení topológiu meshu M1.
2. Každá platná plocha má dominantnú rodinu a mieru dôvery.
3. Výplň možno zapnúť a vypnúť nezávisle od drôtu.
4. Farebný režim používa dominantnú rodinu G01–G16 širšieho okolia.
5. Šedý režim používa jednu neutrálnu farbu pre celý mesh.
6. Výplň neblokuje picking farebných bodov.
7. Diagnostika bodu zobrazuje dominantnú rodinu incidentných plôch a dôveru.
8. Dokumentácia výslovne odlišuje vizuálne spojenie od topologickej agregácie.

## 11. Ďalší krok

Po používateľskom overení M1.2 pokračovať vo vrstve B a následne pripraviť M2:

- morfologicky viazané hranice,
- ochrana hrebeňov a žľabov,
- topologická agregácia plôch,
- zachovanie fyzikálnej trojuholníkovej kostry pod agregovanými mnohouholníkmi.

## 12. Súvisiace súbory

- `XC/js/terrain-mesh.js`
- `XC/js/terrain-mesh-surface.js`
- `XC/js/terrain-basemap-visibility.js`
- `tools/MESH.md`
- `tools/BASEMAP.md`
- `TOOLS.md`
- `CHANGELOG.md`
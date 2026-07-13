# TermikaXC v2.6.11 – oprava release verzie a plošného rendereru meshu

## 1. Dôvod opravy

Prvé používateľské overenie po release odhalilo dve chyby:

1. hlavička ovládacieho panela nezobrazila verziu, ale časť HTML dokumentu,
2. plošná výplň terénneho meshu sa nezobrazila.

Snímka obrazovky potvrdila, že pôvodný klientský pokus o načítanie `../RELEASE_VERSION` dostal HTML odpoveď. Pôvodná normalizácia bola príliš benevolentná a odstránením nepovolených znakov z HTML vytvorila dlhý neplatný reťazec.

## 2. Oprava zobrazenia release verzie

Pribudol serverový endpoint:

```text
XC/release-version.php
```

Endpoint:

- číta `RELEASE_VERSION` priamo zo súborového systému servera,
- vracia `Content-Type: text/plain`,
- zakazuje cache,
- prijíma iba prísny formát verzie typu `2.6.11` alebo verziu s platným doplnkovým označením,
- pri chýbajúcom alebo neplatnom súbore vráti chybu namiesto HTML stránky.

Nástroj `terrain-release-badge.js` používa endpoint `release-version.php` a pred zápisom do hlavičky vykoná druhú prísnu validáciu. HTML ani iný ľubovoľný text už nemožno zobraziť ako release verziu.

## 3. Oprava plošného rendereru meshu

Pôvodný renderer používal všeobecnú `Cesium.PolygonGeometry` vytváranú asynchrónne.

Pre M1.2 sa zavádza renderer:

```text
COPLANAR_TRIANGLE_PRIMITIVE_V2
```

Každá plocha meshu je trojuholník, a teda presne rovinná plocha. Nový renderer preto používa:

```js
Cesium.CoplanarPolygonGeometry.fromPositions(...)
Cesium.CoplanarPolygonGeometry.createGeometry(...)
```

Geometrie sa vytvárajú synchronne ešte pred pridaním primitívy do scény. Tým sa chyba prejaví okamžite a možno ju priamo zobraziť používateľovi.

Výplň naďalej:

- nemení vrcholy, hrany ani fyzikálnu topológiu meshu,
- používa dominantnú rodinu G01–G16 alebo jednotnú šedú,
- zostáva samostatne zapínateľná,
- nepoužíva picking.

## 4. Stavová diagnostika

Pod voľbou farby výplne pribudol stavový riadok. Môže zobraziť napríklad:

```text
Výplň: čaká na výpočet meshu.
Výplň: pripravených 548 plôch · zapni zobrazenie.
Výplň: 548 / 548 plôch · G01–G16
Výplň: zobrazená · 548 plôch
Výplň: chyba · <text chyby>
```

Do diagnostiky bodu pribudli:

- počet vykreslených a očakávaných plôch,
- stav rendereru,
- názov použitého rendereru.

Verejné rozhranie `TerrainMeshSurface` sprístupňuje aj:

```js
TerrainMeshSurface.renderState
```

## 5. Verzie opravených nástrojov

- `terrain-release-badge.js`: `1.0.1`
- `terrain-mesh-surface.js`: `2.6.0-m1.2-surface.2`
- plošný renderer: `COPLANAR_TRIANGLE_PRIMITIVE_V2`

## 6. Test po nasadení

1. vykonať tvrdé obnovenie `Ctrl + F5`,
2. overiť hlavičku `TermikaXC v2.6.11 · modulárna analýza terénu`,
3. spustiť analýzu s modulmi `mesh` a `mesh-surface`,
4. sledovať stavový riadok výplne,
5. zapnúť `Vyplniť plochy meshu`,
6. overiť oba režimy `Dominantná G01–G16` a `Jednotná šedá`,
7. pri chybe odovzdať presný text zo stavového riadka.

# Prepínač základnej mapy Cesium

## 1. Účel

Nástroj umožňuje vypnúť obrazovú podkladovú mapu Cesium bez vypnutia 3D reliéfu, kamery alebo analytických vrstiev TermikaXC.

Je určený najmä na čisté skúmanie:

- farebných bodov geometrie,
- vrstevníc,
- drôteného meshu,
- dominantnej alebo šedej plošnej výplne,
- budúcich energetických a meteorologických vrstiev.

## 2. Identita a stav

| Položka | Hodnota |
|---|---|
| ID nástroja | `basemap-visibility` |
| Názov | Prepínač základnej mapy Cesium |
| Stav | `ROZPRACOVANÉ` – implementované, čaká na používateľské overenie |
| Verzia | `1.0.0` |
| Implementácia | `XC/js/terrain-basemap-visibility.js` |
| Oblasť použitia | testovacia 3D analýza terénu |
| Predvolené správanie | základná mapa zapnutá |

## 3. Ovládanie

V časti **Mapové vrstvy** je prepínač:

```text
☑ Zobraziť základnú mapu Cesium
```

### Vypnutie

Zruš zaškrtnutie.

Nástroj:

- skryje aktuálne obrazové vrstvy v `viewer.imageryLayers`,
- ponechá zapnutý 3D glóbus a terén,
- nastaví neutrálne tmavé pozadie glóbusu,
- nemení polohu ani orientáciu kamery,
- nemení výsledky analýzy.

### Zapnutie

Prepínač znovu zaškrtni.

Nástroj obnoví predchádzajúci stav obrazových vrstiev a pôvodnú základnú farbu glóbusu.

## 4. Dôležité rozlíšenie

Nástroj nevypína 3D terén.

```text
vypnutá základná mapa
≠
vypnutý reliéf
```

Zostávajú zachované:

- výšky terénu,
- perspektíva 3D reliéfu,
- navigácia kamery,
- geometrické body,
- vrstevnice,
- mesh,
- HUD,
- diagnostika.

Skryje sa iba obrazový podklad, napríklad satelitná alebo mapová vrstva zvolená v Cesium.

## 5. Správanie pri zmene podkladu

Ak používateľ počas vypnutej základnej mapy zvolí v Cesium inú obrazovú vrstvu, nástroj novú vrstvu zachytí a ponechá ju skrytú.

Po opätovnom zapnutí sa vrstva zobrazí.

## 6. Verejné programové rozhranie

```js
window.TerrainBasemapVisibility = {
    VERSION,
    install,
    bindViewer,
    setVisible,
    apply,
    destroy,
    get visible() {},
    get viewer() {}
};
```

Príklady:

```js
TerrainBasemapVisibility.setVisible(false);
TerrainBasemapVisibility.setVisible(true);
```

## 7. Odporúčané použitie

### Farebné celistvé plochy

```text
základná mapa: vypnutá
farebné body: podľa potreby
výplň meshu: zapnutá
režim: Dominantná G01–G16
 drôt: vypnutý alebo zapnutý podľa skúmania
```

### Čistý geometrický model

```text
základná mapa: vypnutá
výplň meshu: zapnutá
režim: Jednotná šedá
 drôt: zapnutý
```

## 8. Obmedzenia

1. Nástroj prepína obrazové vrstvy Cesium ako celok; zatiaľ nemá samostatný zoznam viacerých podkladových vrstiev.
2. Neovláda analytické vrstvy TermikaXC.
3. Neovláda viditeľnosť samotného 3D glóbusu.
4. Stav viditeľnosti sa zatiaľ neukladá medzi reláciami.
5. Nástroj ešte nie je registrovaný v budúcom `TermikaToolCore`.

## 9. Súvisiace súbory

- [`../TOOLS.md`](../TOOLS.md)
- [`../XC/js/terrain-basemap-visibility.js`](../XC/js/terrain-basemap-visibility.js)
- [`MESH.md`](MESH.md)
- [`../CHANGELOG.md`](../CHANGELOG.md)
# Kamerový HUD

## 1. Účel

Kamerový HUD je priehľadný prístrojový doplnok nad 3D scénou Cesium. Poskytuje okamžitú orientáciu pri pohybe v teréne a vytvára spoločný vizuálny základ pre budúce meteorologické a letové údaje.

HUD nemení geometriu terénu, morfologickú klasifikáciu, farebný dizajn, mesh ani výsledky analýzy. Iba zobrazuje aktuálny stav 3D kamery a dostupnú odvodenú výšku nad terénom.

## 2. Identita a stav

| Položka | Hodnota |
|---|---|
| ID nástroja | `camera-hud` |
| Názov | Kamerový HUD |
| Stav | `OVERENÉ` |
| Aktuálna implementačná verzia | `2.6.0-camera-hud.1` |
| Implementácia | `XC/js/terrain-camera-hud.js` |
| Aktuálna oblasť použitia | `terrain-test` |
| Budúca oblasť použitia | hlavné 3D pracovisko, meteo pracovisko, plánovanie letu, replay |
| Predvolené správanie | zapnutý |

Prvé používateľské overenie prebehlo 13. 7. 2026 pri pohybe v reálnej 3D scéne. Vizuálna koncepcia bola prijatá bez požiadavky na korekciu a používateľ ju zhodnotil slovami:

> „Ako v lietadle.“

## 3. Kde sa HUD zobrazuje

HUD je aktuálne dostupný na samostatnej testovacej stránke analýzy terénu:

```text
XC/terrain-analysis-test.php
```

Zobrazuje sa priamo nad 3D scénou Cesium. Plávajúce ovládacie a diagnostické okná zostávajú nad ním.

HUD má nastavené:

```css
pointer-events: none;
```

Preto neblokuje:

- otáčanie kamery,
- približovanie a odďaľovanie,
- nakláňanie pohľadu,
- výber bodov v teréne,
- diagnostiku buniek,
- ovládanie Cesium mapy.

## 4. Zapnutie a vypnutie

V ovládacom paneli v časti mapových vrstiev je prepínač:

```text
☑ Zobraziť HUD kamery
```

### Zapnutie

Zaškrtni prepínač `Zobraziť HUD kamery`.

HUD sa okamžite zobrazí a začne aktualizovať údaje podľa aktuálnej polohy a orientácie kamery.

### Vypnutie

Zruš zaškrtnutie prepínača.

HUD sa skryje bez zmeny analytických výsledkov a bez vypnutia iných vrstiev.

Vypnutie HUD-u nemení:

- farebné body,
- vrstevnice,
- morfológiu,
- drôtený model,
- diagnostiku,
- polohu kamery.

## 5. Prvky HUD-u

HUD pozostáva zo štyroch hlavných skupín prvkov:

1. vodorovné smerové pravítko,
2. zvislé pravítko vertikálneho uhla,
3. živé číselné údaje,
4. stredový zameriavací prvok.

## 6. Vodorovné smerové pravítko

### 6.1 Účel

Vodorovné pravítko zobrazuje azimut smeru pohľadu kamery.

Hlavný údaj má tvar:

```text
AZIMUT 126,4° · JV
```

Zobrazuje:

- číselný azimut v stupňoch,
- slovné označenie najbližšej svetovej strany.

### 6.2 Konvencia azimutu

| Azimut | Smer |
|---:|---|
| `0°` alebo `360°` | sever – `S` |
| `45°` | severovýchod – `SV` |
| `90°` | východ – `V` |
| `135°` | juhovýchod – `JV` |
| `180°` | juh – `J` |
| `225°` | juhozápad – `JZ` |
| `270°` | západ – `Z` |
| `315°` | severozápad – `SZ` |

### 6.3 Mierka pravítka

Aktuálne nastavenie:

- rozsah približne `±40°` od stredu pohľadu,
- pomocná značka každých `5°`,
- číselné označenie každých `10°`,
- zvýraznené svetové strany po `45°`,
- pevný stredový index ukazuje aktuálny smer pohľadu.

Pravítko sa plynulo posúva pri otáčaní kamery.

Prechod cez sever je kruhový. Pri zmene napríklad:

```text
358° → 359° → 0° → 1°
```

pravítko pokračuje prirodzene bez skoku na opačný koniec stupnice.

## 7. Zvislé pravítko vertikálneho uhla

### 7.1 Účel

Zvislé pravítko zobrazuje vertikálny uhol pohľadu kamery, označovaný ako `pitch`.

Pracovná konvencia:

```text
kladný uhol  = pohľad nad horizont
0°           = horizontálny pohľad
záporný uhol = pohľad pod horizont
```

Príklady:

```text
+20°  pohľad nad horizont
  0°  pohľad po horizonte
−35°  pohľad šikmo nadol
−90°  pohľad kolmo nadol
```

### 7.2 Mierka pravítka

Aktuálne nastavenie:

- rozsah približne `±35°` okolo aktuálneho uhla,
- pomocná značka každých `5°`,
- číselné označenie každých `10°`,
- zvýraznená nulová línia horizontu,
- pevný stredový index aktuálneho uhla.

## 8. Živé číselné údaje

HUD priebežne zobrazuje:

```text
ROLL 0,0°    VÝŠKA KAMERY 2 846 m    AGL 1 327 m
```

### 8.1 Azimut

Azimut určuje horizontálny smer pohľadu kamery.

Zdroj:

```js
viewer.camera.heading
```

Hodnota sa prevádza z radiánov na stupne a normalizuje do rozsahu:

```text
0° až 360°
```

### 8.2 Vertikálny uhol – pitch

Pitch určuje, či kamera smeruje nad horizont, po horizonte alebo nadol.

Zdroj:

```js
viewer.camera.pitch
```

### 8.3 Roll

Roll je náklon kamery okolo pozdĺžnej osi pohľadu.

Zdroj:

```js
viewer.camera.roll
```

Pri bežnom ovládaní Cesium býva často blízko `0°`, ale údaj je pripravený aj na budúce letové zobrazenia.

### 8.4 Výška kamery

Údaj `VÝŠKA KAMERY` je kartografická výška polohy Cesium kamery.

Zdroj:

```js
viewer.camera.positionCartographic.height
```

Dôležité:

Táto hodnota sa zatiaľ nesmie automaticky označovať ako presná meteorologická výška AMSL. Pred fyzikálnym použitím treba overiť výškový referenčný systém a prípadnú geoidickú korekciu.

### 8.5 AGL

`AGL` znamená orientačnú výšku kamery nad terénom pod kamerou.

Pracovný výpočet:

```text
AGL
=
výška kamery
−
aktuálne načítaná výška terénu pod kamerou
```

Výška terénu sa číta z aktuálne načítaného glóbusu Cesium.

Ak terén pod kamerou ešte nie je dostupný, HUD zobrazí:

```text
AGL -- m
```

Nástroj nesmie chýbajúcu hodnotu nahradiť vymysleným odhadom.

## 9. Stredový zameriavací prvok

V strede obrazu je jemný svetlozelený zameriavací prvok.

Jeho účelom je:

- zvýrazniť smer osi kamery,
- uľahčiť orientáciu pri nakláňaní a otáčaní,
- pripraviť spoločný stred pre budúce smerové údaje,
- pomôcť pri vizuálnom porovnávaní terénnych línií s azimutom a uhlom pohľadu.

Zameriavací prvok nie je výberovým kurzorom a neovplyvňuje kliknutie do mapy.

## 10. Grafický jazyk

HUD používa schválený letecký prístrojový charakter:

- svetlozelené linky,
- svetlozelené hodnoty,
- jemné svetelné zvýraznenie,
- priehľadné tmavé pozadie iba pod hlavnými údajmi,
- tenké pravítkové značky,
- výraznejšie hlavné značky,
- minimálne prekrytie terénu,
- neinteraktívnu vrstvu nad scénou.

Základný grafický jazyk je používateľsky schválený a pri budúcich rozšíreniach sa má zachovať.

## 11. Správanie pri pohybe kamery

HUD sa aktualizuje počas prekresľovania Cesium scény.

Aby sa zbytočne nemenil DOM pri zanedbateľnom pohybe, používa pracovné prahy:

- uhol približne `0,05°`,
- výška približne `0,5 m`.

To znižuje zbytočné prekresľovanie textových prvkov bez viditeľnej straty plynulosti.

HUD nemení renderovací cyklus analytických vrstiev.

## 12. Závislosti

Aktuálne závislosti:

- knižnica Cesium,
- existujúci Cesium `viewer`,
- 3D kontajner `#cesiumContainer`,
- testovacia stránka s prvkom `#radiusInput`, ktorý dnes slúži aj ako kontrola správneho pracoviska,
- ovládací panel s časťou mapových vrstiev.

Aktuálna implementácia vie získať viewer dvoma spôsobmi:

1. z `window.terrainAnalysisViewer`, ak je k dispozícii,
2. z existujúceho lexikálneho bindingu `viewer` na testovacej stránke.

Cieľová architektúra má viewer poskytovať cez spoločný kontext budúceho `TermikaToolCore`.

## 13. Verejné programové rozhranie

Aktuálny modul zverejňuje:

```js
window.TerrainCameraHUD = {
    VERSION,
    install,
    bindViewer,
    setVisible,
    update,
    get visible() {},
    get viewer() {}
};
```

### `install()`

Vytvorí HUD, doplní prepínač, nájde viewer a pripojí aktualizáciu.

### `bindViewer(viewerInstance)`

Pripojí HUD ku konkrétnemu Cesium vieweru.

### `setVisible(value)`

Zapne alebo vypne viditeľnosť HUD-u.

Príklad:

```js
TerrainCameraHUD.setVisible(false);
TerrainCameraHUD.setVisible(true);
```

### `update()`

Vynúti načítanie a zobrazenie aktuálneho stavu kamery.

### `visible`

Vráti aktuálny stav viditeľnosti.

### `viewer`

Vráti aktuálne pripojený Cesium viewer.

## 14. Obmedzenia aktuálnej verzie

1. HUD je zatiaľ aktivovaný iba na testovacej stránke analýzy terénu.
2. Výška kamery nie je ešte overená ako meteorologická AMSL.
3. AGL závisí od dostupnosti aktuálne načítanej výšky terénu.
4. HUD zatiaľ nezobrazuje vietor, Slnko, čas ani meteorologickú hladinu.
5. Nastavenie viditeľnosti sa zatiaľ neukladá medzi reláciami.
6. Nástroj ešte nie je registrovaný v samostatnom `TermikaToolCore`.
7. Verejné rozhranie ešte nemá samostatnú metódu `destroy()` na úplné odstránenie DOM prvkov a listenerov.

## 15. Overenie

Overené používateľom 13. 7. 2026.

Potvrdené:

- HUD sa zobrazuje v 3D scéne,
- pravítka sa pohybujú spolu s kamerou,
- smer pohľadu je čitateľný,
- výška kamery je zobrazená,
- vizuál pôsobí prirodzene ako letecký prístroj,
- HUD neprekáža ovládaniu mapy,
- základná grafická koncepcia nevyžaduje korekciu.

## 16. Plánované rozšírenia

Na rovnaký HUD možno neskôr pripojiť:

- smer a rýchlosť vetra,
- smer vetra v zvolenej výškovej hladine,
- strih vetra,
- smer a výšku Slnka,
- modelový alebo letový čas,
- meteorologickú hladinu kamery,
- smer termického transportu,
- vektory prúdenia,
- smer stúpania alebo klesania,
- identifikáciu sledovaného terénneho celku,
- upozornenia na rozhrania a zóny zvýšenej dynamickej indukcie.

Tieto údaje sa doplnia až po zavedení príslušných dátových a fyzikálnych vrstiev. HUD ich nesmie predstierať.

## 17. Budúce zapojenie do `TermikaToolCore`

Cieľový registračný tvar:

```js
TermikaToolCore.register({
    id: "camera-hud",
    title: "Kamerový HUD",
    version: "1.0.0",

    scopes: ["terrain-test", "main-3d", "meteo-workspace"],
    requires: ["cesium-viewer"],
    defaultEnabled: true,

    install(context) {},
    activate() {},
    deactivate() {},
    destroy() {}
});
```

Po zavedení registra nástrojov sa má odstrániť potreba, aby HUD sám vyhľadával globálny viewer alebo kontroloval konkrétne DOM prvky stránky.

## 18. Súvisiace súbory

- [`../TOOLS.md`](../TOOLS.md) – centrálny register nástrojov,
- [`../XC/js/terrain-camera-hud.js`](../XC/js/terrain-camera-hud.js) – implementácia,
- [`../postupy/TermikaXC-v2.6-opakovany-fokus-a-kamerovy-HUD.md`](../postupy/TermikaXC-v2.6-opakovany-fokus-a-kamerovy-HUD.md) – vývojový kontext a technické rozhodnutia,
- [`../CHANGELOG.md`](../CHANGELOG.md) – história zmien.

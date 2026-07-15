# TermikaXC – register nástrojov

Tento dokument je centrálnym katalógom používateľských nástrojov a doplnkov projektu TermikaXC.

Nástroj je samostatná funkčná pomôcka pracoviska, ktorá môže zobrazovať údaje, ovládať pohľad, merať, diagnostikovať alebo vizualizovať výsledky. Nástroj nemá byť bez potreby natvrdo zapísaný do hlavného skriptu aplikácie. Má mať vlastný životný cyklus, jasné závislosti a podľa možnosti použiteľnosť vo viacerých pracoviskách TermikaXC.

## 1. Rozlíšenie analytických modulov a nástrojov

TermikaXC rozlišuje dve príbuzné, ale odlišné skupiny.

### 1.1 Analytické moduly

Analytický modul vytvára nové odvodené poznanie alebo fyzikálny výsledok.

Príklady:

- geometria reliéfu,
- morfologická rola,
- terénny mesh,
- dominantná plošná klasifikácia meshu,
- oslnenie,
- energetická bilancia,
- model prúdenia.

Analytické moduly sa registrujú v `TerrainAnalysisCore`, poznajú svoje závislosti a vracajú výsledky do spoločného analytického kontextu.

### 1.2 Nástroje a doplnky pracoviska

Nástroj pomáha používateľovi pracovať s 3D scénou, výsledkami a diagnostikou. Nemusí vytvárať nový fyzikálny výsledok.

Príklady:

- kamerový HUD,
- letový režim kamery,
- zobrazenie aktuálnej release verzie,
- opakovaný prepočet rovnakého fokusu,
- prepínanie základnej mapy,
- meranie vzdialenosti,
- výškový profil,
- rez terénom,
- diagnostická lupa,
- zobrazenie normálových vektorov,
- prepínateľné meteorologické hladiny.

Nástroje majú byť postupne spravované samostatným registrom doplnkov, pracovným názvom `TermikaToolCore`.

## 2. Stavové označenia

| Stav | Význam |
|---|---|
| `NÁVRH` | Myšlienka je zapísaná, ale nie je implementovaná. |
| `ROZPRACOVANÉ` | Implementácia existuje, no ešte nie je uzavretá alebo overená. |
| `AKTÍVNE` | Nástroj je implementovaný a použiteľný. |
| `OVERENÉ` | Nástroj bol funkčne a používateľsky overený. |
| `STABILNÉ` | Rozhranie a správanie sú považované za stabilné pre ďalšie moduly. |
| `VYRADENÉ` | Nástroj sa už nepoužíva alebo bol nahradený. |

## 3. Aktuálny register

| ID nástroja | Názov | Stav | Oblasť použitia | Implementácia | Dokumentácia |
|---|---|---|---|---|---|
| `camera-hud` | Kamerový HUD | `OVERENÉ` | Testovacia 3D analýza terénu; pripravené na ďalšie pracoviská | `XC/js/terrain-camera-hud.js`, `XC/js/terrain-camera-hud-coordinates.js` | [`tools/HUD.md`](tools/HUD.md) |
| `flight-simulator` | Letový režim kamery | `ROZPRACOVANÉ` | Prieskumník, Analýza a ďalšie Cesium pracoviská | `XC/js/flight-simulator.js`, `XC/js/workspace-flight-toggle.js` | [`tools/FLIGHT-SIMULATOR.md`](tools/FLIGHT-SIMULATOR.md) |
| `release-badge` | Zobrazenie aktuálnej release verzie | `ROZPRACOVANÉ` | Hlavička testovacej analýzy | `XC/js/terrain-release-badge.js` | [`tools/RELEASE.md`](tools/RELEASE.md) |
| `focus-recompute` | Opakovaný prepočet aktuálneho fokusu | `AKTÍVNE` | Testovacia analýza terénu | `XC/js/terrain-analysis-focus-ui.js` | pripraví sa |
| `mesh-viewer` | Diagnostické zobrazenie terénneho meshu | `ROZPRACOVANÉ` | Testovacia analýza terénu | `XC/js/terrain-mesh.js` | [`tools/MESH.md`](tools/MESH.md) |
| `mesh-surface` | Dominantná alebo šedá plošná výplň meshu | `ROZPRACOVANÉ` | Testovacia analýza terénu | `XC/js/terrain-mesh-surface.js` | [`tools/MESH.md`](tools/MESH.md) |
| `basemap-visibility` | Prepínač základnej mapy Cesium | `ROZPRACOVANÉ` | Testovacia 3D analýza terénu | `XC/js/terrain-basemap-visibility.js` | [`tools/BASEMAP.md`](tools/BASEMAP.md) |
| `communication-tool` | Univerzálny komunikačný modul pre nástroje a integrácie | `ROZPRACOVANÉ` | Medzimodulová komunikácia a externé prepojenia | `XC/js/tool-communication.js` | [`tools/COMMUNICATION.md`](tools/COMMUNICATION.md) |
| `windy-map-bridge` | Integrácia Windy Map Forecast API ako doplnkového mapového vizuálu | `NÁVRH` | Workflow pilotov: orientácia na Windy, detail v TermikaXC | návrh implementácie | [`tools/WINDY.md`](tools/WINDY.md) |
| `cell-diagnostics` | Diagnostika geometrickej bunky | `AKTÍVNE` | Testovacia analýza terénu | `XC/terrain-analysis-test.php`, `XC/js/terrain-design-ui.js`, ďalšie diagnostické moduly | pripraví sa |
| `terrain-test-link` | Rýchly vstup na test terénu | `AKTÍVNE` | Hlavná stránka TermikaXC | `XC/js/terrain-test-link.js` | pripraví sa |

## 4. Referenčné dokumenty nástrojov

Prvým používateľsky overeným referenčným nástrojom je kamerový HUD:

- používateľský popis: [`tools/HUD.md`](tools/HUD.md),
- technický a vývojový kontext: [`postupy/TermikaXC-v2.6-opakovany-fokus-a-kamerovy-HUD.md`](postupy/TermikaXC-v2.6-opakovany-fokus-a-kamerovy-HUD.md),
- implementácia: `XC/js/terrain-camera-hud.js`.

Ďalšie úplné karty:

- [`tools/FLIGHT-SIMULATOR.md`](tools/FLIGHT-SIMULATOR.md) – pohyb kamery ako letový režim, ovládanie myšou a rýchlosť klávesnicou,
- [`tools/MESH.md`](tools/MESH.md) – drôt, dominantná výplň a jednotná šedá,
- [`tools/BASEMAP.md`](tools/BASEMAP.md) – vypnutie obrazovej mapy pri zachovaní 3D reliéfu,
- [`tools/RELEASE.md`](tools/RELEASE.md) – zobrazenie verzie zo súboru `RELEASE_VERSION`,
- [`tools/COMMUNICATION.md`](tools/COMMUNICATION.md) – univerzálne komunikačné API medzi nástrojmi,
- [`tools/WINDY.md`](tools/WINDY.md) – návrh zapojenia Windy Map Forecast API do workflow pilotov.

Dokument `tools/HUD.md` zostáva vzorom štruktúry pre ďalšie nástroje.

## 5. Povinná štruktúra dokumentácie nástroja

Každý významnejší nástroj má mať vlastný súbor v adresári `tools/`.

Odporúčané kapitoly:

1. názov a účel,
2. stav a identita nástroja,
3. kde je dostupný,
4. prvky rozhrania,
5. spôsob ovládania,
6. význam zobrazovaných údajov,
7. závislosti,
8. verejné programové rozhranie,
9. obmedzenia a interpretácia,
10. overenie,
11. plánované rozšírenia,
12. súvisiace súbory.

## 6. Architektonické pravidlá nástrojov

1. Nástroj nesmie meniť analytické výsledky, pokiaľ jeho účelom nie je výslovne analytický zásah.
2. Nástroj nesmie predstierať údaje, ktoré nie sú dostupné alebo vypočítané.
3. Nástroj má mať stabilné ID a vlastnú verziu.
4. Nástroj má deklarovať požadované služby a závislosti.
5. Nástroj má byť podľa možnosti aktivovateľný a deaktivovateľný bez opätovného načítania stránky.
6. Nástroj nemá priamo vlastniť globálny stav iného nástroja.
7. Prístup k Cesium vieweru má byť poskytovaný cez spoločný kontext alebo službu, nie cez krehké vyhľadávanie interných premenných.
8. Používateľské nastavenia nástroja majú byť oddelené od fyzikálnych nastavení analytických modulov.
9. Vizuálny doplnok má byť odpojiteľný bez zmeny výpočtov.
10. Každý nástroj má mať zdokumentovaný spôsob korektného zrušenia udalostí, listenerov a vytvorených prvkov.
11. Výpočtová topológia a jej vizualizácia majú zostať oddelené; plošný renderer nesmie meniť vrcholy, hrany ani fyzikálne trojuholníky meshu.
12. Skrytie obrazovej mapy nesmie vypnúť 3D reliéf ani analytické vrstvy.

## 7. Cieľová podoba registra doplnkov

Pracovný návrh budúceho rozhrania:

```js
TermikaToolCore.register({
    id: "camera-hud",
    title: "Kamerový HUD",
    version: "1.0.0",

    scopes: ["terrain-test", "main-3d"],
    requires: ["cesium-viewer"],
    defaultEnabled: true,

    install(context) {},
    activate() {},
    deactivate() {},
    destroy() {}
});
```

Register má neskôr zabezpečovať:

- načítanie iba potrebných doplnkov,
- kontrolu závislostí,
- jednotné zapnutie a vypnutie,
- evidenciu verzií,
- poskytovanie spoločných služieb,
- bezpečné odpojenie nástroja,
- možnosť použiť ten istý nástroj na viacerých stránkach.

## 8. Kandidáti ďalších nástrojov

- meranie priestorovej a horizontálnej vzdialenosti,
- meranie azimutu a prevýšenia,
- výškový profil medzi dvoma bodmi,
- rez terénom,
- zobrazenie normálových vektorov plôch meshu,
- diagnostická lupa bunky, hrany a plochy,
- topologická agregácia farebných oblastí meshu,
- prepínanie meteorologických hladín,
- zobrazenie smeru a rýchlosti vetra,
- slnečný kompas,
- časový ovládač modelového času,
- zobrazenie vektorov prúdenia a strihu vetra,
- identifikácia aktuálne sledovaného terénneho celku.

## 9. Súvisiace dokumenty

- [`CHANGELOG.md`](CHANGELOG.md)
- [`tools/HUD.md`](tools/HUD.md)
- [`tools/FLIGHT-SIMULATOR.md`](tools/FLIGHT-SIMULATOR.md)
- [`tools/MESH.md`](tools/MESH.md)
- [`tools/BASEMAP.md`](tools/BASEMAP.md)
- [`tools/RELEASE.md`](tools/RELEASE.md)
- [`tools/COMMUNICATION.md`](tools/COMMUNICATION.md)
- [`tools/WINDY.md`](tools/WINDY.md)
- [`postupy/TermikaXC-v2.6-opakovany-fokus-a-kamerovy-HUD.md`](postupy/TermikaXC-v2.6-opakovany-fokus-a-kamerovy-HUD.md)
- [`postupy/TermikaXC-v2.6-terenny-mesh.md`](postupy/TermikaXC-v2.6-terenny-mesh.md)
- [`postupy/TermikaXC-v2.6-terenny-mesh-M1.2-vypln.md`](postupy/TermikaXC-v2.6-terenny-mesh-M1.2-vypln.md)

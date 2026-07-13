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
- oslnenie,
- energetická bilancia,
- model prúdenia.

Analytické moduly sa registrujú v `TerrainAnalysisCore`, poznajú svoje závislosti a vracajú výsledky do spoločného analytického kontextu.

### 1.2 Nástroje a doplnky pracoviska

Nástroj pomáha používateľovi pracovať s 3D scénou, výsledkami a diagnostikou. Nemusí vytvárať nový fyzikálny výsledok.

Príklady:

- kamerový HUD,
- opakovaný prepočet rovnakého fokusu,
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
| `camera-hud` | Kamerový HUD | `OVERENÉ` | Testovacia 3D analýza terénu; pripravené na ďalšie pracoviská | `XC/js/terrain-camera-hud.js` | [`tools/HUD.md`](tools/HUD.md) |
| `focus-recompute` | Opakovaný prepočet aktuálneho fokusu | `AKTÍVNE` | Testovacia analýza terénu | `XC/js/terrain-analysis-focus-ui.js` | pripraví sa |
| `mesh-viewer` | Diagnostické zobrazenie terénneho meshu | `ROZPRACOVANÉ` | Testovacia analýza terénu | `XC/js/terrain-mesh.js` | pripraví sa |
| `cell-diagnostics` | Diagnostika geometrickej bunky | `AKTÍVNE` | Testovacia analýza terénu | `XC/terrain-analysis-test.php`, `XC/js/terrain-design-ui.js`, ďalšie diagnostické moduly | pripraví sa |
| `terrain-test-link` | Rýchly vstup na test terénu | `AKTÍVNE` | Hlavná stránka TermikaXC | `XC/js/terrain-test-link.js` | pripraví sa |

## 4. Prvý referenčný nástroj

Prvým plne zdokumentovaným nástrojom je kamerový HUD:

- používateľský popis: [`tools/HUD.md`](tools/HUD.md),
- technický a vývojový kontext: [`postupy/TermikaXC-v2.6-opakovany-fokus-a-kamerovy-HUD.md`](postupy/TermikaXC-v2.6-opakovany-fokus-a-kamerovy-HUD.md),
- implementácia: `XC/js/terrain-camera-hud.js`.

Dokument `tools/HUD.md` je vzorom štruktúry pre ďalšie nástroje.

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
- prepínanie meteorologických hladín,
- zobrazenie smeru a rýchlosti vetra,
- slnečný kompas,
- časový ovládač modelového času,
- zobrazenie vektorov prúdenia a strihu vetra,
- identifikácia aktuálne sledovaného terénneho celku.

## 9. Súvisiace dokumenty

- [`CHANGELOG.md`](CHANGELOG.md)
- [`tools/HUD.md`](tools/HUD.md)
- [`postupy/TermikaXC-v2.6-opakovany-fokus-a-kamerovy-HUD.md`](postupy/TermikaXC-v2.6-opakovany-fokus-a-kamerovy-HUD.md)
- [`postupy/TermikaXC-v2.6-terenny-mesh.md`](postupy/TermikaXC-v2.6-terenny-mesh.md)

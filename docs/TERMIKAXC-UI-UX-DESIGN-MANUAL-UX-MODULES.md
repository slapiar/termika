# TermikaXC UI/UX Design Manual – univerzálna architektúra UX modulov

**Verzia:** 1.0.0  
**Stav:** STABILNÉ – normatívna súčasť dokumentu `TERMIKAXC-UI-UX-DESIGN-MANUAL.md`  
**Dátum prijatia:** 16. júl 2026  
**Primárny projekt:** TermikaXC  
**Prenositeľnosť:** architektúra je určená aj pre ďalšie projekty, najmä SABER

---

## 1. Účel

Táto kapitola rozširuje hlavný dizajn manuál o záväznú architektúru univerzálnych používateľských modulov.

Pojem **UX modul** zahŕňa najmä:

- pracovné okno,
- nástroj,
- prístroj,
- HUD,
- diagnostický panel,
- mapový doplnok,
- komunikačný adaptér s používateľským rozhraním,
- vizualizačný doplnok,
- systémový prvok pracoviska, napríklad release pätičku.

Analytické jadro a fyzikálne výpočty zostávajú oddelené. UX modul môže analytický výsledok zobrazovať alebo ovládať jeho prezentáciu, ale nesmie bez výslovného analytického kontraktu meniť jeho fyzikálny význam.

---

## 2. Hlavné rozhodnutie

Univerzálne doplnkové moduly TermikaXC MUSIA byť uložené pod spoločným koreňom:

```text
XC/ux/
```

Názov `ux` je záväzný. V tejto architektúre sa nepoužíva adresár `XC/modules/`.

Stránky a okná NESMÚ mať vlastné kópie rovnakého nástroja ani vlastné úplné zoznamy jeho CSS a JavaScript súborov. Príslušnosť modulu k stránke, oknu alebo pracovnému režimu sa vedie prostredníctvom scope registra.

Základný princíp:

> Kód a vlastná identita modulu patria do `XC/ux/`. Informácia, kde a kedy sa modul používa, patrí do registra príslušnosti.

---

## 3. Adresárová štruktúra

```text
XC/
├── ux/
│   ├── camera-hud/
│   │   ├── module.json
│   │   ├── camera-hud.js
│   │   └── camera-hud.css
│   │
│   ├── windy-map/
│   │   ├── module.json
│   │   ├── windy-map.js
│   │   └── windy-map.css
│   │
│   ├── temp-profile/
│   │   ├── module.json
│   │   ├── temp-profile.js
│   │   └── temp-profile.css
│   │
│   ├── diagnostics/
│   │   ├── module.json
│   │   ├── diagnostics.js
│   │   └── diagnostics.css
│   │
│   └── release-footer/
│       ├── module.json
│       ├── release-footer.js
│       └── release-footer.css
│
├── js/
│   ├── termika-module-core.js
│   ├── termika-module-loader.js
│   └── termika-window-core.js
│
├── asset/ui/
│   ├── foundations/
│   ├── components/
│   ├── families/
│   ├── pages/
│   └── bundles/
│
└── cache/
    └── ux-manifest.json
```

Každý významnejší UX modul MÁ vlastný adresár. Nepotrebujeme samostatné stromy modulov podľa stránok alebo okien.

---

## 4. Zodpovednosť jednotlivých vrstiev

### 4.1 `XC/ux/`

Obsahuje autonómne nástroje, prístroje a pracovné okná.

Každý modul vlastní:

- stabilné ID,
- verziu,
- JavaScript vstup,
- voliteľné špecializované CSS,
- deklaráciu závislostí,
- životný cyklus,
- vlastnú základnú konfiguráciu.

### 4.2 `XC/asset/ui/`

Obsahuje spoločný dizajnový systém:

- tokeny,
- typografiu,
- základné komponenty,
- spoločný rámec okien,
- rodinné štýly stránok,
- produkčné CSS bundle.

UX modul NESMIE kopírovať spoločný rámec okna, základné tlačidlá, labely, fonty ani tému.

### 4.3 Databáza

Databáza vlastní runtime príslušnosť a prevádzkové nastavenie:

- kde sa modul používa,
- či je aktívny,
- poradie načítania,
- povinnosť alebo voliteľnosť,
- konfiguračné overrides,
- prípadné oprávnenia.

### 4.4 Cache manifest

Cache manifest je rýchly runtime obraz registra. Stránka ho používa namiesto opakovaného rekurzívneho prehľadávania disku.

---

## 5. Manifest modulu `module.json`

Každý UX modul MUSÍ obsahovať súbor `module.json`.

Príklad nástroja:

```json
{
  "id": "camera-hud",
  "title": "Kamerový HUD",
  "version": "1.0.0",
  "type": "tool",
  "entry": "camera-hud.js",
  "styles": [
    "camera-hud.css"
  ],
  "requires": [
    "cesium-viewer"
  ],
  "optional": [],
  "autoload": false,
  "singleton": true,
  "enabled": true
}
```

Príklad pracovného okna:

```json
{
  "id": "windy-map",
  "title": "Windy mapa",
  "version": "1.0.0",
  "type": "window",
  "entry": "windy-map.js",
  "styles": [
    "windy-map.css"
  ],
  "requires": [
    "window-core",
    "communication-tool"
  ],
  "optional": [],
  "autoload": false,
  "singleton": true,
  "enabled": true
}
```

Manifest modulu vyjadruje, **čo modul je**. Príslušnosť k stránkam a oknám sa nemá natrvalo duplikovať vo všetkých manifestoch, ak ju spravuje databázový scope register.

---

## 6. Scope – príslušnosť modulu

Príslušnosť sa vyjadruje stabilným scope kľúčom.

Príklady:

```text
page:explorer
page:terrain-analysis
page:setup
window:windy-map
window:temp-profile
window:diagnostics
workspace:workbench
mode:flight-simulator
```

Scope nie je cesta k súboru. Je to logická identita pracoviska alebo funkčného kontextu.

Rovnaký modul môže patriť k viacerým scopes bez kopírovania kódu.

---

## 7. Databázový register

Odporúčaná základná schéma:

### 7.1 Moduly

```text
ux_modules
----------
id
module_key
title
type
version
path
enabled
singleton
autoload
sort_order
config_json
created_at
updated_at
```

### 7.2 Scopes

```text
ux_scopes
---------
id
scope_key
scope_type
title
enabled
```

### 7.3 Príslušnosť

```text
ux_scope_modules
----------------
scope_id
module_id
load_order
required
enabled
config_override_json
```

Kombinácia `scope_id + module_id` MUSÍ byť jedinečná.

Databáza nevlastní zdrojový kód modulu. Eviduje jeho použitie a runtime politiku.

---

## 8. Objavenie modulov

Adresár `XC/ux/` sa MÔŽE cyklicky alebo rekurzívne prehľadávať, ale nie pri každom otvorení stránky alebo okna.

Scan sa vykonáva najmä:

- pri nasadení,
- pri administrátorskej synchronizácii,
- pri inštalácii alebo odstránení modulu,
- explicitným CLI príkazom,
- v developerskom režime.

Odporúčané nástroje:

```text
tools/rebuild-ux-registry.php
```

alebo:

```text
XC/admin/rebuild-ux-registry.php
```

Úloha registračného procesu:

1. rekurzívne prejsť `XC/ux/`,
2. nájsť všetky `module.json`,
3. validovať ich schému,
4. aktualizovať databázový register,
5. označiť chýbajúce moduly ako nedostupné alebo vyradené,
6. vyriešiť základné závislosti,
7. vytvoriť cache manifest.

---

## 9. Cache manifest

Odporúčaný výstup:

```text
XC/cache/ux-manifest.json
```

Manifest obsahuje už spracovaný zoznam modulov a scopes potrebný pre runtime loader.

Zdroj pravdy je rozdelený takto:

```text
Čo modul je             → XC/ux/<module>/module.json
Kde sa používa           → databázový scope register
Ako je nakonfigurovaný   → databáza
Čo sa má práve načítať   → cache manifest alebo API registra
```

Cache sa MUSÍ invalidovať pri:

- zmene verzie modulu,
- zmene `module.json`,
- zmene príslušnosti scope,
- zmene poradia alebo aktivácie,
- nasadení nového release.

---

## 10. Runtime načítanie

Stránka načíta iba scope, ktorý potrebuje.

Príklad:

```js
await TermikaModuleLoader.loadScope("page:terrain-analysis");
```

Pri otvorení okna:

```js
await TermikaModuleLoader.loadScope("window:windy-map");
```

Loader MUSÍ:

- načítať iba moduly príslušného scope,
- vyriešiť povinné závislosti,
- zachovať `load_order`,
- zabrániť duplicitnému načítaniu,
- načítať CSS pred aktiváciou modulu,
- načítať JavaScript iba raz,
- evidovať stav `idle`, `loading`, `ready`, `error`,
- pri chybe umožniť kontrolovaný retry,
- rozlišovať `install` a opakované `activate`,
- zabrániť vzniku viacerých inštancií singleton modulu.

---

## 11. Životný cyklus UX modulu

Každý modul používa spoločný kontrakt:

```js
TermikaModuleCore.register({
    id: "camera-hud",
    version: "1.0.0",

    async install(context, config) {
        // Jednorazové vytvorenie DOM, služieb a listenerov.
    },

    async activate(context, config) {
        // Zapnutie alebo zobrazenie už nainštalovaného modulu.
    },

    async deactivate(context) {
        // Dočasné vypnutie bez zničenia inštalácie.
    },

    async destroy(context) {
        // Odstránenie DOM, timerov, observerov a listenerov.
    }
});
```

Význam:

- `install()` sa vykoná najviac raz pre jednu inštanciu,
- `activate()` sa môže vykonať opakovane,
- `deactivate()` zachová možnosť rýchleho znovuotvorenia,
- `destroy()` musí korektne uvoľniť všetky zdroje.

Modul NESMIE nechávať po `destroy()` aktívne event listenery, intervaly, timeouty, observery ani osirelé DOM prvky.

---

## 12. Moduly pracovných okien

Okno používa spoločný `TermikaWindowCore` a spoločné CSS `window-base.css`.

Príklad:

```js
TermikaModuleCore.register({
    id: "windy-map",
    version: "1.0.0",

    async install(context, config) {
        this.window = await context.windows.create({
            id: "windy-map-window",
            title: "Windy mapa",
            moduleId: "windy-map"
        });
    },

    async activate() {
        this.window.open();
    },

    async deactivate() {
        this.window.close();
    },

    async destroy() {
        this.window.destroy();
    }
});
```

Rámec okna vlastní:

- hlavičku,
- titulok,
- systémové akcie,
- telo,
- voliteľnú pätičku,
- presun,
- resize,
- minimalizáciu,
- focus,
- z-index správanie,
- základný stav a tému.

UX modul vlastní iba svoj obsah, funkčnú logiku a špecializovaný layout.

---

## 13. Pravidlá CSS UX modulu

Stránka najprv načíta rodinný bundle, napríklad:

```text
asset/ui/bundles/workbench.bundle.css
```

Modul následne načíta iba svoje špecializované CSS:

```text
ux/windy-map/windy-map.css
ux/temp-profile/temp-profile.css
```

CSS modulu NESMIE znova definovať:

- globálny font,
- základné farby témy,
- spoločné labely,
- spoločné tlačidlá,
- základné formulárové ovládacie prvky,
- rámec pracovného okna,
- systémové tiene a rádiusy.

CSS modulu MÁ obsahovať iba:

- unikátny vnútorný layout,
- dátové vizualizácie,
- špecifické canvas alebo mapové kontajnery,
- špecializované stavové prvky,
- responzívne správanie vlastného obsahu.

Príklad:

```css
.tx-window--windy .windy-map-canvas {
    width: 100%;
    height: 100%;
}

.tx-window--windy .windy-focus-bar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--tx-space-4);
}
```

Ochranné konfliktné vlastnosti rámca okna zostávajú v spoločnej vrstve `tx-lock`, nie v každom module samostatne.

---

## 14. Načítanie CSS a JavaScriptu iba raz

Loader vedie register načítaných assetov.

Stabilné identifikátory:

```text
family:workbench
page:terrain-analysis
module:windy-map
module:camera-hud
window:windy-map
```

Opakované otvorenie okna NESMIE:

- vytvoriť ďalší `<link>`,
- vytvoriť ďalší `<script>`,
- zaregistrovať rovnaký listener druhýkrát,
- vytvoriť druhú singleton inštanciu.

Opakované otvorenie vykoná iba `activate()`.

---

## 15. Autoload a lazy loading

### 15.1 Autoload

Modul sa načíta pri iniciácii stránky, ak:

- je potrebný okamžite,
- poskytuje základnú službu iným modulom,
- je súčasťou základného pracovného toku,
- jeho neskoré načítanie by spôsobilo viditeľné prebliknutie alebo funkčnú medzeru.

### 15.2 Lazy loading

Modul sa načíta pri prvom použití, ak:

- ide o voliteľné pracovné okno,
- používateľ ho otvára iba príležitostne,
- obsahuje veľkú externú knižnicu,
- obsahuje mapu, graf alebo dátovo náročnú vizualizáciu,
- nie je potrebný na základnú funkciu stránky.

Windy mapa je typickým kandidátom lazy loadingu.

---

## 16. Závislosti

Závislosti sa deklarujú podľa stabilných ID, nie pomocou relatívneho poradia tagov vložených ručne do stránky.

Príklad:

```json
{
  "id": "windy-map",
  "requires": [
    "window-core",
    "communication-tool"
  ]
}
```

Loader NESMIE aktivovať modul, kým nie sú pripravené všetky povinné závislosti.

Cyklická závislosť je chyba registra a MUSÍ byť odmietnutá pri zostavení manifestu.

---

## 17. Chybové správanie

Zlyhanie voliteľného UX modulu NESMIE znefunkčniť analytické jadro ani celú stránku.

Loader musí rozlišovať:

- chyba manifestu,
- chýbajúca závislosť,
- chyba načítania CSS,
- chyba načítania JavaScriptu,
- chyba `install()`,
- chyba `activate()`,
- chyba externej služby.

Pri chybe:

1. modul prejde do stavu `error`,
2. chyba sa zapíše do diagnostiky,
3. používateľ dostane zrozumiteľnú správu,
4. ostatné nezávislé moduly pokračujú,
5. loader môže ponúknuť kontrolovaný retry.

---

## 18. Bezpečnostné pravidlá

- `module.json` nesmie obsahovať tajné kľúče.
- API kľúče zostávajú v serverovej konfigurácii podľa pravidiel konkrétnej služby.
- Databázová konfigurácia modulu nesmie vracať tajné serverové hodnoty do klienta.
- Cesta k assetu musí byť normalizovaná a obmedzená na povolený koreň `XC/ux/`.
- Dynamický loader nesmie vykonávať ľubovoľnú cestu dodanú používateľom.
- Registrácia modulu musí validovať ID, typ, verziu, entry súbor a štýly.

---

## 19. Výkonové pravidlá

1. Runtime nesmie pri každom requeste rekurzívne prehľadávať `XC/ux/`.
2. Stránka načíta iba svoj rodinný CSS bundle a autoload moduly príslušného scope.
3. Voliteľné moduly sa načítajú až pri prvom použití.
4. Rovnaký asset sa počas života stránky načíta najviac raz.
5. Cache manifest musí byť verziovaný alebo hashovaný.
6. Veľké externé knižnice sa nesmú načítať iba preto, že sú dostupné v registri.
7. Deaktivácia modulu nemusí odstraňovať už stiahnutý asset; má najmä zastaviť jeho aktívne správanie.

---

## 20. Prenositeľnosť do projektu SABER

Architektúra `ux` je prenositeľná bez kopírovania vizuálnej identity TermikaXC.

Prenášajú sa:

- modulový kontrakt,
- scope register,
- runtime loader,
- životný cyklus,
- pravidlá cache,
- pravidlá závislostí,
- pravidlá izolácie okien,
- testovacie a bezpečnostné pravidlá.

Neprenášajú sa automaticky:

- farby EXPLORER,
- letecká terminológia,
- dátové palety TermikaXC,
- konkrétne okná a nástroje,
- vizuálna identita značky.

SABER môže použiť rovnakú stavebnú sústavu, ale vlastný brand profil, vlastné scopes a vlastné UX moduly.

---

## 21. Záväzný realizačný postup

1. Vytvoriť `XC/ux/` ako koreň UX modulov.
2. Zaviesť a validovať schému `module.json`.
3. Implementovať `TermikaModuleCore`.
4. Implementovať `TermikaModuleLoader`.
5. Prepojiť loader s existujúcim `TermikaStyleLoader` alebo ho nahradiť spoločným asset registrom.
6. Implementovať `TermikaWindowCore` podľa hlavného dizajn manuálu.
7. Zaviesť databázové tabuľky `ux_modules`, `ux_scopes`, `ux_scope_modules`.
8. Implementovať synchronizáciu adresára `XC/ux/` do registra.
9. Generovať `XC/cache/ux-manifest.json`.
10. Ako prvý pilotný modul migrovať jednoduché samostatné okno, odporúčane legendu.
11. Následne migrovať diagnostiku, debugger, TEMP a Windy mapu.
12. Po overení odstrániť duplicitné inline implementácie a staré načítavacie mosty.

---

## 22. Konečné pravidlo

> `XC/ux/` je jednotný katalóg používateľských nástrojov, prístrojov a okien. Modul sa opisuje sám, jeho príslušnosť spravuje scope register a runtime načíta iba to, čo konkrétna stránka alebo okno skutočne potrebuje.

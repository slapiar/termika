# TermikaXC UI/UX – inventúra a migračná mapa

**Dátum:** 16. júl 2026  
**Nadväzuje na:** `docs/TERMIKAXC-UI-UX-DESIGN-MANUAL.md`  
**Stav:** AKTÍVNE

## 1. Účel

Tento dokument je pracovnou inventúrou existujúceho rozhrania a určuje poradie jeho migrácie na spoločný UI/UX systém.

Nejde o nový dizajnový návrh. Vizuálnou referenciou zostáva profesionálny technický vzhľad stránky `explorer.php`.

## 2. Rodina WORKBENCH

Do jednej rodiny technických pracovísk patria:

| Stránka | Úloha | Cieľový bundle | Vlastný layout |
|---|---|---|---|
| `XC/explorer.php` | prieskum letu a 3D pracovisko | `workbench.bundle.css` | `explorer*.css` počas migrácie |
| `XC/terrain-analysis-test.php` | testovanie terénnych, TEMP a WIND analýz | `workbench.bundle.css` | dočasný vnútorný `<style>` |
| `XC/analysis.php` | produkčný vstup do analytického pracoviska | zdedený `workbench.bundle.css` | iba doplnky pracoviska |

Stránky sa otvárajú samostatne. Nejde o vnorené stránky a každá načítava iba vlastnú rodinu UI.

## 3. Aktuálny stav Explorer

`XC/explorer.php` dnes skladá viac samostatných štýlov:

- `asset/explorer.css`,
- `asset/explorer-nav.css`,
- `asset/explorer-theme.css`,
- `asset/explorer-theme-runtime.css`,
- `asset/explorer-import.css`,
- `asset/explorer-profile.css`,
- `asset/explorer-profile-dock.css`,
- `asset/explorer-profile-follow.css`,
- `asset/workspace-polish.css`,
- `asset/workspace-flight-simulator.css`.

Rozdelenie je funkčné, ale mieša:

1. spoločné základy pracoviska,
2. vzhľad komponentov,
3. unikátny layout stránky,
4. štýly samostatných nástrojov.

Počas migrácie sa súbory neodstránia naraz. Spoločné pravidlá sa postupne presunú do Workbench systému a pôvodné súbory zostanú ako kompatibilná vrstva.

## 4. Aktuálny stav Terrain Analysis

`XC/terrain-analysis-test.php` obsahuje veľký vnútorný `<style>`, v ktorom sú spolu:

- témy,
- navigácia,
- formuláre,
- pracovné okná,
- legenda,
- diagnostika,
- TEMP graf a tabuľka,
- docky a mapové HUD prvky,
- responzívny layout.

Dočasné súbory:

- `asset/terrain-explorer-ui.css`,
- `asset/terrain-explorer-labels.css`

zjednotili vzhľad s Explorerom. Po zavedení `workbench.bundle.css` sa stanú migračným mostom a neskôr sa odstránia.

## 5. Register pracovných okien

| ID / selektor | Typ | Spoločný základ | Špecializovaný modul |
|---|---|---|---|
| `#panel` | analytické pracovné okno | áno | analysis window |
| `#legend` | dátové okno | áno | legend window |
| `#cellDiagnostics` | diagnostické okno | áno | diagnostics window |
| `#debugConsole` | konzolové okno | áno | debugger window |
| TEMP okno | grafické a tabuľkové okno | áno | temp window |
| `#windyMapWindow` | mapové okno | áno | windy window |

Súčasná trieda `.floating-window` zostáva počas migrácie podporovaná. Cieľová trieda je `.tx-window`.

## 6. Prvá implementačná etapa

Prvá etapa zavádza bez veľkého prepisu:

1. adresár `XC/asset/ui/`,
2. významové tokeny,
3. spoločnú typografiu a fokus,
4. spoločné ovládacie prvky,
5. základ pracovných okien,
6. rodinný `workbench.bundle.css`,
7. manifest UI assetov,
8. loader zabraňujúci opakovanému načítaniu,
9. build nástroj na deterministické zostavenie bundle.

## 7. Kompatibilita počas migrácie

Workbench musí podporovať oba názvoslovné systémy:

| Cieľová trieda | Dočasne podporovaný selektor |
|---|---|
| `.tx-window` | `.floating-window` |
| `.tx-window__header` | `.window-header` |
| `.tx-window__title` | `.window-title` |
| `.tx-window__body` | `.window-body` |
| `.tx-window__action` | `.window-action` |
| `.tx-label` | `label`, `.label` iba v rámci pracoviska alebo okna |
| `.tx-control` | vstupy a selecty v rámci pracoviska alebo okna |

Kompatibilné selektory sa nesmú rozširovať globálne mimo `body[data-tx-family="workbench"]`.

## 8. Nasledujúce migračné kroky

1. Nasadiť Workbench bundle na Explorer a Terrain Analysis.
2. Presunúť spoločné oknové pravidlá z vnútorného `<style>` do `window-base.css`.
3. Migrovať legendu.
4. Migrovať diagnostiku.
5. Migrovať debugger.
6. Migrovať TEMP.
7. Migrovať Windy.
8. Odstrániť dočasný label override.
9. Odstrániť duplicitné stránkové definície spoločných komponentov.
10. Zapnúť automatické kontroly nepovolených inline farieb a `!important`.

## 9. Podmienka úspechu

Migrácia je správna iba vtedy, ak:

- nedôjde k zmene analytických výpočtov,
- nezmení sa správanie Cesium pracoviska,
- zostane funkčné presúvanie, resize a minimalizácia okien,
- svetlá a tmavá téma zostanú vizuálne symetrické,
- každá stránka načíta iba potrebnú rodinu a svoje funkčné moduly,
- opakované otvorenie okna nevytvorí ďalší `<link>`.

# TermikaXC UI/UX Design Manual

**Verzia:** 1.0.0  
**Stav:** STABILNÉ – záväzný základ ďalšieho vývoja  
**Dátum prijatia:** 16. júl 2026  
**Primárny projekt:** TermikaXC  
**Prenositeľnosť:** architektúra je určená aj pre ďalšie projekty, najmä SABER

---

## 1. Účel dokumentu

Tento dokument určuje jednotný spôsob navrhovania, implementovania a kontrolovania používateľského rozhrania projektov TermikaXC.

Nie je to katalóg aktuálnych farieb jednej stránky. Je to dohoda o tom:

- ako sa delia stránky podľa charakteru,
- ktoré štýly stránky zdieľajú,
- ako sa načítavajú špecializované okná,
- ako sa izoluje vzhľad okna od hostiteľskej stránky,
- ako fungujú svetlá a tmavá téma,
- ako sa pomenúvajú komponenty,
- kde je použitie `!important` zámerné a kde je zakázané,
- ako sa predchádza duplicite, konfliktom a postupnému rozpadaniu dizajnu,
- ako sa systém prenesie do ďalšieho projektu bez kopírovania vizuálnej identity TermikaXC.

Dokument je normatívny. Výrazy **MUSÍ**, **NESMIE**, **MÁ**, **MÔŽE** a **ODPORÚČA SA** vyjadrujú mieru záväznosti pravidla.

---

## 2. Hlavné rozhodnutie

TermikaXC nebude používať:

- jeden monolitický CSS súbor pre celú aplikáciu,
- samostatný kompletný dizajn v každej stránke,
- samostatnú farbu, font a ovládacie prvky v každom okne,
- opakované načítanie CSS pri každom zobrazení toho istého okna,
- neorganizované prepisovanie konfliktov pomocou `!important`.

TermikaXC bude používať:

1. **spoločné základy dizajnu**, uložené ako zdrojové moduly,
2. **jeden produkčný bundle pre každú rodinu stránok**,
3. **malý stránkový layout iba tam, kde je nevyhnutný**,
4. **spoločný základ pracovných okien**,
5. **samostatný modul špecializovaného okna**, načítaný najviac raz,
6. **významové dizajnové tokeny** namiesto priamych farieb,
7. **riadenú CSS kaskádu**,
8. **kontrolovanú vrstvu ochranných `!important` pravidiel pre okná**,
9. **postupnú migráciu bez jednorazového prepisu aplikácie**.

Jednou vetou:

> Rovnaké pracoviská majú používať rovnaký rodinný štýl; rôzne typy okien majú používať rovnakú konštrukciu, ale iba svoj potrebný obsahový modul.

---

## 3. Inšpiračné zdroje

Systém si zachováva vlastnú identitu EXPLORER. Z profesionálnych systémov preberá iba overené princípy:

- **Esri Calcite Design System** – pracovné mapové prostredia, základy, témy, prístupnosť a layoutové vzory,
- **IBM Carbon Design System** – významové tokeny, témy a zmena systému cez univerzálne premenné,
- **Microsoft Fluent 2** – rozlíšenie modálnych, nemodálnych a výstražných okien, ich správanie a fokus,
- **webové štandardy CSS Cascade Layers a Shadow DOM** – riadenie kaskády a možná budúca izolácia komponentov.

TermikaXC nekopíruje ich vzhľad ani hotové komponenty. Preberá disciplínu, terminológiu a spôsob rozhodovania.

---

## 4. Základné princípy dizajnu

### 4.1 Technická čitateľnosť pred dekoráciou

Rozhranie je pracovný letecký a analytický nástroj. Text, stav a hodnota musia byť čitateľné skôr, než je rozhranie efektné.

### 4.2 Kontrast pred priesvitnosťou

Priesvitné pozadie sa môže použiť ako priestorový efekt, ale nikdy nesmie znižovať čitateľnosť textu. Svetlý text na svetlom polopriesvitnom paneli je neprípustný.

### 4.3 Farba vyjadruje význam

Akcentová farba sa používa na:

- aktívny prvok,
- nadpis pracovnej sekcie,
- fokus,
- vybranú hodnotu,
- jednoznačne významový stav.

Akcentová farba sa nepoužíva plošne iba preto, aby rozhranie pôsobilo farebne.

### 4.4 Rovnaký význam = rovnaké správanie

Label, primárne tlačidlo, chyba, upozornenie alebo zatvorenie okna musia vyzerať a správať sa rovnako vo všetkých pracoviskách rovnakej rodiny.

### 4.5 Stránka a okno sú dve odlišné vrstvy

Stránka určuje pracovisko a jeho layout. Okno je autonómny nástroj nad pracoviskom. Okno nesmie neúmyselne zdediť konfliktnú typografiu, farbu alebo ovládacie prvky hostiteľskej stránky.

### 4.6 Výpočty a vizuál zostávajú oddelené

Zmena témy alebo CSS nesmie meniť analytický výsledok, dátový model ani fyzikálnu interpretáciu.

### 4.7 Žiadny veľký jednorazový prepis

Migrácia prebieha po rodinách stránok a typoch okien. Funkčná aplikácia má zostať použiteľná počas celej migrácie.

---

## 5. Architektúra UI

### 5.1 Tri úrovne systému

UI sa delí na tri úrovne:

1. **Foundations** – tokeny, typografia, priestor, kontrast, fokus, základné pravidlá.
2. **Page families** – spoločný charakter podobných stránok.
3. **Windows and tools** – autonómne pracovné okná a špecializované nástroje.

### 5.2 Navrhovaná adresárová štruktúra

```text
XC/asset/ui/
├── foundations/
│   ├── tokens.css
│   ├── typography.css
│   ├── spacing.css
│   ├── focus.css
│   └── accessibility.css
│
├── components/
│   ├── buttons.css
│   ├── fields.css
│   ├── cards.css
│   ├── tables.css
│   ├── status.css
│   ├── navigation.css
│   └── window-base.css
│
├── families/
│   ├── workbench.css
│   ├── setup.css
│   ├── public.css
│   └── embedded.css
│
├── pages/
│   ├── explorer.layout.css
│   ├── terrain-analysis.layout.css
│   ├── analysis.layout.css
│   └── setup.layout.css
│
├── windows/
│   ├── temp-window.css
│   ├── windy-window.css
│   ├── diagnostics-window.css
│   ├── legend-window.css
│   ├── debugger-window.css
│   └── dialog-window.css
│
├── brands/
│   ├── termikaxc.light.css
│   └── termikaxc.dark.css
│
├── bundles/
│   ├── workbench.bundle.css
│   ├── setup.bundle.css
│   ├── public.bundle.css
│   └── embedded.bundle.css
│
└── ui-manifest.json
```

Zdrojové moduly v adresároch `foundations`, `components`, `families` a `brands` sa v produkcii nemajú načítavať jednotlivo. Zostavia sa do rodinného bundle.

---

## 6. Rodiny stránok

### 6.1 Rodina `workbench`

Technické pracoviská s vysokou hustotou informácií, mapou, analytickými ovládačmi alebo pracovnými oknami.

Patria sem najmä:

- `explorer.php`,
- `terrain-analysis-test.php`,
- `analysis.php`,
- budúce Cesium a meteorologické pracoviská.

Všetky MUSIA používať:

```html
<link rel="stylesheet" href="asset/ui/bundles/workbench.bundle.css?v=...">
```

Stránka MÔŽE navyše načítať malý súbor obsahujúci iba vlastný layout:

```html
<link rel="stylesheet" href="asset/ui/pages/terrain-analysis.layout.css?v=...">
```

Stránkový layout NESMIE opätovne definovať:

- fonty,
- farby labelov,
- vzhľad tlačidiel,
- vzhľad vstupov,
- vzhľad kariet,
- vzhľad okien,
- systémové tiene,
- spoločné polomery rohov.

### 6.2 Rodina `setup`

Konfiguračné, servisné a administratívne stránky.

Charakteristika:

- širšie formuláre,
- pokojnejší layout,
- menej prekryvných okien,
- dôraz na bezpečné zadávanie údajov,
- jasné potvrdenie uloženia a chyby.

### 6.3 Rodina `public`

Verejné, prezentačné a obchodné stránky.

Táto rodina nepoužíva hustotu technického pracoviska, ale môže používať rovnaké základné tokeny, formuláre, dialógy a pravidlá prístupnosti.

### 6.4 Rodina `embedded`

Malé vložené nástroje, iframe, miniaplikácie a externé widgety. Musí byť čo najmenšia a nesmie predpokladať prítomnosť kompletného pracoviska.

---

## 7. Produkčné CSS balíky

### 7.1 Jedna rodina = jeden hlavný bundle

Každá stránka načíta iba bundle svojej rodiny. Výsledkom je:

- rovnaký dizajn podobných stránok,
- menej duplicitného CSS,
- efektívne cacheovanie,
- menšie množstvo nepoužitých pravidiel,
- jednoduchšia kontrola verzií.

### 7.2 Žiadne runtime `@import` v produkcii

`@import` môže byť použitý pri vývoji, ale produkčný bundle má byť vygenerovaný ako jeden fyzický súbor. Tým sa predíde reťazeniu sieťových požiadaviek.

### 7.3 Malý stránkový súbor je povolený

Stránkový súbor obsahuje iba geometriu konkrétneho pracoviska:

- pozíciu mapy,
- mriežku hlavného layoutu,
- rozmery unikátneho panelu,
- breakpointy konkrétnej obrazovky.

Nemá byť druhým dizajnovým systémom.

### 7.4 Verziovanie a cache

Preferované poradie:

1. názov s obsahovým hashom,
2. release verzia projektu,
3. explicitná UI verzia.

Príklad:

```text
workbench.bundle.4f32a8c.css
```

Ak sa používa query parameter:

```text
workbench.bundle.css?v=2.7.0-ui.1
```

Verzia sa mení iba pri zmene obsahu. Zobrazenie alebo zatvorenie okna ju nesmie meniť.

---

## 8. Systém pracovných okien

### 8.1 Základný kontrakt okna

Každé pracovné okno používa rovnakú kostru:

```html
<article class="tx-window tx-window--temp" data-tx-window="temp">
    <header class="tx-window__header">
        <h2 class="tx-window__title">TEMP profil</h2>

        <div class="tx-window__actions">
            <button class="tx-icon-button" type="button" aria-label="Minimalizovať okno"></button>
            <button class="tx-icon-button" type="button" aria-label="Zatvoriť okno"></button>
        </div>
    </header>

    <div class="tx-window__body">
        <!-- obsah nástroja -->
    </div>

    <footer class="tx-window__footer">
        <!-- voliteľné akcie -->
    </footer>
</article>
```

### 8.2 Povinné časti

Každé viditeľné pracovné okno MUSÍ mať:

- zrozumiteľný názov,
- jednoznačný spôsob zatvorenia alebo návratu,
- definovanú oblasť tela,
- stabilný identifikátor `data-tx-window`,
- definované správanie klávesnice,
- správne obnovenie fokusu po zatvorení.

### 8.3 Typy okien

#### Nemodálne pracovné okno

Príklady:

- TEMP,
- legenda,
- diagnostika,
- debugger,
- Windy mapa.

Používateľ môže pokračovať v práci s mapou alebo stránkou. Okno má zatváracie tlačidlo a nesmie sa zatvoriť kliknutím mimo neho.

#### Modálne okno

Používa sa iba pri sústredenej úlohe, počas ktorej sa nemá ovládať pozadie.

#### Výstražné okno

Používa sa iba pri riziku straty údajov, deštruktívnej operácii alebo rozhodnutí, ktoré nemožno bezpečne vykonať automaticky.

#### HUD

Trvalo alebo dočasne zobrazuje stav nad scénou. Nejde o dialóg. Nemá zachytávať vstup, pokiaľ nie je interaktívny.

#### Tooltip alebo popover

Poskytuje krátke vysvetlenie alebo lokálny kontext. Nesmie suplovať veľké pracovné okno.

### 8.4 Hlavička, telo a päta

- Hlavička a päta zostávajú pri rolovaní stabilné.
- Roluje sa iba telo okna.
- Dlhý formulár sa nemá bezdôvodne umiestňovať do malého dialógu.
- Okná sa nemajú vnárať jedno do druhého.

### 8.5 Presúvanie a zmena rozmerov

Presúvateľné okno:

- sa presúva iba za hlavičku,
- nesmie sa celé stratiť mimo viewportu,
- po zmene veľkosti viewportu sa vráti do dostupnej oblasti,
- uchováva rozmer a polohu iba vtedy, ak je to pre používateľa užitočné.

---

## 9. Načítanie štýlov okien

### 9.1 Základ okien sa načíta najviac raz

`window-base.css` je súčasťou `workbench.bundle.css`, ak daná rodina pracovné okná používa.

### 9.2 Špecializované okno sa načíta pri prvom použití

Napríklad TEMP okno načíta:

```text
asset/ui/windows/temp-window.css
```

iba pri prvom vytvorení alebo prvom otvorení okna.

Opakované zobrazenie okna NESMIE vytvoriť nový `<link>`.

### 9.3 Register načítaných štýlov

Odporúčaný kontrakt:

```js
window.TermikaStyleLoader = {
    loaded: new Map(),

    load(id, href) {
        if (this.loaded.has(id)) {
            return this.loaded.get(id);
        }

        const existing = document.querySelector(`link[data-tx-style="${id}"]`);
        if (existing) {
            const ready = Promise.resolve(existing);
            this.loaded.set(id, ready);
            return ready;
        }

        const ready = new Promise((resolve, reject) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = href;
            link.dataset.txStyle = id;
            link.onload = () => resolve(link);
            link.onerror = () => reject(new Error(`CSS sa nepodarilo načítať: ${href}`));
            document.head.appendChild(link);
        });

        this.loaded.set(id, ready);
        return ready;
    }
};
```

### 9.4 Prednačítanie

Okno, ktoré je viditeľné bezprostredne po otvorení stránky, sa má zahrnúť do rodinného bundle alebo prednačítať.

Okno, ktoré používateľ otvára zriedka, sa má načítať až pri prvom použití.

---

## 10. CSS kaskáda

### 10.1 Záväzné poradie vrstiev

```css
@layer tx-lock,
       tx-reset,
       tx-foundations,
       tx-components,
       tx-family,
       tx-page,
       tx-windows,
       tx-utilities;
```

Normálne pravidlá majú prednosť smerom k neskoršej vrstve. Pri pravidlách s `!important` je poradie vrstiev obrátené. Preto je ochranná vrstva `tx-lock` deklarovaná ako prvá.

### 10.2 Úloha vrstiev

| Vrstva | Úloha |
|---|---|
| `tx-lock` | iba ochranné konfliktné pravidlá okien s `!important` |
| `tx-reset` | normalizácia pre prvky aplikácie |
| `tx-foundations` | tokeny, typografia, priestor, fokus |
| `tx-components` | tlačidlá, polia, tabuľky, karty, základ okien |
| `tx-family` | charakter rodiny stránky |
| `tx-page` | unikátna geometria jednej stránky |
| `tx-windows` | špecializované obsahové layouty okien |
| `tx-utilities` | malé explicitné pomocné triedy |

### 10.3 Nevrstvené staršie CSS

Počas migrácie môže existovať staršie nevrstvené CSS. Ochranné `!important` deklarácie v `tx-lock` majú slúžiť ako hranica autonómnych okien. Staršie CSS sa má postupne odstrániť, nie trvalo obchádzať ďalšími opravnými súbormi.

---

## 11. Pravidlá používania `!important`

### 11.1 Prečo je v oknách povolený

Pracovné okno sa môže zobraziť na rôznych stránkach s rôznymi staršími selektormi. Jeho základná čitateľnosť musí zostať verná dizajn manuálu.

`!important` sa preto používa ako vedomá ochrana kontraktu okna, nie ako bežný spôsob zvyšovania špecificity.

### 11.2 Povolené vlastnosti v `tx-lock`

V ochranných pravidlách okna možno použiť `!important` najmä pre:

- `font-family`,
- `font-size`,
- `font-weight`,
- `line-height`,
- `color`,
- `background`,
- `background-color`,
- `border-color`,
- `border-radius`,
- `box-shadow`,
- `text-shadow`,
- `opacity` iba pri definovanom stave,
- `appearance`,
- `accent-color`,
- `box-sizing`.

Príklad:

```css
@layer tx-lock {
    .tx-window {
        font-family: var(--tx-font-ui) !important;
        color: var(--tx-window-text) !important;
        background: var(--tx-window-surface) !important;
        border-color: var(--tx-window-border) !important;
    }

    .tx-window .tx-label {
        color: var(--tx-text-secondary) !important;
        font-size: var(--tx-font-size-label) !important;
        font-weight: 600 !important;
    }

    .tx-window .tx-control,
    .tx-window .tx-button {
        font: inherit !important;
        color: var(--tx-control-text) !important;
        background: var(--tx-control-surface) !important;
        border-color: var(--tx-control-border) !important;
    }
}
```

### 11.3 Zakázané vlastnosti s `!important`

Bez výslovne zdokumentovanej výnimky sa `!important` NESMIE používať pre:

- `display`,
- `visibility`,
- `position`,
- `inset`, `top`, `right`, `bottom`, `left`,
- `width`, `height`, `min-*`, `max-*`,
- `transform`,
- `translate`, `rotate`, `scale`,
- `z-index`,
- `overflow`,
- `pointer-events`,
- stav otvorenia alebo zatvorenia,
- hodnoty, ktoré riadi správca okien alebo JavaScript.

Tieto vlastnosti patria funkčnému správaniu. Ich násilné uzamknutie by mohlo znemožniť presun, resize, minimalizovanie alebo responzívnu opravu okna.

### 11.4 Žiadne inline vizuálne `!important`

JavaScript NESMIE vytvárať inline vizuálny štýl s `!important`.

Výnimkou môže byť iba dočasná diagnostika počas vývoja, ktorá sa nesmie dostať do produkčnej vetvy.

### 11.5 Každé nové `!important` musí mať dôvod

Pri code review sa musí dať odpovedať:

1. Pred akým konfliktom pravidlo chráni komponent?
2. Patrí vlastnosť do vizuálneho kontraktu alebo do funkčnej geometrie?
3. Nedá sa konflikt odstrániť pomenovaným komponentom alebo tokenom?
4. Je pravidlo v `tx-lock`, alebo ide o zdokumentovanú výnimku?

---

## 12. Menný priestor a selektory

### 12.1 Prefix projektu

Spoločné komponenty TermikaXC používajú prefix `tx-`.

Príklady:

```text
tx-window
tx-card
tx-field
tx-label
tx-control
tx-button
tx-table
tx-status
tx-toolbar
```

### 12.2 BEM štruktúra pre väčšie komponenty

```text
tx-window
tx-window__header
tx-window__title
tx-window__actions
tx-window__body
tx-window__footer
tx-window--temp
tx-window--diagnostics
```

### 12.3 Stavové triedy

Stav sa vyjadruje triedou alebo atribútom:

```text
.is-open
.is-active
.is-loading
.is-disabled
.has-warning
.has-error
[data-state="loading"]
```

### 12.4 ID nie je dizajnový kontrakt

ID sa používa pre:

- jedinečný JavaScript cieľ,
- prístupnosť cez `aria-labelledby`,
- unikátnu stránkovú geometriu.

Vzhľad spoločných komponentov sa NESMIE opierať o konkrétne ID.

### 12.5 JavaScript hooky

Odporúča sa:

```html
<button class="tx-button" data-js-load-temp>Načítať TEMP</button>
```

Trieda určuje vzhľad. `data-js-*` určuje správanie. Zmena dizajnu potom nerozbije JavaScript.

---

## 13. Dizajnové tokeny

### 13.1 Významové názvy

Token sa pomenúva podľa úlohy, nie podľa aktuálnej farby.

Správne:

```css
--tx-text-primary
--tx-text-secondary
--tx-surface-page
--tx-surface-panel
--tx-surface-raised
--tx-border-default
--tx-border-strong
--tx-accent
--tx-focus
--tx-success
--tx-warning
--tx-danger
```

Nesprávne:

```css
--light-blue
--dark-gray
--nice-cyan
--white-panel
```

### 13.2 Základná paleta EXPLORER

#### Svetlá téma

```css
--tx-text-primary: #17313e;
--tx-text-secondary: #536b77;
--tx-heading: #084454;
--tx-accent: #007f9f;
--tx-accent-strong: #006e8a;
--tx-surface-page: #f7fbfd;
--tx-surface-panel: #ffffff;
--tx-surface-raised: #eef7fa;
--tx-control-surface: #ffffff;
--tx-control-hover: #dff5fa;
--tx-border-default: #9db0bb;
--tx-border-subtle: #c9d4da;
```

#### Tmavá téma

```css
--tx-text-primary: #edf7fb;
--tx-text-secondary: #91a8b6;
--tx-heading: #dff8ff;
--tx-accent: #35d8ff;
--tx-accent-strong: #70e8ff;
--tx-surface-page: #071019;
--tx-surface-panel: #0a1620;
--tx-surface-raised: #101f2b;
--tx-control-surface: #0d1a24;
--tx-control-hover: #132837;
--tx-border-default: #426277;
--tx-border-subtle: #2a4557;
```

### 13.3 Komponentové aliasy

Komponent nemá používať priamu farbu. Použije alias:

```css
--tx-window-text: var(--tx-text-primary);
--tx-window-label: var(--tx-text-secondary);
--tx-window-surface: var(--tx-surface-panel);
--tx-window-border: var(--tx-border-default);
--tx-control-text: var(--tx-text-primary);
--tx-control-border: var(--tx-border-default);
```

### 13.4 Dátové farby sú oddelené

Farby terénu, vetra, teploty, geometrických tried a meraných stavov sú dátové tokeny:

```css
--tx-data-ridge
--tx-data-gully
--tx-data-lift
--tx-data-sink
--tx-data-temperature-cold
--tx-data-temperature-hot
```

Dátová farba sa nesmie automaticky používať ako farba bežného UI prvku.

---

## 14. Témy

### 14.1 Jediný stav témy

Téma sa riadi jedným atribútom na koreňovom prvku aplikácie.

Cieľový kontrakt:

```html
<html data-tx-theme="light">
```

Povolené hodnoty:

```text
light
dark
system
```

Počas migrácie môže adaptér synchronizovať existujúci `body[data-theme]` s novým atribútom.

### 14.2 Komponent nesmie poznať konkrétnu tému

Komponent používa tokeny. Nemá obsahovať samostatné svetlé a tmavé hodnoty, pokiaľ nejde o dátovú vizualizáciu alebo výslovne zdokumentovaný optický detail.

### 14.3 Zmena témy nesmie prebliknúť

Preferencia témy sa má aplikovať pred vykreslením hlavného obsahu. Ukladá sa ako používateľská preferencia a rešpektuje `prefers-color-scheme`, pokiaľ používateľ nezvolil konkrétnu tému.

---

## 15. Typografia

### 15.1 Rodina písma

```css
--tx-font-ui: Inter, ui-sans-serif, system-ui, -apple-system,
              BlinkMacSystemFont, "Segoe UI", sans-serif;

--tx-font-mono: "SFMono-Regular", Consolas, "Liberation Mono",
                Menlo, monospace;
```

Inter je preferované písmo. Systémové fallbacky zabezpečujú funkčnosť bez blokovania stránky externým fontom.

### 15.2 Typografická stupnica

| Úloha | Veľkosť | Váha | Poznámka |
|---|---:|---:|---|
| Názov pracoviska | 18 px | 800 | hlavná identita stránky |
| Názov okna | 13 px | 800 | krátky, jednoznačný |
| Nadpis sekcie | 12 px | 800 | mierne rozšírené písmo, prípadne verzálky |
| Bežný text | 12–13 px | 400–500 | podľa hustoty pracoviska |
| Label | 11.5 px | 600 | sekundárna farba |
| Pomocný text | 11 px | 400–500 | nikdy nie príliš svetlý |
| Tabuľková hlavička | 10.5–11 px | 800 | sticky podľa potreby |
| Tabuľková hodnota | 11.5–12 px | 500–700 | tabular nums |
| Debugger | 11.5–12 px | 400 | monospace |

### 15.3 Číselné údaje

Merané a porovnávané hodnoty majú používať:

```css
font-variant-numeric: tabular-nums;
```

### 15.4 Text nesmie byť iba dekoratívne zosvetlený

Sekundárny text musí zostať čitateľný. Opacity pod 0.65 sa pri bežnom texte neodporúčajú.

---

## 16. Priestor, rozmery a tvary

### 16.1 Priestorová stupnica

```css
--tx-space-1: 2px;
--tx-space-2: 4px;
--tx-space-3: 6px;
--tx-space-4: 8px;
--tx-space-5: 12px;
--tx-space-6: 16px;
--tx-space-7: 24px;
--tx-space-8: 32px;
```

### 16.2 Ovládacie prvky

- desktopové minimum: 34 px,
- dotykový režim: najmenej 42 px,
- ikonové tlačidlo musí mať dostatočnú aktívnu plochu,
- malé vizuálne tlačidlo môže mať väčšiu neviditeľnú aktívnu plochu.

### 16.3 Polomery

```css
--tx-radius-control: 7px;
--tx-radius-card: 10px;
--tx-radius-window: 12px;
--tx-radius-pill: 999px;
```

### 16.4 Tiene

Tieň vyjadruje výškovú vrstvu. Nesmie sa používať náhodne.

```css
--tx-shadow-panel: 0 7px 20px rgba(24, 53, 68, 0.16);
--tx-shadow-window: 0 16px 38px rgba(0, 0, 0, 0.44);
```

Hodnoty sa menia podľa témy cez tokeny.

---

## 17. Spoločné komponenty

### 17.1 Field a label

```html
<label class="tx-field">
    <span class="tx-label">Výška nad terénom</span>
    <input class="tx-control" type="number" value="300">
    <span class="tx-help">Hodnota v metroch AGL.</span>
</label>
```

### 17.2 Tlačidlo

```html
<button class="tx-button tx-button--primary" type="button">
    Spustiť analýzu
</button>
```

Varianty:

```text
tx-button--primary
tx-button--secondary
tx-button--quiet
tx-button--success
tx-button--warning
tx-button--danger
tx-icon-button
```

### 17.3 Stav

```html
<div class="tx-status" data-state="warning" role="status">
    TEMP profil používa záložný zdroj.
</div>
```

### 17.4 Karta

```html
<section class="tx-card">
    <h3 class="tx-card__title">Zdroj TEMP</h3>
    <div class="tx-card__body"></div>
</section>
```

### 17.5 Tabuľka

Tabuľka má používať spoločné triedy, zarovnanie čísel a sticky hlavičku podľa potreby. Špecializované okno môže meniť stĺpcový layout, nie základnú typografiu a kontrast.

---

## 18. Zodpovednosť CSS a JavaScriptu

### CSS riadi

- farby,
- typografiu,
- okraje,
- tiene,
- štandardné rozmery komponentov,
- hover, focus a disabled vzhľad,
- responzívne layouty,
- animácie a reduced-motion varianty.

### JavaScript riadi

- vytvorenie a zrušenie okna,
- otvorenie, zatvorenie a minimalizáciu,
- presun a resize,
- dynamické súradnice,
- fokus,
- načítanie dát,
- funkčné stavy,
- načítanie špecializovaného CSS modulu najviac raz.

### JavaScript nesmie

- nastavovať základné farby cez `element.style.color`,
- nastavovať font cez inline štýl,
- vytvárať vlastný vzhľad každého labelu,
- meniť svetlú a tmavú tému prvok po prvku.

Namiesto toho pridáva triedu alebo stavový atribút.

---

## 19. Fokus, klávesnica a prístupnosť

### 19.1 Viditeľný fokus

Každý interaktívny prvok MUSÍ mať jasný `:focus-visible` stav. Fokus nesmie byť odstránený bez náhrady.

### 19.2 Otvorenie okna

- Nemodálne okno presunie fokus na svoj prvý vhodný prvok iba vtedy, ak ho používateľ otvoril klávesnicou alebo ak je to potrebné pre úlohu.
- Modálne a výstražné okno zachytí fokus.
- Po zatvorení sa fokus vráti na spúšťací prvok.

### 19.3 Escape

- Nemodálne a modálne okno sa spravidla zatvára klávesom Escape.
- Výstražné okno sa nesmie zavrieť spôsobom, ktorý obíde potrebné rozhodnutie.

### 19.4 Farba nie je jediný nositeľ informácie

Chyba, úspech alebo varovanie musí mať text, ikonu alebo iný jednoznačný signál.

### 19.5 Pohyb

Pri `prefers-reduced-motion: reduce` sa vypnú alebo výrazne skrátia dekoratívne animácie.

### 19.6 Kontrast

Cieľom je minimálne:

- 4.5 : 1 pre bežný text,
- 3 : 1 pre veľký text a dôležité hranice ovládacích prvkov.

---

## 20. Responzívne správanie

Každé pracovisko sa kontroluje minimálne pri:

- širokom desktopovom zobrazení,
- 1366 × 768,
- úzkom notebooku,
- tablete,
- mobilnom zobrazení,
- zoome 125 % a 150 %.

Pracovné okno:

- nesmie presiahnuť dostupný viewport,
- musí mať rolovateľné telo,
- na mobile sa môže zmeniť na spodný panel alebo takmer celoobrazovkové okno,
- musí zachovať zatvárací prvok viditeľný.

Dlhé slovenské názvy sa testujú ako reálny stav, nie ako výnimočný okrajový prípad.

---

## 21. Výkonové pravidlá

### 21.1 Nenačítavať nepoužívané rodiny

Workbench nesmie načítavať public alebo setup bundle.

### 21.2 Nenačítavať CSS pri každom otvorení okna

Štýl okna sa načíta najviac raz za život stránky. Ďalšie otvorenia iba menia stav existujúceho komponentu.

### 21.3 Zdieľaný základ okien

Spoločná konštrukcia okna je súčasťou rodinného bundle. Špecializovaný modul obsahuje iba odlišnosti obsahu.

### 21.4 Produkčný build

Zdrojové CSS moduly sa majú:

- zoradiť podľa definovaných vrstiev,
- spojiť,
- minifikovať,
- označiť verziou alebo hashom,
- zapísať do manifestu.

### 21.5 Odporúčané mäkké rozpočty

- rodinný bundle: cieľ do 50 KiB minifikovaného CSS,
- špecializovaný modul okna: cieľ do 12 KiB,
- stránkový layout: cieľ do 8 KiB.

Prekročenie nie je automatická chyba, ale musí mať vecné zdôvodnenie.

### 21.6 Žiadne externé fontové blokovanie

Rozhranie musí fungovať okamžite so systémovým fallbackom. Externý font nesmie zablokovať prvé použiteľné vykreslenie.

---

## 22. Z-index a vrstvy pracoviska

Odporúčaná stupnica:

```css
--tx-z-map: 0;
--tx-z-map-overlay: 20;
--tx-z-toolbar: 40;
--tx-z-window: 100;
--tx-z-window-active: 120;
--tx-z-popover: 200;
--tx-z-modal-backdrop: 300;
--tx-z-modal: 320;
--tx-z-toast: 400;
--tx-z-tooltip: 500;
```

Aktívne pracovné okno môže dostať vyššiu vrstvu cez správcu okien. `z-index` sa nemá riešiť náhodnými hodnotami v jednotlivých súboroch.

---

## 23. Testovanie konfliktov

### 23.1 Konfliktná testovacia stránka

Má vzniknúť testovacie pracovisko, ktoré zámerne vloží nepriateľské štýly stránky, napríklad:

```css
label {
    color: hotpink !important;
    font: 24px serif !important;
}

button {
    background: yellow !important;
    color: red !important;
}
```

Pracovné okno musí napriek tomu zachovať svoj definovaný vizuálny kontrakt.

Test zároveň overí, že dynamické:

- otvorenie,
- zatvorenie,
- presun,
- resize,
- minimalizácia

zostávajú funkčné a nie sú blokované ochrannými pravidlami.

### 23.2 Matica vizuálnej kontroly

Každý významný komponent sa kontroluje:

| Stav | Svetlá | Tmavá |
|---|---:|---:|
| normálny | áno | áno |
| hover | áno | áno |
| focus | áno | áno |
| active | áno | áno |
| disabled | áno | áno |
| loading | áno | áno |
| warning | áno | áno |
| error | áno | áno |
| prázdny stav | áno | áno |

### 23.3 Automatické kontroly

Postupne sa odporúča zaviesť:

- kontrolu duplicitných tokenov,
- zákaz priamych farieb mimo brand a dátových súborov,
- zákaz inline vizuálnych štýlov,
- kontrolu nepovolených `!important`,
- vizuálne regresné screenshoty,
- základný accessibility audit.

---

## 24. Migračný plán TermikaXC

### Fáza 0 – prijatie manuálu

Tento dokument je výsledkom fázy 0.

### Fáza 1 – inventúra

Zoznam:

- všetkých stránok,
- ich rodín,
- všetkých okien,
- aktuálnych CSS súborov,
- inline štýlov,
- JavaScriptom vytváraných vizuálnych štýlov,
- duplicitných selektorov a tokenov.

### Fáza 2 – foundations a brand tokeny

Vytvoria sa:

- spoločné tokeny,
- svetlá a tmavá paleta EXPLORER,
- typografia,
- fokus,
- priestorová stupnica.

### Fáza 3 – workbench bundle

Ako prvé sa zjednotia:

- `explorer.php`,
- `terrain-analysis-test.php`,
- `analysis.php`.

Súčasný profesionálny vzhľad EXPLORER je vizuálnou referenciou.

### Fáza 4 – window base

Vytvorí sa spoločná kostra:

- hlavička,
- telo,
- päta,
- ovládacie ikony,
- fokus,
- rolovanie,
- ochranná vrstva.

### Fáza 5 – migrácia špecializovaných okien

Odporúčané poradie:

1. legenda,
2. diagnostika,
3. debugger,
4. TEMP,
5. Windy mapa,
6. ďalšie analytické okná.

### Fáza 6 – odstránenie dočasných opráv

Po migrácii sa odstránia:

- duplicitné inline štýly,
- dočasné label override súbory,
- stránkové definície spoločných komponentov,
- nepoužívané selektory.

Súčasné súbory `terrain-explorer-ui.css` a `terrain-explorer-labels.css` sú migračný most, nie cieľová architektúra.

### Fáza 7 – build a manifest

Vytvorí sa jednoduchý build nástroj, vhodne napríklad:

```text
tools/build-ui-css.php
```

Výstup sa zapíše do `XC/asset/ui/bundles/` a `ui-manifest.json`.

---

## 25. Prenos do projektu SABER

### 25.1 Čo sa prenáša

Do SABER sa prenesú:

- architektúra rodín stránok,
- systém tokenov,
- komponentové kontrakty,
- pravidlá tém,
- pravidlá okien,
- výkonové pravidlá,
- prístupnosť,
- build a testovacie postupy.

### 25.2 Čo sa nekopíruje automaticky

Do SABER sa bez nového dizajnového rozhodnutia nekopírujú:

- tyrkysová paleta TermikaXC,
- mapový charakter pracoviska,
- letecké ikony,
- konkrétne hustoty analytických panelov,
- názvy a dátové farby terénnych modulov.

### 25.3 Samostatná identita SABER

SABER dostane vlastný brand profil, napríklad:

```text
saber.brand.css
SABER-UI-UX-PROFILE.md
```

Profil určí:

- značku,
- typografický charakter,
- vlastnú paletu,
- fotografický a ikonografický jazyk,
- verejné a obchodné rodiny stránok,
- prípadné technické konfigurátory alebo pracovné okná.

SABER tak môže používať rovnakú profesionálnu konštrukciu bez toho, aby vyzeral ako prefarbená TermikaXC.

### 25.4 Zdieľanie kódu

Ak budú projekty dlhodobo vyvíjané paralelne, odporúča sa neskôr oddeliť neutrálny základ komponentov do samostatnej verziovanej knižnice. Kým to nie je potrebné, zdieľa sa predovšetkým manuál a architektúra, nie nekontrolovaná kópia súborov.

---

## 26. Obsah a UX texty

### 26.1 Názvy okien

Názov musí povedať, čo okno robí alebo čo zobrazuje.

Správne:

```text
Diagnostika bunky
TEMP profil
Zdroj vetra
Nastavenie fokusu
```

Nevhodné:

```text
Okno
Informácia
Chyba
Nastavenia
```

### 26.2 Tlačidlá

Tlačidlo má používať konkrétne sloveso:

```text
Načítať TEMP
Spustiť analýzu
Použiť fokus
Zatvoriť okno
Uložiť konfiguráciu
```

### 26.3 Chybové správy

Chyba má uviesť:

1. čo sa nepodarilo,
2. pravdepodobnú príčinu, ak je známa,
3. bezpečný ďalší krok.

### 26.4 Nepreťažovať používateľa

Technická presnosť neznamená, že každé interné označenie musí byť stále viditeľné. Detail sa zobrazuje v diagnostike, tooltipe alebo rozbalenej sekcii podľa významu.

---

## 27. Kontrolný zoznam novej stránky

Pred zaradením novej stránky sa overí:

- [ ] Je určená rodina stránky.
- [ ] Načítava iba príslušný rodinný bundle.
- [ ] Stránkový CSS obsahuje iba vlastný layout.
- [ ] Neprepisuje spoločné komponenty.
- [ ] Funguje svetlá aj tmavá téma.
- [ ] Je otestovaný kontrast.
- [ ] Funguje klávesový fokus.
- [ ] Je otestovaný zoom 125 % a 150 %.
- [ ] Dlhé slovenské názvy nerozbijú layout.
- [ ] Prázdny, loading, warning a error stav sú navrhnuté.
- [ ] Nepoužité oknové moduly sa nenačítavajú.
- [ ] Nie sú prítomné nepovolené inline vizuálne štýly.

---

## 28. Kontrolný zoznam nového okna

- [ ] Používa `.tx-window` a stabilné `data-tx-window`.
- [ ] Používa spoločnú hlavičku, telo a podľa potreby pätu.
- [ ] Má jasný názov.
- [ ] Je určené, či je nemodálne, modálne, alert, HUD alebo popover.
- [ ] Má správny fokus a návrat fokusu.
- [ ] Štýl sa načíta najviac raz.
- [ ] Špecializovaný CSS obsahuje iba špecializovaný layout.
- [ ] Farby a typografia používajú tokeny.
- [ ] Ochranné `!important` sú iba v povolenej vrstve.
- [ ] Presun, resize a visibility nie sú uzamknuté cez `!important`.
- [ ] Funguje svetlá aj tmavá téma.
- [ ] Je otestované proti konfliktnému CSS stránky.
- [ ] Na mobile zostáva zatváranie dostupné.
- [ ] Pri zrušení odstráni listenery a vytvorené zdroje.

---

## 29. Rozhodnutia architektúry

### UI-001 – Žiadny globálny monolit

Celá aplikácia nebude používať jeden jediný CSS súbor.

### UI-002 – Rodinné bundle

Podobné samostatne otvárané stránky používajú jeden spoločný produkčný bundle.

### UI-003 – Stránkový CSS iba pre layout

Stránka nesmie vlastniť druhú kópiu spoločného dizajnu.

### UI-004 – Okná sú autonómne

Pracovné okno musí zachovať svoj vizuálny kontrakt na každej podporovanej stránke.

### UI-005 – Cielené `!important`

Konfliktné vizuálne vlastnosti okien sú chránené v osobitnej vrstve. Funkčná geometria sa neuzamyká.

### UI-006 – Lazy load najviac raz

Špecializované CSS okna sa môže načítať pri prvom použití, ale nie pri každom zobrazení.

### UI-007 – Tokeny namiesto priamych farieb

Komponenty používajú významové tokeny. Priama farba patrí do brand alebo dátovej vrstvy.

### UI-008 – EXPLORER je vizuálna referencia TermikaXC

Svetlý aj tmavý profesionálny technický dizajn EXPLORER tvorí základ pracovných rodín TermikaXC.

### UI-009 – Shadow DOM je perspektívna možnosť

Nové plne autonómne komponenty môžu neskôr použiť Web Components a Shadow DOM. Nie je to podmienka súčasnej migrácie.

### UI-010 – Manuál je prenositeľný, značka nie

SABER a ďalšie projekty prevezmú systém rozhodovania, nie automaticky identitu TermikaXC.

---

## 30. Budúca izolácia cez Shadow DOM

Shadow DOM poskytuje skutočnú hranicu medzi štýlmi stránky a vnútrom komponentu. Je vhodný najmä pre nové okná, ktoré sa majú používať vo viacerých pracoviskách alebo projektoch.

Výhody:

- stránka náhodne nerozbije vnútro komponentu,
- komponent neuniká svojimi selektormi do stránky,
- jeden zostrojený stylesheet možno zdieľať medzi viacerými komponentmi,
- prehliadač môže spoločný stylesheet spracovať iba raz.

Nevýhody a dôvody postupnej migrácie:

- existujúce okná by vyžadovali zásah do DOM a JavaScriptu,
- témy a externé tokeny musia mať premyslený kontrakt,
- testovanie a debugging sú odlišné,
- nie je vhodné prepisovať funkčné okná iba kvôli technológii.

Rozhodnutie:

> Súčasné okná sa zjednotia cez menný priestor, tokeny, kaskádové vrstvy a kontrolované `!important`. Shadow DOM sa použije pri nových komponentoch tam, kde prinesie jasný úžitok.

---

## 31. Referencie

- Esri Calcite Design System – Foundations: <https://developers.arcgis.com/calcite-design-system/foundations/>
- IBM Carbon Design System – Themes: <https://carbondesignsystem.com/elements/themes/overview/>
- Microsoft Fluent 2 – Dialog guidance: <https://fluent2.microsoft.design/components/web/react/core/dialog/usage>
- MDN – CSS `@layer`: <https://developer.mozilla.org/en-US/docs/Web/CSS/@layer>
- MDN – Using Shadow DOM: <https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM>

---

## 32. Záver

Cieľom systému nie je vyrobiť veľa rovnakých obrazoviek. Cieľom je, aby všetky obrazovky pôsobili ako premyslené časti jedného produktu a aby každá nová stránka alebo okno vznikali rýchlejšie, bezpečnejšie a bez návratu k už vyriešeným konfliktom.

TermikaXC si zachováva vlastnú identitu. Profesionálnosť nevzniká kopírovaním cudzieho vzhľadu, ale dôsledným používaním vlastných pravidiel.

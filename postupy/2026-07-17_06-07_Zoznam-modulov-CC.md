# Patch pre Copilota: inventúra univerzálnych modulov CC

**Číslo zadania:** `2026-07-17_06-07`  
**Vznik zadania:** 17. júla 2026 o 06:07 CEST  
**Umiestnenie patchu:** `/postupy/2026-07-17_06-07_Zoznam-modulov-CC.md`

## Úloha

Preskúmaj celý repozitár projektu **TermikaXC** a identifikuj všetky existujúce používateľské nástroje, prístroje, zariadenia, pracovné okná, HUD prvky, panely, vizualizácie, diagnostické pomôcky, mapové doplnky, ovládacie prvky a ďalšie užitočné funkčné „vychytávky“, ktoré by sa v budúcnosti mohli preniesť do novej architektúry ako **univerzálne použiteľné moduly CC**.

Výsledok ulož do nového súboru:

```text
docs/Zoznam modulov CC.md
```

Ak repozitár už používa inú jednoznačnú dokumentačnú konvenciu pre podobné inventúry, zachovaj uvedený názov súboru a ulož ho do existujúceho adresára dokumentácie.

## Rozsah tejto úlohy

Táto úloha je **výhradne inventarizačná**.

- Neupravuj, neopravuj ani nereorganizuj existujúci kód.
- Nevytváraj adresár `CC/` ani nové moduly.
- Nič nepresúvaj z `XC/`.
- Nemeň správanie aplikácie, načítavanie assetov, databázu ani produkčné súbory.
- Nerob refaktor a nezjednocuj podobné implementácie.
- Nevytváraj migračný kód ani adaptéry.
- Nemeň existujúce dizajn manuály.
- Jediným obsahovým výstupom má byť súbor `docs/Zoznam modulov CC.md`.

## Čo treba identifikovať

Hľadaj najmä:

- samostatné a plávajúce pracovné okná,
- analytické a diagnostické panely,
- HUD a mapové prekrytia,
- legendy, grafy, tabuľky a vizualizácie,
- ovládače kamery, mapy, terénu a simulácie,
- TEMP, WIND, Windy a meteorologické nástroje,
- importné, exportné a komunikačné nástroje,
- navigačné, profilové a dokovacie prvky,
- debugovacie, stavové a servisné pomôcky,
- release/version prvky a systémové pätičky,
- opakovane použiteľné dialógy, formuláre a selektory,
- funkcie skryté v stránkovom JavaScripte, inline skriptoch alebo PHP šablónach,
- prvky vytvárané dynamicky cez JavaScript,
- podobné alebo duplicitné implementácie toho istého nástroja na viacerých stránkach.

Nevychádzaj iba z názvov adresárov. Preskúmaj PHP, JavaScript, CSS, HTML šablóny, manifesty a dokumentáciu natoľko, aby zoznam zachytil aj funkcie vnorené priamo v stránkach.

## Povinný obsah zoznamu

Na začiatku dokumentu stručne uveď:

1. dátum inventúry,
2. skúmanú vetvu a commit,
3. že ide o kandidátov na budúce moduly, nie o rozhodnutie na ich okamžitú migráciu,
4. že žiadny modul nesmie byť prenesený do `CC`, kým nebude najprv odladený a funkčne overený v pôvodnom prostredí `XC`.

Potom vytvor jednu hlavnú tabuľku s týmito stĺpcami:

| ID kandidáta | Pracovný názov | Typ | Čo robí | Kde sa dnes používa | Zdrojové súbory / selektory | Hlavné závislosti | Podobné alebo duplicitné riešenie | Predbežná univerzálnosť | Stav overenia v XC | Poznámka |
|---|---|---|---|---|---|---|---|---|---|---|

### Pravidlá vypĺňania

- `ID kandidáta`: navrhni stabilné kebab-case ID, ale nemeníš podľa neho kód.
- `Typ`: napríklad `window`, `tool`, `instrument`, `HUD`, `panel`, `visualization`, `adapter`, `system` alebo `component`.
- `Kde sa dnes používa`: uveď konkrétne stránky, okná alebo pracovné režimy.
- `Zdrojové súbory / selektory`: uveď overiteľné cesty k súborom a dôležité DOM ID, triedy alebo názvy funkcií. Nevymýšľaj cesty.
- `Hlavné závislosti`: uveď napríklad Cesium, databázu, konkrétne API, globálne objekty, CSS, DOM hostiteľa alebo iný nástroj.
- `Podobné alebo duplicitné riešenie`: prepoj kandidátov, ktoré sa zrejme prekrývajú. Zatiaľ nerozhoduj o ich zlúčení.
- `Predbežná univerzálnosť`: použi iba hodnoty `vysoká`, `stredná`, `nízka` alebo `nejasná` a stručne zdôvodni.
- `Stav overenia v XC`: pri tejto inventúre používaj `NEOVERENÉ`, pokiaľ repozitár obsahuje jednoznačný dôkaz o odladení a funkčnom overení; vtedy uveď dôkaz.
- Ak si pri niektorej vlastnosti nie si istý, napíš `NEOVERENÉ` alebo `NEJASNÉ`. Nevytváraj domnienku ako fakt.

## Zoskupenie pod tabuľkou

Pod hlavnou tabuľkou pridaj stručné sekcie:

1. **Najvhodnejší kandidáti na univerzálne moduly** – iba zoznam podľa zistenej miery samostatnosti, bez začatia migrácie.
2. **Pravdepodobné duplicity a prekrytia** – čo bude neskôr potrebné porovnať.
3. **Prvky pevne zviazané s analytickým jadrom** – kandidáti vyžadujúci zvláštnu opatrnosť.
4. **Nejasné alebo skryté prvky na ďalšie preverenie** – položky, ktoré sa nepodarilo spoľahlivo zaradiť.

## Kritická migračná zásada

V dokumente viditeľne uveď:

> Do CC sa nesmie preniesť žiadny modul, ktorý nebol najprv odladený a funkčne overený vo svojom pôvodnom prostredí XC. Inventúra sama o sebe neoprávňuje na presun ani prepis modulu.

## Kontrola pred dokončením

Pred uložením výsledku skontroluj:

- či každá položka odkazuje na reálne nájdený kód, selektor alebo dokumentáciu,
- či nebol vykonaný žiadny zásah mimo nového inventárneho dokumentu,
- či zoznam zahŕňa aj inline a dynamicky vytvárané nástroje,
- či kandidáti nie sú označení ako odladení bez konkrétneho dôkazu,
- či zostal zachovaný slovenský názov súboru `Zoznam modulov CC.md`.

Po dokončení oznám iba vytvorenie súboru, počet identifikovaných kandidátov, skúmaný commit a prípadné oblasti, ktoré sa nepodarilo spoľahlivo preveriť.

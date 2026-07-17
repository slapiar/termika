# Templates, Languages a jednotný vzhľad stránok

**Dátum rozhodnutia:** 17. júl 2026  
**Stav:** ZÁVÄZNÝ PRACOVNÝ POSTUP

## Účel

Vzhľad, štruktúra a textový obsah stránok sa nesmú ďalej vytvárať ako izolované monolity v jednotlivých PHP súboroch.

Projekt používa dve samostatné koreňové vrstvy:

- `/Templates` – rodiny stránok, HTML/PHP shelly, layoutové kontrakty a deklarácie potrebných assetov,
- `/Languages` – úplné jazykové katalógy používateľského rozhrania.

Tieto vrstvy nemenia vlastníctvo funkčných modulov v `/CC`. Modul zostáva vlastníkom svojho správania a lokálneho view; template určuje hostiteľskú konštrukciu stránky.

## Povinná skladba release

Každý release a každá nasaditeľná inštancia MUSÍ obsahovať spolu:

```text
/CC
/Templates
/Languages
```

`/Templates` ani `/Languages` sa pri release nevynechávajú, negenerujú do náhradných adresárov a nenahrádzajú odvodenou kópiou v `/CC/app`.

Nasadenie sa považuje za neúplné, ak ktorýkoľvek z týchto troch koreňových adresárov chýba.

## Templates

Template nie je hotová kópia konkrétnej stránky. Je to skladateľný predpis pozostávajúci z:

1. rodiny stránky (`workbench`, `setup`, `public`, `embedded`),
2. shellu stránky,
3. zoznamu rodinných CSS a JS assetov,
4. pomenovaných slotov pre moduly,
5. malého stránkového layoutu.

Template NESMIE obsahovať analytické výpočty, aplikačný stav ani tajné konfiguračné údaje.

## Languages

Slovenčina je zdrojový a povinný jazyk celej inštancie.

Všetky slovenské texty používateľského rozhrania sa vedú v jedinom súbore:

```text
/Languages/SK_sk.json
```

Jazykové mutácie sa NESMÚ deliť podľa modulov, stránok ani funkčných skupín. Nevytvárajú sa samostatné súbory typu `common.json`, `workbench.json` alebo jazykový súbor v každom module.

Prekladový kľúč je stabilný významový identifikátor, nie slovenská veta. Príklady:

```text
common.action.close
workbench.window.restore
terrain.legend.title
```

Jazykový katalóg NESMIE obsahovať HTML ani vykonateľný kód. Premenné sa zapisujú pomenovanými zástupnými znakmi, napríklad `{version}`, `{count}` alebo `{name}`.

Ďalší jazyk vznikne prekladom celého `SK_sk.json` do jedného rovnocenného súboru, napríklad `EN_en.json`. Všetky jazykové súbory MUSIA mať rovnakú sústavu kľúčov.

Fallback poradie:

```text
zvolený jazyk → SK_sk → viditeľný kľúč
```

Chýbajúci preklad nesmie spôsobiť pád stránky.

## Povinné pravidlá pre stránky CC

- Každá stránka musí deklarovať svoju rodinu cez `data-tx-family`.
- Každá stránka rodiny `workbench` musí načítať `asset/ui/bundles/workbench.bundle.css`.
- Staré stránkové CSS môže dočasne zostať, ale nesmie prepisovať rodinné tokeny a základ okien.
- Nový viditeľný text sa nesmie natvrdo rozmnožovať vo view alebo moduloch; musí dostať kľúč v `Languages/SK_sk.json`.
- Hostiteľská vrstva musí vedieť načítať jeden zvolený jazykový súbor a použiť `SK_sk.json` ako povinný fallback.

## Migrácia

Migrácia prebieha po stránkach bez jednorazového prepisu:

1. stránka dostane rodinu a rodinný bundle,
2. jej súčasný obsah zostane funkčný,
3. hostiteľský skelet sa postupne nahradí template shellom,
4. viditeľné texty sa postupne presunú do jediného `Languages/SK_sk.json`,
5. až po overení sa odstránia staré duplicitné CSS a inline texty.

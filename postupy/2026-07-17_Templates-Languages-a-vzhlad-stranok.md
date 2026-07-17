# Templates, Languages a jednotný vzhľad stránok

**Dátum rozhodnutia:** 17. júl 2026  
**Stav:** ZÁVÄZNÝ PRACOVNÝ POSTUP

## Účel

Vzhľad, štruktúra a textový obsah stránok sa nesmú ďalej vytvárať ako izolované monolity v jednotlivých PHP súboroch.

Projekt používa dve samostatné zdrojové vrstvy:

- `/Templates` – rodiny stránok, HTML/PHP shelly, layoutové kontrakty a deklarácie potrebných assetov,
- `/Languages` – jazykové katalógy, pomenovania rozhrania a pravidlá lokalizácie.

Tieto vrstvy nemenia vlastníctvo funkčných modulov v `/CC`. Modul zostáva vlastníkom svojho správania a svojho lokálneho view; template určuje iba hostiteľskú konštrukciu stránky.

## Templates

Template nie je hotová kópia konkrétnej stránky. Je to skladateľný predpis pozostávajúci z:

1. rodiny stránky (`workbench`, `setup`, `public`, `embedded`),
2. shellu stránky,
3. zoznamu rodinných CSS a JS assetov,
4. pomenovaných slotov pre moduly,
5. malého stránkového layoutu,
6. deklarácie jazykových domén, ktoré stránka používa.

Template NESMIE obsahovať analytické výpočty, aplikačný stav ani tajné konfiguračné údaje.

## Languages

Slovenčina (`sk`) je zdrojový a povinný jazyk. Prekladový kľúč je stabilný identifikátor, nie slovenská veta.

Príklad:

```text
workbench.window.close
terrain.legend.title
common.status.loading
```

Jazykový katalóg NESMIE obsahovať HTML ani vykonateľný kód. Premenné sa zapisujú pomenovanými zástupnými znakmi, napr. `{version}` alebo `{count}`.

Fallback poradie:

```text
zvolený jazyk → sk → viditeľný kľúč
```

Chýbajúci preklad nesmie spôsobiť pád stránky.

## Povinné pravidlá pre stránky CC

- Každá stránka musí deklarovať svoju rodinu cez `data-tx-family`.
- Každá stránka rodiny `workbench` musí načítať `asset/ui/bundles/workbench.bundle.css`.
- Staré stránkové CSS môže dočasne zostať, ale nesmie prepisovať rodinné tokeny a základ okien.
- Text nového modulu sa nesmie pridať natvrdo do viacerých view; musí dostať jazykový kľúč.
- Build alebo hostiteľská vrstva musí vedieť overiť existenciu template manifestu, deklarovaných assetov a slovenského katalógu.

## Migrácia

Migrácia prebieha po stránkach bez jednorazového prepisu:

1. stránka dostane rodinu a rodinný bundle,
2. jej súčasný obsah zostane funkčný,
3. hostiteľský skelet sa postupne nahradí template shellom,
4. viditeľné texty sa postupne presunú do `/Languages`,
5. až po overení sa odstránia staré duplicitné CSS a inline texty.

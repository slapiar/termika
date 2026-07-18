# Obloha, reálna poloha Slnka, 3D oblačnosť a mapové nástroje

**Dátum:** 18. 7. 2026  
**Stav:** prvá funkčná integračná vrstva zlúčená do `main`  
**Merge commit:** `4878836abca7af90b83f06d7bf2c63cd03518ef7`

## Účel

Do mapového prostredia TermikaXC bola pridaná základná vrstva oblohy a mapových orientačných nástrojov. Implementácia pripravuje Cesium scénu na fyzikálne vyhodnocovanie oslnenia terénu, vyhľadávanie hotspotov a neskoršie zobrazovanie oblačnosti vypočítanej z TEMP, stúpavých prúdov a ich vývoja pozdĺž trate letu.

Oblačnosť sa nesmie používať ako dekoratívny alebo náhodne generovaný meteorologický výsledok. Aktuálna ukážková zostava slúži iba na overenie renderera a dátového rozhrania. Produkčné oblaky musia vznikať z vypočítaných alebo získaných meteorologických údajov.

## Implementované funkcie

### Reálna poloha Slnka a osvetlenie

- Cesium scéna používa `Cesium.SunLight`.
- Poloha a smer osvetlenia sú viazané na `viewer.clock.currentTime`.
- Zapnuté je osvetlenie glóbusu a atmosférické efekty Cesium.
- Zmena dátumu a času v Cesium hodinách mení smer dopadu slnečného žiarenia.
- Táto vrstva je základom pre budúci modul `solar-model.js`, ktorý bude počítať uhol dopadu, oslnenie bunky a terénny tieň.

### 3D oblačnosť

- Renderer používa natívny `Cesium.CloudCollection` a `Cesium.CumulusCloud`.
- Jeden meteorologický záznam sa môže skladať z viacerých priestorových oblačných častí (`puffs`).
- Poloha oblaku je geografická a výška je uvádzaná ako nadmorská výška.
- Vertikálny rozmer vzniká z rozdielu `topAltitude - baseAltitude`.
- Renderer prijíma parametre hustoty, vertikálneho vývoja, jasu, priehľadnosti a geometrických rozmerov.

### Verejné dátové rozhranie

Oblačné pole možno aktualizovať priamo:

```js
window.TermikaSkyTools.setClouds(clouds);
```

Alebo udalosťou vhodnou pre oddelené meteorologické jadro:

```js
window.dispatchEvent(new CustomEvent("termika:cloud-field", {
    detail: { clouds }
}));
```

Podporovaný záznam oblaku:

```js
{
    lat,
    lon,
    baseAltitude,
    topAltitude,
    width,
    depth,
    density,
    development,
    opacity,
    brightness,
    shade,
    puffs,
    seed
}
```

Význam hlavných polí:

- `lat`, `lon` – geografická poloha,
- `baseAltitude` – výška základne oblaku v metroch ASL,
- `topAltitude` – výška vrcholu oblaku v metroch ASL,
- `width`, `depth` – horizontálne rozmery,
- `density` – vizuálna hustota objemu,
- `development` – stupeň vertikálneho vývoja,
- `opacity` – priehľadnosť,
- `brightness`, `shade` – svetelný vzhľad,
- `puffs` – počet skladaných častí,
- `seed` – opakovateľné rozloženie tvaru.

### Quick tool dock

Do pravého horného `quick-tool-dock` boli pridané tri samostatné vypínače:

- `☀` – Slnko, obloha a fyzikálne osvetlenie,
- `☁` – 3D oblačnosť,
- `N` – smerová ružica a mapová mierka.

Tlačidlá zobrazujú aktívny stav a možno ich používať nezávisle.

### Smerová ružica

- Ružica reaguje na aktuálny heading Cesium kamery.
- Sever zostáva geograficky správny voči natočeniu pohľadu.
- Nástroj je obrazovkový HUD a nezasahuje do meteorologických výpočtov.

### Mapová mierka

- Mierka sa počíta dynamicky z prieniku obrazovkových lúčov s glóbusom.
- Zobrazená vzdialenosť sa prispôsobuje výške a sklonu kamery.
- Používajú sa čitateľné zaokrúhlené vzdialenosti v metroch alebo kilometroch.

## Umiestnenie implementácie

```text
CC/ux/workbench-shell/quick-tool-dock/
├── quick-tool-dock.view.php
├── sky-realtime-tools.js
└── sky-realtime-tools.css
```

Implementácia bola zámerne pripojená k samostatnému modulu `quick-tool-dock`, aby nevznikol zásah do jadra analýzy terénu, TEMP ani výpočtu vetra.

## Záväzné fyzikálne pravidlá

1. Poloha Slnka musí vždy vychádzať zo skutočného dátumu a času analyzovaného alebo plánovaného letu.
2. Hotspot sa nesmie určovať iba podľa vizuálne osvetleného miesta; musí byť výsledkom výpočtu geometrie terénu, oslnenia, povrchu, prúdenia a atmosférického zvrstvenia.
3. Produkčná oblačnosť sa nesmie generovať náhodne ani ručne ako predstieraný meteorologický výsledok.
4. Výška základne a vrcholu oblaku musí vychádzať z TEMP alebo z následného fyzikálneho výpočtu.
5. Poloha a vývoj oblaku na trase musia nadväzovať na vypočítané stúpavé prúdy, vietor a strih vetra.
6. Každý údaj má niesť informáciu o pôvode: meraný, modelový, interpolovaný alebo odvodený výpočtom.

## Nasledujúci krok

Vytvoriť samostatnú meteorologickú vrstvu, ktorá prevedie výsledky TEMP a modelu stúpavých prúdov na dátové pole pre `TermikaSkyTools`.

Táto vrstva má minimálne:

1. vypočítať LCL a základňu oblačnosti,
2. určiť vertikálny dosah podľa stability, inverzie a energie stúpavého prúdu,
3. určiť geografickú polohu a drift oblaku podľa vetra vo výškových hladinách,
4. rozlišovať cumulus humilis, mediocris, congestus a rozvoj smerom ku cumulonimbu podľa vypočítaných parametrov,
5. aktualizovať oblačné pole počas prehrávania času bez opätovného vytvárania celej Cesium scény,
6. používať ukážkové oblaky iba v explicitnom diagnostickom režime.

## Overenie

Prvá implementácia je dostupná v `main`. Overenie treba vykonať priamo v cieľovom mapovom prostredí po tvrdom obnovení prehliadača (`Ctrl + F5`). Pri overení sa kontroluje:

- zobrazenie troch nových tlačidiel,
- zapnutie a vypnutie oblohy,
- zobrazenie testovacích 3D oblakov,
- reakcia ružice na otáčanie kamery,
- zmena mierky pri približovaní a odďaľovaní,
- existencia `window.TermikaSkyTools`,
- správna aktualizácia oblakov cez udalosť `termika:cloud-field`.

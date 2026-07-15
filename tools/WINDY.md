# Integracia Windy Map Forecast API

## 1. Ucel

Tento zapis definuje, ako zapojit Windy mapovy vizual do TermikaXC ako doplnkovy pracovny nastroj pre pilotov.

Ciel:

- umoznit pilotovi najst situaciu na mape Windy, na ktoru je zvyknuty,
- rychlo preniest fokus do nasej mapy TermikaXC,
- pokracovat v detailnom testovani preletu, pretekov alebo scenara v nasich analyzach.

Windy vrstva je doplnok, nie nahrada hlavnej mapy TermikaXC.

## 2. Identita a stav

| Polozka | Hodnota |
|---|---|
| ID nastroja | `windy-map-bridge` |
| Nazov | Windy mapovy most (Map Forecast API) |
| Stav | `ROZPRACOVANE` |
| Prednostne prostredie | testovacia analyza + hlavna mapa TermikaXC |
| Typ | vizualny a workflow doplnok |
| Zavislost | Windy Map Forecast API (Professional pre produkciu) |

## 3. Produktove rozhodnutie

Windy mapovy vizual sa pouzije ako orientacna a navykova vrstva pre pilotov.

Workflow ma byt:

1. pilot najde oblast alebo situaciu na mape Windy,
2. potvrdi vyber,
3. TermikaXC preberie stred, zoom a pripadne cas,
4. pilot robi detailnu analyzu uz v TermikaXC.

## 4. Rozsah integracie

### Co je v rozsahu

- otvorenie Windy mapoveho pohladu v aplikacii,
- prenos polohy (lat, lon) a zoomu do TermikaXC,
- volitelny hlbkovy odkaz na windy.com pre externu kontrolu,
- ulozenie posledneho Windy fokusu do localStorage.

### Co nie je v rozsahu MVP

- uplne nahradenie Cesium mapy Windy vykreslovanim,
- priame pouzivanie nezdokumentovanych internych endpointov windy.com,
- prepis existujucej fyzikalnej logiky TermikaXC.

## 5. Technicka strategia

### 5.1 Typ integracie

Preferovana cesta:

- Windy Map Forecast API plugin (oficialna kniznica),
- samostatny panel alebo modal pre Windy mapu,
- explicitne tlacidlo "Pouzit tento fokus v TermikaXC".

### 5.2 Datovy kontrakt medzi Windy a TermikaXC

Navrhovany interni objekt:

```json
{
  "lat": 48.97,
  "lon": 20.23,
  "zoom": 9,
  "overlay": "wind",
  "level": "surface",
  "model": "ecmwf",
  "timestampIso": "2026-07-15T12:00:00Z",
  "source": "windy-map"
}
```

Minimalne povinne polia pre prenos: `lat`, `lon`, `zoom`.

### 5.3 Integracne moduly

Navrh novych suborov:

- `XC/js/tool-communication.js` - univerzalny komunikacny nastroj (kanaly + adaptery),
- `XC/js/windy-map-bridge.js` - bootstrap + inicializacia bridge vrstvy pre dostupnu Windy mapu,
- `XC/js/windy-map-adapter.js` - skeleton adaptera pre `windy-map`,
- `XC/js/windy-focus-transfer.js` - prevod fokusu na kameru TermikaXC,
- `XC/js/windy-session-state.js` - localStorage stav posledneho Windy vyberu.

Aktualny stav:

- `tool-communication.js` je implementovany,
- `windy-map-adapter.js` je implementovany so statusmi `ready/offline/error` a pokusom o auto-connect,
- `terrain-analysis-test.php` ma zapojene test tlacidla pre send/receive kanala `windy-focus`.
- `terrain-analysis-test.php` zobrazuje stav adaptera a tlacidlo na rucny pokus o pripojenie.
- `terrain-analysis-test.php` zobrazuje odznak posledneho update s casom a zdrojom.
- adapter publikuje heartbeat status pocas stavu `ready`,
- UI zobrazuje samostatny odznak zdroja (source pill) oddelene od casu posledneho update.

Navrh UI miest:

- test stranka: sekcia Windy v `XC/terrain-analysis-test.php`,
- hlavna app: panel v `XC/index.php` (map toolbar alebo drawer).

## 6. Postup implementacie

### Faza 0 - Priprava a pravidla

1. Vybavit API key a potvrdit licencny plan pre produkciu.
2. Rozhodnut, kde bude Windy panel aktivny (test, hlavna app, obe).
3. Dodat do configu server-side premenne pre kluc a povolene domény.

Vystup:

- schvaleny plan pouzitia API,
- pripraveny kluc a prostredie.

### Faza 1 - MVP panel Windy mapy

1. Pridat sekciu "Windy" do UI.
2. Zavolat Windy plugin cez oficialny bootstrap.
3. Zobrazit mapu so zakladnymi vrstvami (overlay, model, level).
4. Pre eventy pouzit `TermikaCommunicationTool` kanal `windy-focus`.

Vystup:

- Windy mapa sa zobrazi v aplikacii,
- pouzivatel vidi beznu navigaciu, na ktoru je zvyknuty.

### Faza 2 - Prenos fokusu do TermikaXC

1. Pridat tlacidlo "Pouzit tento fokus".
2. Pri kliknuti nacitat lat/lon/zoom z Windy mapy.
3. Poslat data cez `TermikaCommunicationTool.send("windy-focus", payload)`.
4. Zavolat existujuci pohyb kamery v Cesium nad rovnakym stredom.
5. Aktualizovat interny center input a diagnosticke labely.

Vystup:

- plynuly prechod z Windy orientacie do nasej analyzy.

### Faza 3 - Ukladanie a obnovenie relacie

1. Ulozit posledny Windy fokus do localStorage.
2. Pri starte ponuknut "Obnovit posledny Windy fokus".
3. Pridat reset tlacidlo na vycistenie ulozeneho fokusu.

Vystup:

- konzistentny workflow medzi relaciami.

### Faza 4 - Rozsirene prepojenie

1. Doplnit volitelny export fokusu do URL parametrov TermikaXC.
2. Doplnit deep-link generator na windy.com pre zdielanie scenara.
3. Volitelne napojit Point Forecast API cez backend proxy pre numericke porovnanie.

Vystup:

- zdielatelny workflow pre trening, briefing a preteky.

## 7. Bezpecnost a prevadzka

1. API key pre Point Forecast drzat server-side; nepublikovat citlive kluce vo frontende.
2. Pri Map Forecast dodrzat podmienky licencie a povolene domény.
3. Implementovat graceful fallback: ked Windy nie je dostupne, aplikacia bezi dalej.
4. Logovat chyby pluginu oddelene od analytickych chyb TermikaXC.

## 8. Akceptacne kriterium MVP

MVP je splnene, ak plati:

1. Windy panel sa otvori bez rozbitia existujucej mapy.
2. Pouzivatel vie jednim krokom preniest fokus do TermikaXC.
3. Preneseny fokus sedi na mape do tolerancie bezneho zoom roundingu.
4. Pri vypadku Windy sa nezastavi analyza ani ovladanie TermikaXC.

## 9. Rizika a mitigacie

1. Riziko: zmena API/licencnych podmienok.
   Mitigacia: drzat integraciu len na oficialnych API rozhraniach a sledovat changelog.
2. Riziko: kolizie CSS medzi pluginom a aplikaciou.
   Mitigacia: izolovat Windy panel v samostatnom kontajneri.
3. Riziko: odlisny modelovy cas medzi Windy a internymi vypoctami.
   Mitigacia: zobrazit povod dat a timestamp pri prenose fokusu.

## 10. Suvisiace subory

- [`../TOOLS.md`](../TOOLS.md)
- [`COMMUNICATION.md`](COMMUNICATION.md)
- [`../XC/index.php`](../XC/index.php)
- [`../XC/terrain-analysis-test.php`](../XC/terrain-analysis-test.php)
- [`../XC/js/tool-communication.js`](../XC/js/tool-communication.js)
- [`../XC/js/wind-ui.js`](../XC/js/wind-ui.js)
- [`../XC/js/wind-render.js`](../XC/js/wind-render.js)

## 11. Go/No-Go checklist pre letovy test

Pred realnym letovym testom spustit v testovacej stranke `XC/terrain-analysis-test.php` tento rychly checklist.

### Go podmienky

1. Badge stavu adaptera je `ready` aspon 30 sekund bez prepadu do `error`.
2. Odznak posledneho update sa obnovuje pravidelne (heartbeat) bez zamrznutia casu.
3. Tlacidlo "Pouzit tento fokus" prenesie fokus do Cesium mapy v jednej akcii.
4. Preneseny fokus sedi vizualne v tolerancii bezneho zoom roundingu.
5. Pri reload stranky nevznikaju duplicity listenerov ani duplicitne status logy.

### No-Go podmienky

1. Adapter sa opakovane prepina `ready -> error -> ready` bez zjavnej priciny.
2. Posledny update ostane dlhsie ako 60 s bez heartbeat pri stale aktivnom adapteri.
3. Focus transfer prebehne len obcas alebo vyzaduje viacnasobne kliknutie.
4. Po odpojeni Windy zamrzne UI alebo prestane reagovat analyza.
5. Konzola obsahuje opakovane chyby validacie payloadu `windy-focus`.

### Operacny postup pri No-Go

1. Spustit `window.TermikaCommunicationTool.runSmokeTest()` v konzole a ulozit report.
2. Skontrolovat status badge + source badge + cas posledneho update.
3. Overit, ci bezi iba jedna instancia adaptera a bridge bootstrapu.
4. Az po stabilnom smoku vratit scenar do letoveho testu.

### API kľúče Windy
Map Forecast

mPvyfWaJ2kFngdEITyhg1BYzZlCijvlG

Issued on 24. 2. 2019

Point Forecast

iqdFujsB7b7FhkKAg4CK8aIvABrntb89

Issued on 15. 7. 2026

Map Forecast

WHXfj9GBOmQtF0uhLyWqxa06C4NtpUIw

Issued on 15. 7. 2026

Webcams

sGQwIUnY7lq8PHgCQsFMszyAcFkAUPF8

Issued on 15. 7. 2026

Plugins

pdy26NObTWzKkrXzbpKbrJuP3cVSoBKx

Issued on 15. 7. 2026
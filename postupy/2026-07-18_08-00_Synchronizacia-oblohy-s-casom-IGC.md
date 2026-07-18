# Synchronizácia oblohy s časom IGC

Dátum: 18. 7. 2026

## Prijaté rozhodnutie

Bez načítaného IGC používa obloha aktuálny čas zariadenia. Po načítaní platného IGC sa zdrojom času stáva dátum z hlavičky `HFDTE` a čas jednotlivých `B` záznamov.

## Implementácia

Modul `sky-realtime-tools.js` sa pripája na `PilotNetwork` bez zásahu do fyzikálneho spracovania IGC:

- pri `pripravPrehravanieLetu()` nastaví `viewer.clock.startTime`, `stopTime` a `currentTime`,
- pri každom `posunNaIndex()` nastaví Cesium čas podľa aktuálneho bodu letu,
- v režime IGC je `viewer.clock.shouldAnimate = false`, pretože čas riadi prehrávač IGC,
- pri prechode letu cez polnoc sa čas nasledujúceho dňa dopočíta z rozdielu sekúnd,
- ak IGC nemá platný dátum, systém sa vráti k aktuálnemu času zariadenia.

IGC čas sa interpretuje ako UTC podľa formátu IGC.

## Zobrazenie

Pod navigačnou lištou vľavo hore sa zobrazuje značka:

```text
DD. MM. RRRR: HH:MM:SS
```

Farba a vizuál zodpovedajú kamerovému HUD. Značka sa mení pri prehrávaní aj pri ručnom posune časovej osi.

Pomocný text pod názvom `TermikaXC Test Navigator` sa pri inicializácii odstráni, aby navigačná lišta nezaberala zbytočnú výšku.

## Dotknuté súbory

- `CC/ux/workbench-shell/quick-tool-dock/sky-realtime-tools.js`
- `CC/ux/workbench-shell/quick-tool-dock/sky-realtime-tools.css`
- `CC/ux/workbench-shell/quick-tool-dock/quick-tool-dock.view.php`

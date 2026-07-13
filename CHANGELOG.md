# Changelog

Tento súbor zachytáva významné používateľské, analytické a architektonické zmeny projektu TermikaXC.

Záznam sa zavádza od pracovného obdobia po release `v2.6.9`. Staršie verzie zatiaľ nie sú spätne rekonštruované, aby sa do histórie nedopĺňali neoverené údaje.

## Nezaradené do release

### Pridané

- Vrstva B1 – viacmierkové morfologické susedstvo nad lokálnou geometriou A.
  - tri mierky susedstva podľa aktuálneho rozostupu vzoriek,
  - osem smerových profilov,
  - lokálna relatívna poloha, reliéf širšieho okolia, pomer vyšších a nižších susedov,
  - kvalita a úplnosť dostupného susedstva,
  - samostatná diagnostická karta bez predstierania konečnej morfologickej roly.
- Terénny mesh M1 ako výpočtová kostra krajiny.
  - vrcholy, unikátne hrany a trojuholníkové plochy,
  - morfologicky pripravená voľba diagonály podľa výškovej a geometrickej kontinuity,
  - normálové vektory, sklon, orientácia, skutočná 3D plocha a horizontálna projekcia každej plochy,
  - dĺžky hrán, dihedrálne uhly a pracovná intenzita geometrického rozhrania,
  - voliteľný drôtený model v Cesium,
  - diagnostika topológie vybraného bodu.
- Rýchle tlačidlo `Test terénu` na hlavnej stránke, ktoré otvorí testovaciu stránku v novej karte.
- Farebný pásik základnej rodiny v karte `Skutočne vykreslená farba`.
- Režim opakovaného prepočtu aktuálneho fokusu po zmene polomeru alebo rozostupu vzoriek bez potreby znovu vyberať stred v mape.

### Technické rozhodnutia

- Mesh nie je iba vizualizácia. Je spoločnou topologickou vrstvou pre budúcu energetickú bilanciu plôch a dynamické účinky geometrických rozhraní na prízemné prúdenie.
- Morfologická rola B zostáva oddelená od lokálnej geometrie A.
- Konečné `hRel`, `dRel`, výškové tieňovanie a morfologický význam hrán sa nesmú predstierať skôr, než ich vypočíta širšia morfologická analýza.

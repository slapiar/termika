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
  - priebežný odhad veľkosti podkladovej mriežky,
  - približný počet bodov vo viditeľnom kruhu,
  - hustota bodov na km²,
  - orientačná výpočtová náročnosť.
- Svetlozelený kamerový HUD v testovacej 3D scéne.
  - vodorovné pravítko azimutu so svetovými stranami,
  - zvislé pravítko vertikálneho uhla pohľadu,
  - priebežné hodnoty azimutu, pitch, roll a výšky kamery,
  - orientačné AGL podľa aktuálne načítanej výšky terénu,
  - stredový zameriavací kríž,
  - samostatné zapnutie a vypnutie v mapových vrstvách.
- Samostatný dokumentačný systém nástrojov.
  - koreňový register `TOOLS.md`,
  - adresár `tools/` pre dokumentáciu jednotlivých doplnkov,
  - prvý referenčný dokument `tools/HUD.md` s opisom prvkov, ovládania, významu údajov, závislostí, verejného rozhrania a obmedzení.

### Overené používateľom

- Kamerový HUD bol 13. 7. 2026 úspešne overený pri pohybe v reálnej 3D scéne.
  - grafické stvárnenie bolo prijaté bez požiadavky na korekciu,
  - svetlozelené pravítka, živé uhlové údaje, výška kamery a zameriavací prvok vytvárajú prirodzený letecký prístrojový dojem,
  - základný grafický jazyk HUD-u je schválený pre budúce rozšírenie o meteorologické veličiny a vektory prúdenia.

### Technické rozhodnutia

- Mesh nie je iba vizualizácia. Je spoločnou topologickou vrstvou pre budúcu energetickú bilanciu plôch a dynamické účinky geometrických rozhraní na prízemné prúdenie.
- Morfologická rola B zostáva oddelená od lokálnej geometrie A.
- Konečné `hRel`, `dRel`, výškové tieňovanie a morfologický význam hrán sa nesmú predstierať skôr, než ich vypočíta širšia morfologická analýza.
- Kamerový HUD je iba vizualizácia stavu kamery. Nesmie meniť analytické výsledky ani zamieňať kartografickú výšku Cesium za overenú meteorologickú AMSL.
- Používateľské nástroje sa dokumentujú oddelene od analytických postupov: `TOOLS.md` je centrálny register, `tools/*.md` sú používateľské a technické karty nástrojov a `postupy/` zachytávajú vývojové rozhodnutia.

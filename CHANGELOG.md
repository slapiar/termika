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
- Plošná výplň terénneho meshu M1.2 ako samostatný analytický a vizualizačný modul.
  - dominantná rodina G01–G16 podľa troch vrcholov plochy a bezprostredného susedstva,
  - váženie vlastných vrcholov vyššou váhou než okolitých bodov,
  - miera dôvery dominantnej rodiny každej plochy,
  - vizuálne spájanie susedných trojuholníkov rovnakej rodiny do celistvých oblastí,
  - samostatné zapnutie a vypnutie výplne nezávisle od drôteného modelu,
  - režim `Dominantná G01–G16`,
  - režim `Jednotná šedá`,
  - diagnostická karta plošnej výplne.
- Prepínač základnej obrazovej mapy Cesium.
  - skrytie aktuálnych obrazových vrstiev pri zachovaní 3D reliéfu,
  - neutrálne tmavé pozadie glóbusu bez podkladu,
  - obnovenie predchádzajúceho stavu obrazových vrstiev,
  - zachovanie farebných bodov, vrstevníc, meshu, HUD-u a diagnostiky.
- Dynamické zobrazenie aktuálnej release verzie v hlavičke testovacieho ovládacieho panela.
  - zdrojom je koreňový súbor `RELEASE_VERSION`,
  - verzia sa načítava bez použitia starej cache,
  - rovnaká hodnota sa zobrazí aj v titulku karty prehliadača.
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
  - `tools/HUD.md`,
  - `tools/MESH.md`,
  - `tools/BASEMAP.md`,
  - `tools/RELEASE.md`.

### Overené používateľom

- Kamerový HUD bol 13. 7. 2026 úspešne overený pri pohybe v reálnej 3D scéne.
  - grafické stvárnenie bolo prijaté bez požiadavky na korekciu,
  - svetlozelené pravítka, živé uhlové údaje, výška kamery a zameriavací prvok vytvárajú prirodzený letecký prístrojový dojem,
  - základný grafický jazyk HUD-u je schválený pre budúce rozšírenie o meteorologické veličiny a vektory prúdenia.

### Technické rozhodnutia

- Mesh nie je iba vizualizácia. Je spoločnou topologickou vrstvou pre budúcu energetickú bilanciu plôch a dynamické účinky geometrických rozhraní na prízemné prúdenie.
- Drôtená topológia meshu a plošná výplň zostávajú v samostatných moduloch. Plošný renderer nesmie meniť vrcholy, hrany ani fyzikálne trojuholníky.
- Celistvé farebné oblasti M1.2 sú zatiaľ vizuálnym spojením susedných trojuholníkov rovnakej rodiny; nejde ešte o topologicky zlúčené mnohouholníky.
- Morfologická rola B zostáva oddelená od lokálnej geometrie A.
- Konečné `hRel`, `dRel`, výškové tieňovanie a morfologický význam hrán sa nesmú predstierať skôr, než ich vypočíta širšia morfologická analýza.
- Kamerový HUD je iba vizualizácia stavu kamery. Nesmie meniť analytické výsledky ani zamieňať kartografickú výšku Cesium za overenú meteorologickú AMSL.
- Skrytie základnej mapy vypína iba obrazové vrstvy Cesium; 3D glóbus, reliéf a analytické vrstvy zostávajú aktívne.
- Používateľské nástroje sa dokumentujú oddelene od analytických postupov: `TOOLS.md` je centrálny register, `tools/*.md` sú používateľské a technické karty nástrojov a `postupy/` zachytávajú vývojové rozhodnutia.
# Changelog

Tento súbor zachytáva významné používateľské, analytické a architektonické zmeny projektu TermikaXC.

Záznam sa zavádza od pracovného obdobia po release `v2.6.9`. Staršie verzie zatiaľ nie sú spätne rekonštruované, aby sa do histórie nedopĺňali neoverené údaje.

## Nezaradené do release

### Pridané

- Dokumentačná a architektonická vetva `WIND v2` pre fokusovo orientované ukladanie vetra.
  - nový dokument `postupy/WIND-noty-v2.md` s koncovým rozhodnutím `Fokus-first` (`Cesium = Zem`, `binárne polia = dátová pravda`, `WebM = výkonová cache`),
  - nový návrh schémy manifestu `postupy/WIND-focus-manifest-schema-v1.json`,
  - nový technický návrh binárneho formátu poľa `postupy/WIND-binarne-pole-format-v1.md`,
  - nové retenčné profily `postupy/WIND-retencne-profily-v1.md` pre 50 GB, 200 GB a 1 TB,
  - nový ukážkový manifest `postupy/WIND-focus-manifest-example-v1.json`.
- CLI validačný checker manifestu vetra.
  - nový nástroj `tools/validate-wind-focus-manifest.php`,
  - validácia povinných polí, časov, hashov, vrstiev, encodingu a väzby render cache na hash binárnej vrstvy,
  - jednoznačné návratové kódy (`0` validné, `1` nevalidné, `2` chybné volanie alebo vstupný súbor).
- Integrácia WIND vrstvy do testovacej stránky terénnej analýzy.
  - `XC/terrain-analysis-test.php` načítava `wind-field`, `wind-render`, `wind-ui`,
  - nové UI ovládanie pre WIND (zapnutie vrstvy, AGL, rozostup, základná rýchlosť, smer, použitie TEMP profilu),
  - WIND výpočet sa spúšťa po terénnej analýze v rovnakom pracovnom fokuse,
  - clear akcia odstraňuje aj veternú vrstvu.
- Modulárne rozšírenie správania vetra cez efektové moduly.
  - nový registrátor `XC/js/wind-effects-core.js`,
  - nový efekt `XC/js/wind-effect-terrain.js` (terrain steering zo sklonu, orientácie svahu a krivosti),
  - nový efekt `XC/js/wind-effect-surface.js` (povrchovo-teplotný kontrast + indikátor triggeru bubliny),
  - `XC/js/wind-field.js` aplikuje efekty modulárne a po nich prepočítava konvergenciu.
- Začiatok prechodu WIND na 3D dátový model podľa postupu `postupy/WIND-terenne-interakcie-vektorova-algebra-v1.md`.
  - `XC/js/wind-field.js` už nepoužíva iba jednu spoločnú výšku `surfaceAltM` pre celé pole,
  - každá bunka má lokálnu `terrain_height_msl`, `clearance_agl`, `height_msl` a základné `w_ms`,
  - TEMP profil sa vzorkuje po bunkách podľa lokálnej cieľovej výšky (nie jednou globálnou hladinou),
  - pre každú bunku sa evidujú indexy použitých TEMP hladín (`source_temp_lower_index`, `source_temp_upper_index`).
  - `XC/js/wind-effect-terrain.js` prešiel na 3D interakciu s terénom: výpočet normály zo sklonu/aspektu, nepenetrujúca projekcia vektora pri `V·n < 0` a aktualizácia `w_ms` podľa terénneho vplyvu a clearance.
  - `XC/js/wind-effect-terrain.js` dopĺňa pracovné flow stavy `ATTACHED | SEPARATING | SEPARATED | REATTACHING` z kombinácie lokálnej 3D interakcie a blízkosti hrán meshu (`breakStrength`, `dihedralDeg`).
  - `XC/js/wind-render.js` pripája `flow_state` do vlastností vykreslených prúdnic a začína etapový 3D integrátor dráhy s kolíznou kontrolou proti terénu (adaptívne skracovanie `dt`, odmietnutie kroku pri riziku preniknutia pod povrch).
- Rozšírený render vetra s riadením vizuálneho jazyka a voliteľnou animáciou.
  - `XC/js/wind-render.js` podporuje farebné režimy `tempDeltaK`, `speed`, `convergence`,
  - podpora tém pre tmavé a svetlé pozadie,
  - voliteľná animácia smeru toku cez pohyblivý marker po prúdnici,
  - `XC/terrain-analysis-test.php` dopĺňa prepínače farebnosti, prepínač animácie a prepínač intenzity animácie (`nízka/stredná/vysoká/auto`),
  - režim `auto` prepína profil intenzity podľa meraného FPS a pri zmene profilu vykoná re-render bez potreby nového výpočtu poľa,
  - vo WIND paneli je živý indikátor `FPS | AUTO profil`.
- Pridaná samostatná MVP kostra meteorologického prvku `WIND` bez integrácie do existujúcich stránok, aby nezasahovala do rozpracovaných commitov.
  - nový modul `XC/js/wind-field.js` pre výpočet 2D veterného poľa pri zemi (AGL), odhad `tempDeltaK` a pracovnú convergenciu,
  - nový modul `XC/js/wind-render.js` pre vykreslenie prúdnic so smerovými šípkami, farbou podľa teplotného kontrastu a hrúbkou podľa rýchlosti,
  - nový modul `XC/js/wind-ui.js` pre bezpečné demo spustenie, čistenie vrstvy a diagnostické zhrnutie bunky.
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

### Opravené

- Zobrazenie release verzie po prvom používateľskom teste.
  - pôvodné HTTP načítanie mohlo dostať HTML dokument a príliš benevolentná normalizácia ho zobrazila v hlavičke,
  - nový endpoint `XC/release-version.php` číta `RELEASE_VERSION` priamo zo súborového systému,
  - endpoint aj klient používajú prísnu validáciu verzie,
  - HTML alebo iný neplatný obsah sa už nemôže zobraziť ako verzia.
- Plošný renderer meshu M1.2 po prvom používateľskom teste.
  - všeobecnú asynchrónnu `PolygonGeometry` nahradil synchronný renderer rovinných trojuholníkov `COPLANAR_TRIANGLE_PRIMITIVE_V2`,
  - pribudla stavová diagnostika počtu pripravených a vykreslených plôch,
  - chyba rendereru sa zobrazuje priamo v ovládacom paneli aj v stavovom výpise,
  - diagnostika bodu uvádza stav rendereru a počet vykreslených plôch.

### Overené používateľom

- Kamerový HUD bol 13. 7. 2026 úspešne overený pri pohybe v reálnej 3D scéne.
  - grafické stvárnenie bolo prijaté bez požiadavky na korekciu,
  - svetlozelené pravítka, živé uhlové údaje, výška kamery a zameriavací prvok vytvárajú prirodzený letecký prístrojový dojem,
  - základný grafický jazyk HUD-u je schválený pre budúce rozšírenie o meteorologické veličiny a vektory prúdenia.

### Technické rozhodnutia

- Pri historickom ukladaní vetra zostávajú autoritatívnym zdrojom binárne vrstvy viazané na fokus; render video (`WebM`) je iba výkonová cache a nesmie nahradiť fyzikálny zdroj pravdy.
- Modul `WIND` sa ďalej rozširuje cez samostatné efektové moduly (`wind-effects-*`) namiesto pevného monolitického výpočtu, aby bolo možné transparentne zapínať a vypínať jednotlivé vplyvy.
- Mesh nie je iba vizualizácia. Je spoločnou topologickou vrstvou pre budúcu energetickú bilanciu plôch a dynamické účinky geometrických rozhraní na prízemné prúdenie.
- Drôtená topológia meshu a plošná výplň zostávajú v samostatných moduloch. Plošný renderer nesmie meniť vrcholy, hrany ani fyzikálne trojuholníky.
- Celistvé farebné oblasti M1.2 sú zatiaľ vizuálnym spojením susedných trojuholníkov rovnakej rodiny; nejde ešte o topologicky zlúčené mnohouholníky.
- Morfologická rola B zostáva oddelená od lokálnej geometrie A.
- Konečné `hRel`, `dRel`, výškové tieňovanie a morfologický význam hrán sa nesmú predstierať skôr, než ich vypočíta širšia morfologická analýza.
- Kamerový HUD je iba vizualizácia stavu kamery. Nesmie meniť analytické výsledky ani zamieňať kartografickú výšku Cesium za overenú meteorologickú AMSL.
- Skrytie základnej mapy vypína iba obrazové vrstvy Cesium; 3D glóbus, reliéf a analytické vrstvy zostávajú aktívne.
- Používateľské nástroje sa dokumentujú oddelene od analytických postupov: `TOOLS.md` je centrálny register, `tools/*.md` sú používateľské a technické karty nástrojov a `postupy/` zachytávajú vývojové rozhodnutia.

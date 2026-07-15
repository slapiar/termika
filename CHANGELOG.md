# Changelog

Tento súbor zachytáva významné používateľské, analytické a architektonické zmeny projektu TermikaXC.

Záznam sa zavádza od pracovného obdobia po release `v2.6.9`. Staršie verzie zatiaľ nie sú spätne rekonštruované, aby sa do histórie nedopĺňali neoverené údaje.

## Nezaradené do release

### Pridané

- Hlavný panel aplikácie (`XC/index.php`) má kompaktné režimy generácií vetra cez tri radio voľby.
  - `Zachovať poslednú generáciu`,
  - `Vymazať poslednú generáciu`,
  - `Vymazať všetky generácie z mapy`.
- Automatické ukladanie každého výpočtu do lokálneho úložiska `GENauto/` v koreňi projektu.
  - nový endpoint `XC/genauto.php` pri prvom použití automaticky vytvorí adresáre `GENauto/map` a `GENauto/wind`,
  - každá generácia sa zapisuje samostatne pre mapu a vietor,
  - názov súboru obsahuje UTC dátum a čas generácie aj súradnice stredu fokusu,
  - obsah súboru nesie metadáta stredu a payload danej generácie.
- WIND generácie už ukladajú aj WebM cache pod rovnakým basename ako JSON.
  - WebM súbor má rovnaký názov ako JSON záznam, len s príponou `.webm`,
  - cache sa ukladá mimo `XC/` do koreňového `GENauto/wind`,
  - prehranie cache ide cez serverový stream endpoint `XC/genauto.php?action=getWebm`.
- V paneli pribudli porovnávacie prepínače pre uložené generácie.
  - WIND selector prepína medzi uloženými WIND cache a pri existujúcom WebM prehrá uložený vizuál,
  - map selector prepína medzi uloženými mapovými generáciami,
  - obidva prepínače pracujú nad dnešným `GENauto/` zoznamom bez nutnosti prepočtu všetkého naraz.
- Rovnaké ovládanie generácií a porovnávania je doplnené aj v testovacej stránke.
  - `XC/terrain-analysis-test.php` používa 3 radio režimy generácie vetra (`keep`, `clear-last`, `clear-all`),
  - test panel obsahuje tlačidlá pre ručné `clearToday`, načítanie WIND/MAP zo súborov a samostatné WIND/MAP compare selectory,
  - test workflow pri výpočte automaticky ukladá map aj wind generácie do `GENauto/` pre následné porovnanie.
- Nové ručné operácie pre denný workflow generácií.
  - tlačidlo `Vymazať dnešné GENauto` maže dnešné mapové aj veterné záznamy a zároveň čistí vrstvy z mapy,
  - tlačidlo `Načítať vietor zo súborov` obnoví dnešné veterné generácie z `GENauto/wind` späť do scény,
  - tlačidlo `Načítať mapu zo súborov` načíta dnešné mapové generácie z `GENauto/map`.
- Vizualizácia historických mapových generácií v scéne Cesium.
  - načítané mapové generácie sa vykresľujú ako body so stručným časovým popisom a režimom generácie,
  - medzi bodmi sa kreslí spojnicová trasa fokusov,
  - render je oddelený v samostatnej vrstve `GENAUTO_MAP_POINTS`.
- Automatické zaostrenie kamery po importe mapových generácií.
  - pri viacerých bodoch sa použije `flyToBoundingSphere` na celý rozsah dát,
  - pri jedinom bode sa použije `flyTo` na daný fokus s bezpečnou výškou.

- Nový režim farbenia vetra podľa vertikálneho pohybu.
  - `XC/js/wind-render.js` podporuje nový `colorMode = verticalMotion`,
  - v `XC/terrain-analysis-test.php` pribudla voľba `Vertikálny pohyb (stúpanie/klesanie)`.
- Dynamická legenda farieb vetra pre všetky režimy zobrazenia.
  - `XC/terrain-analysis-test.php` zobrazuje živú legendu pre režimy `tempDeltaK`, `speed`, `convergence`, `verticalMotion`,
  - legenda sa automaticky aktualizuje pri zmene režimu alebo témy farieb.
- Rozšírené ovládanie testovacieho fokusu v paneli.
  - `XC/terrain-analysis-test.php` má nové ručné zadanie stredu vo formáte `lat, lon`,
  - nové tlačidlo na okamžitý presun kamery nad zadaný stred do výšky 3000 m ASL,
  - marker a text stredu sa po ručnom zadaní synchronizujú s mapou.
- Rozšírený diagnostický log vstupov pred spustením analýzy.
  - testovací panel vypisuje `VSTUPY ANALÝZY` a `VSTUPY WIND` vrátane polomeru fokusu, rozostupu, režimov a zdroja TEMP,
  - doplnené hlásenie `WIND TEMP zdroj` s reálne použitým zdrojom profilu (`settings`, `PilotNetwork`, `cache`, `WindTempLoader`).
- Samostatný mapový prepínač viditeľnosti geometrie reliéfu.
  - v `XC/terrain-analysis-test.php` je v časti mapových vrstiev nový checkbox `Zobraziť geometriu reliéfu`,
  - prepína iba render vrstvy, nie samotný výpočet geometrickej analýzy.
- Natívny režim záznamu videa priamo z Cesium canvasu v testovacej stránke.
  - v `XC/terrain-analysis-test.php` pribudla sekcia `Záznam videa` (FPS 30/60, kvalita normal/high, auto-hide pomocných okien),
  - nové tlačidlo `Start recording / Stop recording` používa `MediaRecorder` nad `canvas.captureStream(...)`,
  - po zastavení záznamu sa video automaticky exportuje do súboru (`WebM` podľa podpory browsera),
  - pribudol REC badge s časovačom a stavové hlášky o štarte, stopnutí a exporte.
- Nový dokumentovaný postup pre snímanie a web export videa.
  - nový súbor `postupy/MEDIArecord.md` popisuje OBS workflow, natívny one-click record v appke a odporúčané exportné parametre pre web.

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
  - priestorový samplovací krok `sampleWindVector3D(lat, lon, heightMsl)` interpoluje `u`, `v` a termodynamické veličiny medzi skutočnými susednými TEMP hladinami a nespolieha sa na pevné AGL prírastky,
  - 3D integrátor v testovacej stránke prechádza po dráhe znovu podľa aktuálnej polohy a aktuálnej MSL výšky, nie podľa jednej horizontálne najbližšej bunky.
  - `XC/js/wind-effect-terrain.js` prešiel na 3D interakciu s terénom: výpočet normály zo sklonu/aspektu, nepenetrujúca projekcia vektora pri `V·n < 0` a aktualizácia `w_ms` podľa terénneho vplyvu a clearance.
  - `XC/js/wind-effect-terrain.js` dopĺňa pracovné flow stavy `ATTACHED | SEPARATING | SEPARATED | REATTACHING` z kombinácie lokálnej 3D interakcie a blízkosti hrán meshu (`breakStrength`, `dihedralDeg`).
  - `XC/js/wind-render.js` pripája `flow_state` do vlastností vykreslených prúdnic a začína etapový 3D integrátor dráhy s kolíznou kontrolou proti terénu (adaptívne skracovanie `dt`, odmietnutie kroku pri riziku preniknutia pod povrch).
- Rozšírený render vetra s riadením vizuálneho jazyka a voliteľnou animáciou.
  - `XC/js/wind-render.js` podporuje farebné režimy `tempDeltaK`, `speed`, `convergence`,
  - podpora tém pre tmavé a svetlé pozadie,
  - voliteľná animácia smeru toku cez súvislý prúd pohyblivých úsečiek a šípok po prúdnici,
  - základná farba prúdnice je `#70E8FF`, aby bola veterná vrstva čitateľnejšia na tmavom podklade,
  - animované úsečky sú tmavšie než základná čiara a ich dĺžka aj rozostup sa viažu na rýchlosť vetra,
  - hrebeň a závetrie majú vlastné profilovanie výšky, dĺžky a počtu animovaných segmentov, aby tok pôsobil plastickejšie pri prechode cez terénnu hranu,
  - `XC/js/wind-temp-loader.js` zavádza samostatný TEMP loader s režimami `auto` (`Windy → stanica → súbor`), `windy`, `station` a `file`,
  - ak TEMP profil nie je k dispozícii, `XC/js/wind-ui.js` ho automaticky načíta cez tento loader a bez neho sa WIND vrstva nespustí,
  - TEMP sa pri samplovaní medzi hladinami prepočítava nelineárne cez potenciálnu teplotu a logaritmický tlakový blend, nie prostým lineárnym `t`,
  - `XC/terrain-analysis-test.php` dopĺňa prepínače farebnosti, prepínač animácie a prepínač intenzity animácie (`nízka/stredná/vysoká/auto`),
  - v testovacej stránke je nový výber zdroja TEMP a URL polia pre Windy/stanicu/súbor,
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

- Upravené segmentové farbenie prúdnic vo vertikálnom režime podľa celej dráhy trendu.
  - červenou je vyznačený celý úsek, kde výška prúdnice rastie,
  - modrou je vyznačený celý úsek, kde výška prúdnice klesá,
  - úseky s takmer nulovou zmenou výšky ostávajú svetlošedé,
  - `XC/js/wind-field.js` aj `XC/js/wind-effect-terrain.js` používajú konzistentnú obojstrannú projekciu do dotykovej roviny terénu, aby boli stúpanie aj klesanie prirodzene viditeľné.

- Oprava konzistencie TEMP cache a logovania zdroja profilu.
  - `XC/js/wind-ui.js` drží `lastTempProfile` aj `lastTempSource`,
  - pri ďalšom behu sa TEMP profil korektne berie z cache, ak je dostupný,
  - odstránená nekonzistentná situácia „TEMP profil (cache)“ a následné „TEMP profil chýba...“ v tom istom výpočte.
- Odstránenie umelo generovaného prúdenia v prízemnej WIND vrstve.
  - `XC/js/wind-field.js` už negeneruje syntetický drift/cooling zóny ani fallback vektor mimo TEMP poľa,
  - bez TEMP profilu sa výpočet zastaví chybou (žiadne tiché dopĺňanie vetra),
  - `XC/js/wind-render.js` už nenabaľuje vertikálny moment medzi krokmi,
  - `XC/js/wind-effect-terrain.js` používa iba nepenetračnú projekciu na normálu terénu bez heuristického speed-scalingu,
  - `XC/terrain-analysis-test.php` používa v aktívnych efektoch iba `terrain-steering`.
- Odstránený pevný horný limit veľkosti mriežky pre geometriu terénu.
  - `XC/js/terrain-analysis.js` už nemá fixné obmedzenie `rows/cols <= 101`,
  - validácia pre `rows`/`cols` používa minimálnu hranicu a nekonečný horný rozsah,
  - do vstupného logu pribudol odhad veľkosti mriežky (`X×Y`, počet bodov) pred výpočtom.

- Viditeľnosť animácie vetra v testovacej stránke.
  - `XC/js/wind-render.js` používa pre animovaný vektor reálny čas (`performance.now`) namiesto závislosti na scénickom čase,
  - `XC/terrain-analysis-test.php` explicitne zapína `viewer.clock.shouldAnimate = true`,
  - animovaný segment sa preto hýbe aj v konfiguráciách, kde bol Cesium clock predtým prakticky statický.
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

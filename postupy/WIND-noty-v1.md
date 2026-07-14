# WIND noty v1 (naviazanie na meteo-core)

## Čo už vieme použiť z meteo-core

Meteo jadro už poskytuje dáta a funkcie, ktoré sa dajú okamžite použiť pre vietor:

- tlaková, teplotná a vlhkostná štruktúra TEMP profilu (`p_hpa`, `z_m`, `T_c`, `Td_c`),
- vietor po hladinách (`w_dir_deg`, `w_speed_kts`),
- LCL (`vypocitajLclDetail`, `vypocitajLclZProfily`),
- dráha častice (`vypocitajDrahuCastice`),
- 3D drift komína (`vypocitaj3DDriftKomina`) s prepnutím KOMÍN/BUBLINY.

## Čo meteo-core zatiaľ nedáva priamo

- horizontálne pole vetra nad mapou,
- mapu teploty povrchu,
- mapu podkladov (ľadovec/sneh/voda/vegetácia),
- priame pole konvergencie/divergencie v priestore.

Preto WIND v1 skladá pole z:

- vertikálneho TEMP profilu (smer + rýchlosť vo výške),
- lokálnej mriežky analyzovanej oblasti,
- terénneho modelu Cesium,
- výpočtu konvergencie z poľa `u, v`.

## Základné metodické pravidlo

Letové hladiny, meteorologické hodnoty ani terénne vlastnosti sa nesmú hádať, dopĺňať placeholdermi ani nahrádzať vymyslenými fallback údajmi.

Každá výška, vrstva a fyzikálna vlastnosť musí vzniknúť:

- z reálne načítaného TEMP,
- z reálnej výšky a geometrie terénu Cesium,
- alebo z jednoznačne označeného výpočtu odvodeného z týchto zdrojov.

Interpolácia je prípustná iba medzi platnými reálnymi bodmi TEMP. Hodnota mimo meraného rozsahu sa nesmie bez označenia vydávať za reálny údaj.

Každý odvodený výsledok musí niesť pôvod údajov, čas platnosti, verziu modelu a mieru dôveryhodnosti.

## Noty pre vietor (špecifikácia)

### Nota 1 – výška a atmosférická vrstva

- reálna výška terénu sa získa z Cesium,
- výška bodu nad terénom sa počíta ako `heightAGL = tempHeightMSL - surfaceAltM`,
- atmosférické vrstvy sa nevytvárajú vopred pevnými ukážkovými AGL hladinami,
- hranice vrstiev vznikajú výpočtom zo zmien reálneho TEMP profilu, napríklad zo zmeny teplotného gradientu, inverzie, vlhkosti, smeru alebo rýchlosti vetra a strihu,
- cieľová výška pre lokálny výpočet sa vždy musí viazať na reálnu výšku terénu a platný rozsah TEMP.

### Nota 2 – prevod smeru vetra

- `w_dir_deg` je meteorologický smer „odkiaľ fúka“,
- pre advekciu do mapy použiť:
  - `u = -sin(dir) * speed`,
  - `v = -cos(dir) * speed`.

### Nota 3 – terénna korekcia

Terénna korekcia nesmie byť založená na demonštračných zónach. Musí vychádzať z reálnej geometrie terénu a neskôr aj z reálnych vlastností povrchu.

Požadované odvodené veličiny:

- sklon a orientácia svahu,
- lokálna normála povrchu,
- zakrivenie terénu,
- hrebene, sedlá, údolia a závetrné oblasti,
- zrýchlenie prúdu,
- odklon prúdenia,
- stlačenie alebo rozšírenie prúdu,
- zmena vertikálnej zložky.

### Nota 4 – konvergencia/divergencia

- z poľa `u, v` počítať divergenciu:
  - `div = du/dx + dv/dy`,
  - `convergence = -div`,
- neskôr rozšíriť na plný 3D priestor podľa vypočítaných atmosférických vrstiev.

### Nota 5 – vizuálna notácia

- prúdnice idú po integrovanom poli,
- šípka na konci prúdnice ukazuje smer toku,
- farba sa môže viazať na zvolenú fyzikálnu veličinu,
- hrúbka sa môže viazať na `speed_ms`,
- vizualizácia je iba mapová vrstva nad spoločným priestorovým modelom; nie je zdrojom fyzikálnych údajov.

### Nota 6 – diagnostika bodu

Minimálne polia pre klik:

- `speed_ms`, `dir_deg`, `u_ms`, `v_ms`, neskôr `w_ms`,
- `temp_air_c`, `dewpoint_c`, `pressure_hpa`,
- `convergence`, `divergence`, `shear`,
- `terrain_alt_msl`, `height_agl_m`,
- `confidence`,
- `source_temp_hash`, `terrain_version`, `model_version`,
- čas výpočtu a čas platnosti údajov.

## Spoločný priestorový model

TermikaXC nebude ukladať obrázkové mapové dlaždice ako fyzikálny základ. Základom je spoločný vektorový/drôtený model priestoru v metodike kompatibilnej s Cesium.

Treba rozlišovať:

1. **Geometriu** – vrcholy reálneho terénu a neskôr aj priestoru.
2. **Topológiu** – väzby vrcholov do spojitých plôch a objemov.
3. **Fyzikálne vrstvy** – vietor, teplota, tlak, vlhkosť, strih, konvergencia a ďalšie odvodené vlastnosti.
4. **Čas** – platnosť jednotlivých meteorologických stavov.
5. **Pôvod a verziu** – TEMP, zdroj terénu, verzia výpočtového modelu, presnosť a dôveryhodnosť.

Každý vypočítaný bod sa zachová. Optimalizácia nesmie znamenať vynechávanie bodov ani znižovanie presnosti.

Zároveň každý bod nemusí byť samostatným SQL riadkom. Presné polia vrcholov, väzieb a fyzikálnych vlastností sa môžu ukladať ako kompaktné binárne bloky, pričom databáza vedie ich priestorovú identitu, rozsah, verziu, väzby, pôvod a integritu.

Presnejšie lokálne mapovanie sa vnorí do existujúceho modelu ako presnejší priestorový segment. Hrubší model ostáva zachovaný a presnejší model ho v danom rozsahu doplní alebo nahradí bez straty spoločnej súradnicovej orientácie.

## Decentralizovaná výpočtová a dátová architektúra

Decentralizácia je súčasťou základnej architektúry TermikaXC, nie neskorší doplnok.

Princíp:

> Zariadenia účastníkov počítajú a uchovávajú lokálne údaje. Spoločná databanka vedie katalóg, overuje, synchronizuje, zálohuje a zachováva spoločnú pamäť letového priestoru.

S rastúcim počtom účastníkov má rásť aj dostupná výpočtová kapacita, počet už vypočítaných priestorov a počet distribuovaných kópií údajov. Nový používateľ preto nemá zvyšovať iba záťaž centrálneho servera; má zároveň priniesť ďalší výpočtový a dátový zdroj.

### Úloha zariadenia účastníka

Zariadenie môže v používateľom povolených limitoch:

- vypočítavať nové priestory,
- spresňovať existujúci mesh,
- uchovávať lokálne používané oblasti,
- uchovávať údaje, ktoré samo vypočítalo,
- overovať výsledky iných účastníkov,
- synchronizovať hotové výsledky do spoločnej databanky,
- poskytovať vybrané dátové bloky ostatným účastníkom.

### Úloha spoločnej databanky

Spoločná databanka:

- vedie globálny katalóg priestorov a verzií,
- uchováva identitu každého modelu a výsledku,
- kontroluje hash, pôvod, čas platnosti a verziu výpočtu,
- zálohuje výsledky tak, aby sa nestratili po odpojení používateľského zariadenia,
- rozhoduje, ktoré údaje už existujú a ktoré treba dopočítať,
- zabezpečuje kontinuitu spoločnej mapy.

Centrálna databanka nemá byť hlavným výpočtovým motorom. Je spoločnou pamäťou, katalógom, zálohou a autoritou integrity.

### Identita výpočtu

Každý výpočet musí byť jednoznačne určený minimálne kombináciou:

- priestorového rozsahu,
- súradnicového systému,
- verzie a rozlíšenia mesh,
- hash TEMP datasetu,
- času platnosti TEMP,
- verzie fyzikálneho modelu,
- použitej presnosti,
- zdroja údajov,
- hash výsledku.

Rovnaký výpočet s rovnakým výsledným hashom sa nemá ukladať opakovane ako nový obsah.

## Oddelenie pracovného a letového režimu

Bezpečnosť a plynulosť letového režimu majú absolútnu prioritu.

Ak aplikácia počas letu prestane reagovať z dôvodu výpočtu, synchronizácie alebo nedostatku pamäte, systém nesplnil svoj účel.

### Pracovný režim

Môže:

- počítať nové priestory,
- používať viac CPU/GPU,
- sťahovať a odosielať veľké dátové objemy,
- spresňovať mesh,
- vykonávať údržbu lokálnych údajov,
- synchronizovať so spoločnou databankou.

### Letový režim

Musí:

- zastaviť všetky nepovinné výpočty,
- zastaviť alebo odložiť veľké synchronizácie,
- uzamknúť pripravený letový priestor,
- chrániť minimálnu rezervu RAM a disku,
- fungovať bez internetového pripojenia,
- používať pripravené údaje a iba bezpečné lokálne operácie,
- zachovať polohu, terén, mapu, letové údaje a bezpečnostné funkcie aj pri núdzovom obmedzení ostatných vrstiev.

Pred letom sa pripraví letový balík obsahujúci minimálne:

- plánovanú trasu,
- bezpečný priestor okolo trasy,
- potrebný rozsah výšok,
- terénny mesh,
- aktuálny TEMP,
- vypočítané fyzikálne vrstvy,
- záložnú menej náročnú reprezentáciu pre núdzový režim,
- potrebné mapové podklady.

Aplikácia musí jednoznačne oznámiť, či je letový priestor úplne pripravený a použiteľný offline.

## Monitorovanie zdrojov zariadenia

Stav výpočtových a úložných zdrojov musí byť stále viditeľnou súčasťou pracovného prostredia.

Minimálne zobrazovať:

- dostupnú a použitú RAM,
- povinnú bezpečnostnú rezervu RAM,
- dostupný a použitý diskový priestor TermikaXC,
- veľkosť aktuálneho priestoru,
- veľkosť pripraveného letového balíka,
- objem údajov čakajúcich na synchronizáciu,
- zaťaženie CPU/GPU,
- počet aktívnych výpočtových vlákien,
- stav pripravenosti na let.

Pri výbere nového priestoru aplikácia vopred vypočíta odhad:

- potrebného diskového priestoru,
- potrebnej pracovnej RAM,
- očakávanej výpočtovej záťaže,
- schopnosti konkrétneho zariadenia úlohu bezpečne vykonať.

Používateľ musí vedieť, na aký rozsah a presnosť jeho zariadenie stačí a kedy už potrebuje rozšíriť disk, pamäť alebo použiť výkonnejšie zariadenie.

### Ochranné režimy zdrojov

Pracovne zaviesť minimálne tieto stupne:

- **zelený** – dostatočná rezerva, povolené všetky funkcie,
- **žltý** – obmedziť cudzie výpočty a nepovinnú synchronizáciu,
- **oranžový** – ponechať iba aktuálny a bezprostredne potrebný letový priestor,
- **červený** – zastaviť nové fyzikálne výpočty a synchronizáciu; zachovať iba letové a bezpečnostné jadro.

Pri ochrane pamäte sa nesmie meniť presnosť uložených údajov. Môže sa znížiť iba množstvo údajov súčasne držaných v RAM alebo hustota ich vizualizácie.

## Licenčný princíp spoluúčasti

Jednou z podmienok používania spoločnej výpočtovej siete môže byť transparentný súhlas používateľa, že aplikácia v ním zvolených limitoch využije voľnú výpočtovú kapacitu, pracovnú pamäť, diskový priestor a dátové pripojenie na tvorbu, uchovávanie, overovanie a synchronizáciu spoločného modelu letového priestoru.

Používateľ musí mať možnosť určiť minimálne:

- maximálne využitie CPU/GPU,
- maximálne využitie RAM,
- maximálny diskový priestor pre spoločnú sieť,
- výpočty iba pri externom napájaní,
- synchronizáciu iba cez povolený typ siete,
- úplné vypnutie nepovinnej výpočtovej a synchronizačnej činnosti počas letu.

## Stav implementácie po tomto kroku

- WIND vie čítať TEMP profil a vyhodnotiť vietor pre jednu pracovnú hladinu,
- súčasná implementácia je stále MVP a používa jednu 2D hladinu,
- `surfaceAltM` ešte treba priamo previazať na reálnu výšku terénu Cesium,
- súčasné demonštračné fallbacky a demo ochladzovacie zóny nesmú prejsť do fyzikálneho produkčného modelu,
- decentralizovaná dátová vrstva, lokálne úložisko, synchronizácia a monitor zdrojov zatiaľ nie sú implementované.

## Ďalšie kroky

1. Prepojiť `surfaceAltM` na reálnu výšku terénu z Cesium pre každý vypočítaný bod.
2. Odstrániť z produkčnej vetvy meteorologické placeholdery, demo fallback vektory a demo ochladzovacie zóny.
3. Zaviesť identitu a hash normalizovaného TEMP datasetu.
4. Zaviesť architektúru **Fokus-first** ako primárnu jednotku ukladania namiesto pravidelnej dlaždicovej mriežky.
5. Definovať manifest fokusu a binárny formát fyzikálnych vrstiev ako autoritatívny dátový základ.
6. Zaviesť verziovanie vrstiev vo fokuse (nová vrstva alebo nový fokus pri novom výpočte).
7. Doriešiť pravidlá prekryvu fokusov: prednosť má časovo platnejší a novší výpočet.
8. Zaviesť predpočítanú render cache pre pohybové vrstvy (WebM) viazanú na konkrétnu verziu vrstvy.
9. Presunúť náročné výpočty mimo hlavného vlákna aplikácie.
10. Zaviesť monitor RAM, disku, CPU/GPU a bezpečnostných rezerv.
11. Definovať pracovný režim, prípravu letového balíka a nedotknuteľný letový režim.
12. Doplniť IGC pipeline na postupné načítanie a plynulé spájanie fokusov pred pilotom.

## Architektúrne rozhodnutie: Fokus-first + binárny základ + render cache

### Záver

TermikaXC používa **fokusy** ako primárnu priestorovú jednotku. Cesium ostáva nositeľ geolokalizácie a terénu. Autoritatívne fyzikálne údaje sa ukladajú binárne vo vnútri fokusu. Predpočítané animácie sa ukladajú ako render cache viazaná na konkrétnu verziu vrstvy.

### Metodika

1. **Cesium = Zem a geolokácia.**
  - Neukladá sa mapa ako fyzikálny základ, ukladá sa rozsah a poloha fokusu.

2. **Fokus má jedinečné ID a manifest.**
  - Manifest obsahuje vstupy, výsledky, vrstvy, čas vzniku, čas platnosti, autora, verziu modelu a hash.

3. **Binárne vrstvy sú autoritatívny zdroj pravdy.**
  - Vietor, teplota, tlak, vlhkosť, strih, divergencia/konvergencia a confidence sa ukladajú ako binárne polia.
  - Každá vrstva nesie pôvod, verziu výpočtu, čas a integritný hash.

4. **WebM je prezentačná cache, nie fyzikálny originál.**
  - WebM urýchľuje prehrávanie dynamiky bez opakovaného výpočtu.
  - Diagnostika bodu, audit a ďalšie odvodenia sa vždy opierajú o binárne autoritatívne dáta, nie o pixelový výstup.

5. **Nový výpočet = nová verzia vrstvy alebo nový fokus.**
  - Pri prekryve sa použije platnejší a novší výpočet podľa pravidiel manifestu.

6. **IGC trasa riadi streamovanie fokusov.**
  - Pri lete sa fokusy načítajú dopredu po trase a plynulo sa spájajú.
  - Letový režim používa pripravené dáta a zastavuje nepovinné výpočty.

7. **Správa dát je súborová s centrálnym katalógom identity.**
  - Fokus adresár obsahuje manifest, binárne bloky a render cache.
  - Katalóg rieši dostupnosť, hash, verzie, platnosť, deduplikáciu identických blokov a synchronizáciu.

### Praktické pravidlo pre úložisko

- Prioritne šetriť priestor kompresiou a deduplikáciou binárnych blokov vo vnútri fokusov.
- WebM držať ako voliteľnú cache s retenčnou politikou, aby neprebral väčšinu disku.
- Pri nedostatku miesta sa najprv redukuje alebo zahadzuje render cache, nie autoritatívne binárne vrstvy.

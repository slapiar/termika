# Terénny dizajn manuál

## Účel dokumentu

Tento dokument definuje pracovný vizuálny a analytický systém pre farebné zobrazovanie geometrie reliéfu v TermikaXC.

Cieľom nie je iba „vyfarbiť terén“. Cieľom je vytvoriť energeticko-geometrickú mapu reliéfu, v ktorej bude farba vyjadrovať typ geometrie, odtieň polohu v rámci výškového priebehu terénneho celku a zmena farieb bude prirodzene odhaľovať fyzikálne významné rozhrania.

Reliéf terénu hovorí o jeho geometrii a o jej vplyve na energetickú bilanciu, ohrev povrchu a prúdenie vzduchovej hmoty okolo neho. Farebná vizualizácia preto musí pomáhať odhaliť najmä:

- konvexnosť,
- konkávnosť,
- zmeny sklonu,
- ostré uhly,
- zlomy,
- hrany,
- vrcholy,
- hrebene,
- rebrá,
- žľaby,
- doliny,
- sedlá,
- depresie,
- steny,
- prechodové oblasti medzi jednotlivými typmi geometrie.

Farebné rozlíšenie členitosti terénu má slúžiť predovšetkým na vyhľadávanie rozhraní. Práve geometrické rozhrania môžu meniť energetickú bilanciu povrchu, smer prúdenia pri zemi, zbiehanie alebo rozbiehanie prúdov, akumuláciu tepla a podmienky odtrhnutia termiky.

---

# 1. Základné zásady farebného systému

1. Čierna, biela a šedá nepatria do hlavnej farebnej škály geometrie reliéfu.
2. Najvyššie a najnižšie body budú mať osobitný kontrastný marker podľa podložia.
3. Základná farba určuje typ geometrie.
4. Odtieň tej istej farby sa mení funkciou výškovej zmeny a polohy v rámci nadradeného terénneho celku.
5. Rozhrania sa zvýrazňujú prirodzene tým, že sa stretnú rôzne geometrické farebné rodiny.
6. Intenzita zlomu môže rozhranie ďalej zvýrazniť zmenou saturácie alebo svetlosti.
7. Farba nesmie zastúpiť výpočet. Je výsledkom geometrickej klasifikácie a musí byť spätne vysvetliteľná.
8. Každá farebná bunka musí uchovávať číselné parametre, z ktorých jej výsledná farba vznikla.
9. Farebný systém musí zostať korektný pre webové zobrazenie a čitateľný nad rôznymi mapovými podkladmi.
10. Vrstevnice zostávajú samostatnou tmavošedou mapovou vrstvou a nesmú byť farebným tieňovaním reliéfu potlačené.

---

# 2. Trojvrstvová logika výslednej farby

Výsledný vzhľad bunky alebo terénneho prvku vzniká kombináciou troch nezávislých informačných vrstiev.

## A. Základná farba = typ geometrie

Základná farba určuje geometrickú rodinu:

- konvexné tvary používajú teplé farby,
- konkávne tvary používajú studené farby,
- svahy používajú žlté až oranžové farby,
- prechody a sedlá používajú fialové farby,
- prudké zlomy a steny používajú červené až purpurové farby,
- roviny a plošiny používajú zelené farebné rodiny.

## B. Odtieň = poloha vo výškovom priebehu daného tvaru

Odtieň nevyjadruje iba absolútnu nadmorskú výšku.

Má vyjadrovať najmä:

- ako vysoko je bod v rámci svojho kopca,
- ako vysoko je v rámci hrebeňa alebo rebra,
- ako hlboko je v rámci žľabu, doliny alebo depresie,
- ako ďaleko je od zlomu alebo osi terénneho prvku,
- aký veľký je lokálny výškový rozdiel voči nadradenému okoliu.

Tým sa rovnaká geometrická rodina sama prirodzene vytieňuje podľa svojho priebehu.

## C. Kontrastný marker = extrémny alebo kontrolný bod

Samostatné markery sa použijú najmä pre:

- kótu,
- najvyšší bod analyzovanej oblasti,
- lokálne maximum,
- najnižší bod analyzovanej oblasti,
- lokálne minimum,
- sedlo,
- prípadne ďalší významný kontrolný bod.

Tieto markery nie sú súčasťou základnej farebnej škály reliéfu.

---

# 3. Šestnásť základných farebných rodín

Nasledujúca paleta je pracovným základom. Finálna farba každej bunky sa bude z tejto základnej farby ďalej odvádzať výpočtom.

| Kód | Geometrická rodina | Základná farba | HEX |
|---|---|---|---|
| G01 | Rovina / plošina | zelená | `#2EBD59` |
| G02 | Mierne zvlnená plocha / terasa | svetlá zelená | `#6EDC6A` |
| G03 | Mierny svah | žltá | `#FFD54A` |
| G04 | Výrazný svah | jantárová | `#FFB300` |
| G05 | Konvexné telo svahu | oranžová | `#FF8C42` |
| G06 | Vrcholová výduť / kupola | oranžovočervená | `#FF5A36` |
| G07 | Hrebeň / rebro | tmavočervená | `#8B0000` |
| G08 | Ostrá hrana / horný zlom | karmínová | `#C21807` |
| G09 | Plytká konkávnosť | tyrkysová | `#2EC7C9` |
| G10 | Žľab / zbernica | azúrová | `#00B7FF` |
| G11 | Dolinová os / hlbšia línia | modrá | `#1E88E5` |
| G12 | Depresia / kotlina | indigová | `#3949AB` |
| G13 | Sedlo / prechod | fialová | `#8E44AD` |
| G14 | Zmiešaný alebo neurčitý prechod | svetlejšia fialová | `#B155E0` |
| G15 | Kolmá stena / extrémny zlom | purpurová | `#D81B60` |
| G16 | Dolná hrana zlomu / pätový zlom | malinová | `#EC407A` |

Tieto farby predstavujú geometrické rodiny, nie konečné zobrazené odtiene.

---

# 4. Katalóg variantov terénnych nerovností a zmien geometrie

Katalóg je pracovný. Jeho cieľom je pokryť hlavné geometrické situácie, ktoré majú význam pre čítanie reliéfu, energetickú bilanciu a prúdenie.

## A. Referenčné body a extrémy

| č. | Prvok | Geometrický význam | Základná rodina |
|---:|---|---|---|
| 1 | Kóta – najvyšší bod oblasti | absolútne maximum analyzovanej oblasti | marker + G06/G07 |
| 2 | Lokálne maximum | najvyšší bod lokálneho terénneho celku | marker + G06 |
| 3 | Vrchol kopca | vrchol uzavretých vrstevníc | G06 |
| 4 | Vrcholová plošina | plochý vrchol | G01 / G02 |
| 5 | Hrebeňový uzol | vrchol ležiaci na hrebeni | G07 |
| 6 | Sedlo | prechod medzi dvoma výškami | G13 |
| 7 | Lokálne minimum | najnižší bod lokálneho celku | marker + G12 |
| 8 | Dno uzavretej depresie | najhlbší bod kotliny | G12 |
| 9 | Dno doliny | najnižšia línia otvorenej doliny | G11 |

## B. Rovinné a slabo zvlnené tvary

| č. | Prvok | Geometrický význam | Základná rodina |
|---:|---|---|---|
| 10 | Rovina | minimálny sklon a malá lokálna zmena | G01 |
| 11 | Mierne zvlnená rovina | slabé lokálne vlny | G02 |
| 12 | Plošina | vyvýšená rovinná plocha | G01 |
| 13 | Terasa | relatívne plochý stupeň | G02 |
| 14 | Vrcholová rovinka | plochý horný koniec kopca | G02 |
| 15 | Pätová plošina | plocha pod svahom | G02 |
| 16 | Dno širokej doliny | ploché dno doliny | G01 / G11 |

## C. Konvexné plošné tvary

| č. | Prvok | Geometrický význam | Základná rodina |
|---:|---|---|---|
| 17 | Výduť na rovine | malý konvexný hrb | G05 |
| 18 | Konvexné plece | horná vypuklá časť svahu | G05 |
| 19 | Konvexný chrbát | dlhšie vypuklé telo | G05 |
| 20 | Dóm / kupola | plošne konvexný vrcholový tvar | G06 |
| 21 | Zaoblený vrchol | vrchol bez ostrej hrany | G06 |
| 22 | Vyvýšenina | menší konvexný prvok | G06 |
| 23 | Ostrovček vyvýšeniny v rovine | izolovaná konvexnosť | G06 |

## D. Konvexné lineárne tvary

| č. | Prvok | Geometrický význam | Základná rodina |
|---:|---|---|---|
| 24 | Hrebeň | lineárne maximum, terén klesá do strán | G07 |
| 25 | Rebro | konvexná línia vybiehajúca zo svahu | G07 |
| 26 | Ostroha | dlhšie rebro vystupujúce do doliny | G07 |
| 27 | Ostrá hrana | úzky konvexný zlom | G08 |
| 28 | Horná hrana zrázu | prechod z hornej plochy do steny | G08 |
| 29 | Konvexný zlom svahu | prudká zmena v prospech vypuklosti | G08 |
| 30 | Okraj plošiny | hrana vyvýšenej roviny | G08 |

## E. Svahové telá

| č. | Prvok | Geometrický význam | Základná rodina |
|---:|---|---|---|
| 31 | Mierny svah | stabilný malý sklon | G03 |
| 32 | Stredný svah | zreteľný sklon | G04 |
| 33 | Prudký svah | veľký sklon bez klasifikácie steny | G04 |
| 34 | Horný svah | časť pod hrebeňom alebo vrcholom | G04 |
| 35 | Stredný svahový plášť | hlavné telo svahu | G03 / G04 |
| 36 | Pätový svah | spodná časť svahu | G04 / G16 |

## F. Konkávne plošné tvary

| č. | Prvok | Geometrický význam | Základná rodina |
|---:|---|---|---|
| 37 | Plytká preliačina | slabá konkávnosť | G09 |
| 38 | Konkávny svah | svah vtiahnutý dovnútra | G09 |
| 39 | Misa | širšia konkávna plocha | G09 |
| 40 | Kotlina | plošne uzavretá konkávnosť | G12 |
| 41 | Uzavretá depresia | lokálne nižšia plocha bez odtoku | G12 |
| 42 | Pätová konkávnosť | konkávny zber pri päte svahu | G09 |

## G. Konkávne lineárne tvary

| č. | Prvok | Geometrický význam | Základná rodina |
|---:|---|---|---|
| 43 | Žľab | úzka konkávna línia | G10 |
| 44 | Zbernica | línia zbiehania povrchu | G10 |
| 45 | Roklina | výraznejší žľab alebo ryha | G10 |
| 46 | Dolinová os / talweg | hlavná spodná línia doliny | G11 |
| 47 | Zárez medzi rebrami | konkávny prechod medzi dvoma výbežkami | G10 |

## H. Prudké zlomy a extrémne prvky

| č. | Prvok | Geometrický význam | Základná rodina |
|---:|---|---|---|
| 48 | Kolmá stena | extrémny sklon | G15 |
| 49 | Skalná stena | dlhší súvislý úsek extrémneho sklonu | G15 |
| 50 | Dolná hrana zrázu | prechod zo steny na nižší povrch | G16 |
| 51 | Skalný prah | schodovitý zlom | G16 |
| 52 | Horný skalný lem | ostrá horná hrana | G08 |

## Osobitný doplnkový typ mimo základného katalógu

| Prvok | Poznámka | Rodina |
|---|---|---|
| Jaskynný otvor / previs | Vyžaduje vhodné 3D dáta. Bežný výškový model nemusí previs ani jaskynný otvor reprezentovať. | G15 alebo osobitný marker |

Základný katalóg sa môže počas validácie zjednodušiť alebo zlúčiť. Samostatné typy sa majú ponechať iba vtedy, ak ich možno spoľahlivo rozlíšiť z dostupných dát a ak majú odlišný fyzikálny význam.

---

# 5. Premenné pre výpočet výslednej farby

Pre každú bunku alebo terénny prvok sa majú pripraviť minimálne tieto normalizované premenné:

- `family` – geometrická farebná rodina G01 až G16,
- `hRel` – relatívna výška v rámci nadradeného terénneho celku, rozsah 0 až 1,
- `dRel` – relatívna hĺbka v rámci konkávneho celku, rozsah 0 až 1,
- `sRel` – relatívny sklon, rozsah 0 až 1,
- `kRel` – relatívna intenzita konvexnosti alebo konkávnosti, rozsah 0 až 1,
- `bRel` – intenzita zlomu alebo geometrického rozhrania, rozsah 0 až 1.

Voliteľne možno neskôr doplniť:

- `ridgeRel` – sila príslušnosti k hrebeňu,
- `valleyRel` – sila príslušnosti k dolinovej osi,
- `opennessRel` – otvorenosť voči oblohe,
- `scaleRel` – mierka alebo význam terénneho prvku,
- `confidence` – miera dôvery klasifikácie.

---

# 6. Výpočet odtieňov

Nasledujúce vzťahy sú pracovné. Ich koeficienty sa musia doladiť podľa reálneho renderovania v 3D mape.

## 6.1 Konvexné tvary

Pre rodiny:

```text
G05, G06, G07, G08
```

platí princíp:

- čím vyššie je bod v rámci svojho kopca, rebra alebo hrebeňa,
- tým tmavší a sýtejší má byť odtieň tej istej farby.

Pracovný tvar:

```text
lightness = 74 − 26 · hRel
saturation = baseSaturation + 18 · kRel + 12 · bRel
```

Výsledok:

- vrchol je tmavší,
- spodná časť toho istého konvexného tela je svetlejšia,
- ostrý konvexný zlom je sýtejší než plynulé konvexné telo.

## 6.2 Konkávne tvary

Pre rodiny:

```text
G09, G10, G11, G12
```

platí princíp:

- čím hlbšie je bod v žľabe, rokline, doline alebo depresii,
- tým tmavší a sýtejší má byť odtieň tej istej studenej farby.

Pracovný tvar:

```text
lightness = 74 − 26 · dRel
saturation = baseSaturation + 18 · kRel + 12 · bRel
```

## 6.3 Svahy a roviny

Pre rodiny:

```text
G01, G02, G03, G04
```

má byť zmena odtieňa miernejšia, aby zostala zachovaná čitateľnosť veľkých plôch.

Pracovný tvar:

```text
lightness = 70 − 14 · hRel − 10 · sRel
saturation = baseSaturation + 8 · sRel
```

## 6.4 Zlomy a steny

Pre rodiny:

```text
G08, G15, G16
```

má byť menšia závislosť od výšky a väčšia závislosť od intenzity zlomu.

Pracovný tvar:

```text
lightness = 56 − 12 · bRel
saturation = baseSaturation + 20 · bRel
```

Výsledok:

- ostré hrany sú okamžite čitateľné,
- stena nesplýva so svahom,
- dolná hrana zlomu je zreteľne odlišná od horného zlomu.

---

# 7. Zásada zvýraznenia rozhraní

Rozhranie dvoch susedných buniek sa má zvýrazniť, ak nastane aspoň jedna z podmienok:

- zmení sa geometrická rodina,
- zmení sa znamienko zakrivenia,
- prudko narastie intenzita zlomu,
- prudko sa zmení sklon,
- prudko sa zmení smer spádu,
- bunka prejde z plošného tvaru do lineárneho tvaru,
- bunka prejde zo svahového tela do steny alebo zlomu.

Pracovná logika:

```text
if familyA != familyB
or sign(curvatureA) != sign(curvatureB)
or breakIntensity > threshold
=> zvýrazniť rozhranie
```

Rozhranie sa nemá kresliť univerzálnou čiernou čiarou.

Má sa zvýrazniť prirodzene napríklad:

- zvýšením saturácie,
- miernym stmavením,
- lokálnym zvýšením kontrastu,
- prípadne jemnou prechodovou farbou odvodenou zo susediacich rodín.

Tým vznikne obraz, ktorý sa sám prirodzene vytieňuje podľa geometrie terénu.

---

# 8. Kontrastné markery extrémov

Najvyššie a najnižšie body sa nesmú stratiť vo farebnej vrstve reliéfu.

Marker sa má automaticky prispôsobiť jasu podložia.

Pracovné pravidlo:

```text
ak je podklad svetlý → marker tmavý
ak je podklad tmavý → marker svetlý
```

Pracovné kontrastné kombinácie:

- svetlý podklad → výplň `#111111`, obrys `#FFFFFF`,
- tmavý podklad → výplň `#FFFFFF`, obrys `#111111`.

Neskôr možno použiť aj komplementárny marker odvodený od farby podložia, ak poskytne vyšší kontrast.

Pracovné symboly:

| Symbol | Význam |
|---|---|
| `★` | najvyšší bod analyzovanej oblasti |
| `▲` | lokálne maximum alebo vrchol |
| `▼` | lokálne minimum |
| `◇` | sedlo |
| `●` | najnižší bod analyzovanej oblasti |

Najvyšší bod aktuálnej analyzovanej oblasti sa nesmie automaticky označiť ako skutočný vrchol kopca. Môže ísť iba o najvyšší dostupný bod výseku, ak terén pokračuje za hranicu analýzy.

---

# 9. Oddelenie lokálnej geometrie a morfologickej roly

Dnešná jednoduchá klasifikácia nestačí, pretože môže miešať lokálnu geometriu s polohou v širšom terénnom celku.

Napríklad lokálne konvexná bunka môže byť:

- malá výduť na rovine,
- vrchol kopca,
- časť hrebeňa,
- konvexné plece svahu,
- horná hrana zrázu.

Preto sa má klasifikácia rozdeliť na dve samostatné vrstvy.

## Vrstva A – lokálna geometria

Minimálne triedy:

- rovinná,
- konvexná,
- konkávna,
- zlomová,
- stenová,
- prechodová.

Táto vrstva vychádza najmä z:

- sklonu,
- gradientu,
- lokálneho reliéfu,
- pozdĺžnej a priečnej krivosti,
- Laplaciánu,
- zmeny sklonu,
- intenzity zlomu.

## Vrstva B – morfologická rola

Minimálne triedy:

- vrchol,
- hrebeň,
- rebro,
- svah,
- plošina,
- terasa,
- žľab,
- dolina,
- depresia,
- sedlo,
- horná hrana,
- dolná hrana,
- stena.

Táto vrstva vychádza aj zo širšieho okolia:

- relatívnej výškovej polohy,
- uzavretosti vrstevníc,
- smeru pokračovania tvaru,
- rozmeru terénneho prvku,
- väzby na hrebeňové a dolinové línie,
- polohy voči najbližším morfologickým rozhraniam.

Finálna farebná rodina vznikne kombináciou lokálnej geometrie a morfologickej roly.

---

# 10. Návrh dátového modelu bunky

Pracovný príklad:

```js
cell = {
    terrain: {
        heightM: 2184,
        slopeDeg: 37.4,
        aspectDeg: 214,
        localReliefM: 54,
        curvature: -0.00176,
        profileCurvature: -0.00085
    },

    geometry: {
        localClass: "KONVEXNÁ",
        family: "G07",
        breakIntensity: 0.72,
        convexity: 0.83,
        concavity: 0.04,
        confidence: 0.78
    },

    morphology: {
        role: "REBRO",
        ridgeScore: 0.86,
        valleyScore: 0.03,
        relativeHeight: 0.71,
        relativeDepth: 0.05,
        scaleM: 620
    },

    color: {
        baseHex: "#8B0000",
        heightShade: 0.71,
        breakEmphasis: 0.72,
        finalHex: null
    },

    marker: null,

    provenance: {
        terrainSource: "CESIUM_TERRAIN_MODEL",
        geometryMethod: "CENTRAL_DIFFERENCES",
        morphologyMethod: null,
        spacingM: 40,
        moduleVersion: null
    }
};
```

Nevypočítaná hodnota musí zostať `null`. Nesmie sa nahrádzať vymyslenou alebo odhadnutou hodnotou bez označenia pôvodu.

---

# 11. Diagnostika farebnej klasifikácie

Pred zavedením plného dynamického tieňovania sa musí vytvoriť klikateľná diagnostika bodu.

Po kliknutí na farebný bod sa majú zobraziť minimálne:

```text
Typ: REBRO
Farebná rodina: G07
Výška: 2 184 m
Sklon: 37,4°
Orientácia: 214°
Lokálny reliéf: 54 m
Laplacián: −2,81
Profilové zakrivenie: −1,36
Konvexnosť: KONVEXNÁ
Intenzita zlomu: 0,72
Relatívna výška: 0,71
Dôvera klasifikácie: 0,78
Rozostup vzoriek: 40 m
```

Diagnostika má zároveň vysvetliť dôvod zaradenia:

```text
Zaradené ako rebro:
✓ výrazná konvexnosť
✓ záporné profilové zakrivenie
✓ lineárne pokračovanie tvaru
✓ pokles terénu do oboch strán
✓ vysoká poloha v rámci terénneho celku
```

Až po porovnaní:

- farby,
- vrstevníc,
- 3D reliéfu,
- číselných metrík,
- vysvetlenia klasifikácie

sa majú upravovať hranice a pravidlá farebných tried.

---

# 12. Vzťah k vrstevniciam

Vrstevnice zostávajú samostatnou analytickou aj mapovou vrstvou.

Ich základné pravidlá:

- tmavošedá farba,
- pracovný odtieň `#404040`,
- bežné vrstevnice každých 10 m,
- hlavné vrstevnice každých 50 m,
- bez plošnej výplne,
- samostatné zapínanie a vypínanie,
- zakrývanie terénom v 3D pohľade,
- používanie analytickej výšky `levelM` vo výpočtoch,
- používanie zobrazovacej výšky `renderHeightM` iba pri renderovaní.

Zobrazovacia korekcia vrstevníc sa nesmie spätne prenášať do výpočtu geometrie.

Platí:

```text
analytická výška vrstevnice = levelM
zobrazovacia výška = renderHeightM
```

`renderHeightM` slúži iba na to, aby sa čiara nestrácala v 3D povrchu. Do výpočtu sklonu, uhlov, zakrivenia, konvexnosti, konkávnosti ani morfologickej klasifikácie sa nesmie použiť.

---

# 13. Odporúčaný postup implementácie

1. Zachovať existujúcu geometriu a vrstevnice ako overený diagnostický základ.
2. Doplniť klikateľnú diagnostiku farebných bodov.
3. Zobraziť všetky geometrické metriky a dôvody klasifikácie.
4. Oddeliť lokálnu geometriu od morfologickej roly.
5. Zaviesť 16 základných farebných rodín.
6. Zaviesť výpočet relatívnej výšky a relatívnej hĺbky v rámci terénneho celku.
7. Zaviesť dynamické tieňovanie odtieňa podľa výškového priebehu.
8. Zaviesť intenzitu zlomu a prirodzené zvýraznenie rozhraní.
9. Doplniť kontrastné markery extrémov a sediel.
10. Až po vizuálnom overení doladiť koeficienty farieb a hranice klasifikácie.

---

# 14. Záverečný princíp

Výsledný systém má pracovať podľa reťazca:

```text
3D výškový model
→ vrstevnice a spojitosti reliéfu
→ lokálna geometria
→ morfologická rola
→ 16 základných farebných rodín
→ odtieň podľa relatívnej výšky alebo hĺbky
→ zvýraznenie zlomu a rozhrania
→ kontrastné markery extrémov
→ energeticko-geometrická mapa reliéfu
```

Základná filozofia:

```text
geometrická rodina = 16 základných farieb
+
výšková funkcia = odtieň v rámci tej istej rodiny
+
zvýraznenie zlomu = saturácia a lokálny kontrast
+
kontrastné markery = kóty, minimá a sedlá
```

Farebný obraz nemá byť dekoráciou. Má byť čitateľnou mapou geometrických rozhraní, ktoré ovplyvňujú prijímanie energie, ohrev povrchu a prúdenie vzduchovej hmoty v krajine.

# WIND – terénne interakcie a 3D vektorová algebra v1

## Účel

Tento dokument určuje prechod z dnešného 2D WIND MVP na fyzikálne viazané 3D prúdenie nad reálnym terénom Cesia.

Cieľom je, aby:

- prúdnica nikdy neprenikla pod povrch terénu,
- prúdnica neskončila bez fyzikálneho alebo priestorového dôvodu,
- vietor reagoval na sklon, normálu, hrany a zakrivenie terénneho meshu,
- vertikálna zložka `w_ms` vznikala z vektorovej interakcie s terénom a atmosférickou stabilitou,
- výšky ďalších skúmaných bodov nevznikali pevnými prírastkami, ale integráciou výsledného 3D vektora,
- základnú vertikálnu štruktúru určoval výhradne reálny TEMP profil.

## Aktuálny stav, ktorý sa nesmie zameniť za cieľový model

Aktuálna implementácia je vhodná ako vizuálne a modulárne MVP, ale ešte nie ako 3D fyzikálny model:

1. `wind-field.js` vytvára jednu 2D hladinu a jednu dvojicu `u_ms`, `v_ms`.
2. `surfaceAltM` je jedna hodnota pre celý fokus, nie lokálna výška terénu každej bunky.
3. `resolveProfileWind()` vzorkuje TEMP iba v jednej cieľovej výške.
4. `wind-effect-terrain.js` mení iba horizontálne `u`, `v`; nevytvára `w_ms`.
5. `aspectDeg` v terénnej analýze označuje smer najväčšieho poklesu. Priame priťahovanie vetra k `aspectDeg` preto vedie tok nadol po svahu a nie je všeobecným riešením náveterného výstupu.
6. `wind-render.js` integruje prúdnicu iba v 2D pevným krokom a výšku drží konštantnú.
7. `maxSteps` dnes môže vytvoriť optický koniec prúdnice vo voľnom priestore.

Tieto obmedzenia sú dočasné a nesmú sa preniesť do produkčnej fyziky.

## Základné rozhodnutie

Veterné pole sa ďalej nebude chápať ako súbor pevných horizontálnych hladín.

Bude sa chápať ako funkcia:

```text
V = F(x, y, z, t, TEMP, terrain, state)

V = (u_ms, v_ms, w_ms)
```

Letová hladina používateľa je referenčný rez poľa, nie jediná existujúca vrstva.

TEMP určuje reálne vertikálne uzly atmosféry. Medzi nimi sa môže interpolovať. Ďalšie výpočtové body sa vkladajú adaptívne podľa zmeny výsledného vektora, vzdialenosti od terénu, lokálnej geometrie a požadovanej numerickej presnosti. Nepoužíva sa pevné `+30 m`, `+100 m` ani iný vopred zvolený meteorologický prírastok.

## 1. Atmosférický základ z TEMP

Pre každý záznam TEMP sa vytvorí:

```text
z_m
p_hpa
T_c
Td_c
u_ms
v_ms
```

Meteorologický smer sa prevedie na tok:

```text
u = -sin(dir) * speed
v = -cos(dir) * speed
```

Pre ľubovoľnú okamžitú výšku `z` sa interpolujú:

```text
u_temp(z)
v_temp(z)
T(z)
Td(z)
p(z)
```

Z TEMP sa ďalej odvodí profil potenciálnej teploty a atmosférickej stability:

```text
N² = (g / theta) * d(theta)/dz
```

`N²` sa nebude nahrádzať konštantou. Musí vzniknúť z aktuálneho profilu.

Ak požadovaná výška leží mimo platného rozsahu TEMP, produkčný model nesmie ticho použiť najnižšiu alebo najvyššiu hladinu ako náhradu. Bod sa označí ako mimo rozsahu zdroja alebo sa výpočet v tejto vetve ukončí s dôvodom.

## 2. Terén sa vzorkuje z meshu, nie z najbližšej bunky

Pre každý bod prúdnice sa určí trojuholníková plocha terénneho meshu pod bodom.

Z nej sa barycentricky určia:

```text
terrain_height_msl
normal = (n_east, n_north, n_up)
slope
local curvature
face_id
```

Použije sa už existujúca topológia M1:

- `faces[].normal`,
- `faces[].slopeDeg`,
- `faces[].centroid`,
- `edges[].dihedralDeg`,
- `edges[].breakStrength`,
- väzby susedných plôch.

Vyhľadanie plochy musí mať priestorový index. Lineárne hľadanie najbližšej bunky pre každý bod prúdnice nie je cieľový algoritmus.

## 3. Neprenikanie do terénu

Vektor vetra je:

```text
V = (u, v, w)
```

Normála povrchu smerom von je:

```text
n = (n_east, n_north, n_up)
```

Náveterný náraz do povrchu nastáva, keď:

```text
V · n < 0
```

Zložka smerujúca do terénu sa nesmie ponechať. Vektor sa premietne do dotykovej roviny:

```text
V_tangent = V - (V · n) * n
```

Táto projekcia prirodzene vytvorí kladnú vertikálnu zložku pri prúdení proti stúpajúcemu svahu.

Vplyv povrchu sa nepoužije skokom iba v jednom bode. Jeho váha sa určí z aktuálnej vzdialenosti od povrchu, lokálnej mierky prekážky, sklonu, rýchlosti prúdu a stability TEMP. Výška vplyvu terénu preto nie je pevná AGL konštanta.

## 4. Zrýchlenie a zhustenie na náveternej strane

Výsledný tok nad terénom nevznikne iba otočením smeru.

Model musí sledovať:

```text
flux
convergence/divergence
zmenu prierezu prúdu
lokálnu zmenu rýchlosti
```

Na náveternej strane sa prúdnice pri stláčaní priestoru zhusťujú a tok môže zrýchľovať. Hustota zobrazenia sa nemá falšovať ručným kreslením väčšieho počtu čiar; musí byť dôsledkom advekcie častíc vo výslednom poli.

Prvá implementácia môže zachovať hmotnostný tok cez lokálnu korekciu rýchlosti podľa zmeny efektívneho prierezu. Neskôr sa táto časť môže nahradiť presnejším tlakovým riešením bez zmeny rozhrania efektu.

## 5. Hrebeň, zotrvačnosť a zostupná vetva

Po opustení svahu sa vertikálna zložka nesmie okamžite vynulovať.

Prúdnica si nesie stav:

```text
position = (x, y, z)
velocity = (u, v, w)
vertical_displacement = eta
```

Po prechode hrebeňom sa vertikálny pohyb riadi zotrvačnosťou a stabilitou atmosféry:

```text
d(eta)/dt = w
dw/dt = -N² * eta - damping
```

Kde:

- `N²` pochádza z TEMP,
- tlmenie vzniká z lokálnej mierky prúdenia, rýchlosti a miešania,
- nejde o pevne nakreslenú parabolu.

Takto vznikne dynamicky:

1. výstup po náveternej strane,
2. zotrvačný výstup nad hrebeň,
3. mechanické a stabilitné spomalenie,
4. bod obratu,
5. zostupná vetva v závetrí.

Pri stabilnej vrstve sa tým pripravuje základ orografickej vlny. Pri slabo stabilnej alebo nestabilnej vrstve sa výsledok zmení podľa aktuálneho TEMP.

## 6. Hrany, odtrhnutie a závetrie

Pri prechode cez hranu meshu sa použijú:

```text
edge.dihedralDeg
edge.breakStrength
normály oboch susedných plôch
smer a rýchlosť prúdu
```

Silná konvexná hrana na záveternej strane môže vytvoriť stav:

```text
flow_state = ATTACHED | SEPARATING | SEPARATED | REATTACHING
```

Prvá verzia nemusí predstierať úplný rotor. Musí však zachovať informáciu o odtrhnutí, znížiť confidence a neviesť prúdnicu mechanicky cez terén, akoby povrch neexistoval.

## 7. Vzájomné pôsobenie výškových vrstiev

Pri každom novom bode prúdnice sa z aktuálnej výšky znovu odčíta interpolovaný vektor TEMP:

```text
V_ambient(z) = (u_temp(z), v_temp(z), 0)
```

Aktuálny vektor prúdnice sa ovplyvňuje:

```text
V_result =
    ambient TEMP wind
  + terrain deflection
  + carried momentum
  + vertical stability response
  + shear interaction
  + pressure/continuity correction
```

Vertikálny strih teda nevznikne porovnaním vopred určených pevných AGL hladín. Vznikne z reálneho TEMP profilu a z rozdielov vektorov v adaptívne navštívených výškach.

## 8. Adaptívna integrácia prúdnice

Dnešný Eulerov krok:

```text
position += V * dt
```

sa nahradí adaptívnym integrátorom, prednostne RK4/RK45.

Veľkosť ďalšieho kroku sa určí podľa:

- zmeny smeru a veľkosti vektora,
- vzdialenosti od terénu,
- blízkosti silnej hrany meshu,
- lokálneho vertikálneho strihu,
- numerickej chyby integrácie.

To znamená:

- nad hladkým homogénnym priestorom môže byť krok dlhší,
- pri svahu, hrebeni alebo silnom strihu sa automaticky skráti.

Výšková súradnica ďalšieho bodu je vždy výsledok:

```text
z_next = z + integral(w dt)
```

nie vopred určená hladina.

## 9. Ochrana proti kolízii

Každý navrhnutý integračný krok sa overí proti terénu v novej polohe.

Ak:

```text
z_trial <= terrain_height_trial
```

potom sa:

1. krok odmietne,
2. integračný krok sa zmenší,
3. vektor sa znovu vyhodnotí s povrchovou projekciou,
4. krok sa zopakuje.

Prúdnica sa nesmie iba graficky zdvihnúť o konštantný `heightOffsetM`. Renderovací offset je iba vizuálna pomôcka a nesmie opravovať chybu fyziky.

## 10. Prúdnica nesmie skončiť vo vzduchoprázdne

Prúdnica môže skončiť iba s explicitným dôvodom:

```text
FOCUS_EXIT
NEIGHBOR_FOCUS_HANDOFF
TEMP_VALIDITY_END
SOURCE_VERTICAL_RANGE_END
PHYSICAL_STAGNATION
NUMERICAL_FAILURE
```

`maxSteps` je iba bezpečnostná poistka integrátora. Nesmie byť bežným viditeľným koncom čiary.

Pri `FOCUS_EXIT` sa uloží výstupný stav:

```text
position
velocity
eta
flow_state
time
source hashes
```

Susedný fokus môže na tento stav plynulo nadviazať.

## 11. Nový dátový model bodu vetra

Minimálne polia adaptívneho 3D uzla:

```text
lat
lon
height_msl
terrain_height_msl
clearance_agl

u_ms
v_ms
w_ms
speed_ms

p_hpa
T_c
Td_c
theta_k
N2_s2

terrain_face_id
terrain_normal_east
terrain_normal_north
terrain_normal_up

convergence
shear
flow_state
confidence

source_temp_lower_index
source_temp_upper_index
```

## 12. Implementačné moduly

Odporúčané oddelenie:

```text
wind-temp-profile-3d.js
  interpolácia TEMP, theta, N², vertikálny strih

wind-terrain-sampler.js
  priestorový index meshu, trojuholník, výška, normála, hrany

wind-effect-orographic.js
  projekcia na povrch, náveterný výstup, hrany, separácia

wind-field-3d.js
  spoločný evaluátor V = F(x,y,z,t,state)

wind-streamline-integrator-3d.js
  adaptívna RK integrácia, kolízie, dôvody ukončenia

wind-render-3d.js
  iba vizualizácia hotových 3D dráh
```

Existujúci `WindEffectsCore` sa zachová ako modulárny register. Terénny efekt sa však nemá rozširovať ďalším miešaním 2D azimutov. Má sa nahradiť 3D orografickým efektom pracujúcim s normálou meshu a stavom prúdnice.

## 13. Poradie implementácie

1. Zaviesť `w_ms`, lokálne `terrain_height_msl` a `clearance_agl`.
2. Odstrániť jednu spoločnú `surfaceAltM` ako výšku všetkých buniek.
3. Zaviesť TEMP sampler pre ľubovoľnú výšku bez tichého clamp fallbacku.
4. Pripojiť terénny mesh M1 a jeho normály.
5. Zaviesť projekciu nepenetrujúceho vektora na dotykovú rovinu.
6. Zaviesť 3D adaptívny integrátor a kontrolu kolízie.
7. Zaviesť zotrvačnosť `w`, `eta` a stabilitnú odozvu z `N²`.
8. Zaviesť prechod cez hrany, separáciu a plynulé odovzdanie susednému fokusu.
9. Až potom dolaďovať farby, hustotu častíc a render cache.

## 14. Minimálne fyzikálne testy

### Test A – rovina

- homogénny TEMP vietor,
- nulový sklon,
- očakávanie: priamy tok, `w ≈ 0`, bez umelého zakrivenia.

### Test B – rovnomerný náveterný svah

- očakávanie: bez preniknutia do terénu,
- vznik kladného `w`,
- smer dotyčnicový k povrchu.

### Test C – symetrický hrebeň v stabilnej vrstve

- výstup po náveternej strane,
- zotrvačný výstup nad hrebeň,
- dynamický bod obratu,
- zostup v závetrí.

### Test D – zmena smeru a rýchlosti v TEMP

- prúdnica pri zmene výšky plynulo preberá vertikálny strih,
- nevzniká skok medzi pevnými vrstvami.

### Test E – hranica fokusu

- prúdnica končí iba stavom `FOCUS_EXIT`,
- výstupný stav sa dá odovzdať susednému fokusu bez zlomu.

## Konečné pravidlo

**Terén neurčuje vetru nový azimut. Terén mení celý 3D vektor prúdenia.**

**Nasledujúca výška nie je vstupná hladina. Je výsledkom integrácie vertikálnej zložky `w_ms`.**

**Prúdnica je trajektória v spoločnom 3D poli TEMP + terén + zotrvačnosť + stabilita, nie čiara nakreslená v konštantnej výške.**

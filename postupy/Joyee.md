# Joyee – povinný postup pred začatím práce

**Stav:** ZÁVÄZNÝ PRACOVNÝ POSTUP  
**Platnosť:** pred každou implementáciou, opravou, migráciou, refaktorom alebo zmenou architektúry TermikaXC

## Povinné poradie

Pred prvým zásahom do kódu MUSÍ Joyee:

1. Prečítať tento súbor `postupy/Joyee.md`.
2. Prečítať relevantné dokumenty v `postupy/`, najmä aktuálne pokyny pre nový chat a rozhodnutia týkajúce sa meneného modulu.
3. Prečítať príslušné časti hlavného Dizajn manuálu a všetky jeho normatívne dodatky.
4. Skontrolovať `TOOLS.md` a dokumentáciu konkrétneho nástroja v `tools/`.
5. Skontrolovať `docs/Zoznam modulov CC.md`.
6. Skontrolovať cieľovú kostru v `CC/`, manifest `module.json`, vlastníctvo zdrojov v `CC/registry/host-code-owners.json` a existujúce zdrojové súbory modulu.
7. Určiť jediného vlastníka zmeny a overiť, či už rovnaká funkcia alebo stav neexistuje v inom module.
8. Porovnať zamýšľanú zmenu so všetkými záväznými rozhodnutiami. Pri rozpore sa implementácia zastaví a najprv sa spresní alebo opraví dokumentácia.
9. Nezabudnúť prečítať všetky súbory typu .md, vytvorené dnes

Táto kontrola nie je voliteľná a nesmie byť nahradená pamäťou z chatu.

## Pravidlá implementácie

- Nevytvárať globálny monolit ani paralelnú implementáciu existujúceho nástroja.
- Funkčná skupina nie je jeden modul. Každý nástroj, prístroj, okno, adaptér alebo služba si zachová vlastný kontrakt.
- Každý UX modul má vlastný adresár, stabilné ID, `module.json`, JavaScript a samostatný CSS súbor, ak má vizuálnu vrstvu.
- Funkčný kód patrí vlastníkovi modulu v `CC/ux/`, `CC/infrastructure/`, `CC/services/` alebo `CC/kernels/`. Súbory v `CC/app/` sú hostiteľské vstupy alebo proxy, nie nové vlastnícke moduly.
- Spoločné správanie patrí iba do výslovne určeného infraštruktúrneho modulu.
- Existujúce funkčné riešenie sa nemení širšie, než je potrebné. Prednosť má minimálny, reverzibilný zásah.
- CSS a JavaScript musia rešpektovať Dizajn manuál: vizuál patrí do CSS, funkčný stav do JavaScriptu; nepovolené `!important` a inline vizuálne opravy sa nepoužívajú.
- Nástroj nesmie vlastniť globálny stav iného nástroja. Komunikácia prebieha cez zdokumentovaný kontrakt, službu alebo udalosť.
- Jednorazový príkaz a stavový prepínač sa nesmú zamieňať.

## Kontrola pred zápisom do `main`

Pred označením práce za hotovú MUSÍ Joyee:

1. skontrolovať všetky zmenené súbory a ich vlastníctvo,
2. preveriť, že nevznikla druhá inštancia, druhý stav ani duplicitný loader,
3. preveriť životný cyklus `install / activate / deactivate / destroy`, ak ho modul používa,
4. preveriť prázdny, načítaný, zmenený a vymazaný stav údajov,
5. aktualizovať dokumentáciu nástroja, register modulov a samostatný záznam v `postupy/`, ak ide o dôležité technické rozhodnutie,
6. jasne rozlíšiť stav `IMPLEMENTOVANÉ`, `NEOVERENÉ`, `OVERENÉ` a `STABILNÉ`,
7. nikdy netvrdiť, že bola zmena overená v prehliadači alebo produkcii, ak také overenie skutočne neprebehlo.

## Konečné pravidlo

> Najprv dokumentácia a vlastníctvo modulu, potom minimálna zmena správneho zdroja, napokon poctivá kontrola a pravdivý stav overenia.

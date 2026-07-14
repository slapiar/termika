# WIND retencne profily v1

## Ciel

Nastavit historiu tak, aby:

- letovy rezim bol plynuly,
- autoritativne binarne data zostali zachovane,
- disk sa nevycerpal kvoli cache.

## Spolocne pravidla

1. Priorita ochrany dat:
   - autoritativne binarne vrstvy,
   - manifesty a integrity,
   - sekundarne preview,
   - WebM cache.
2. Pri nedostatku miesta sa mazu najprv najstarsie WebM cache.
3. Nikdy sa neprepisuju hashovane historicke verzie binarnych vrstiev.

## Profil S (50 GB)

- Ciel: mobilne/slabsie zariadenie.
- Hot okno: 48 h.
- Warm okno: 14 dni.
- Cold okno: 90 dni.

Nastavenie:

- Hot: 5 min krok, 8 vertikalnych hladin, WebM ON.
- Warm: 15 min krok, 6 hladin, WebM OFF.
- Cold: 60 min krok, 3 hladiny (klucove), bez WebM.

Rozpocet:

- binarne vrstvy: 35 GB,
- metadata a integrity: 2 GB,
- WebM cache max: 13 GB.

## Profil M (200 GB)

- Ciel: bezny pracovny notebook/desktop.
- Hot okno: 72 h.
- Warm okno: 45 dni.
- Cold okno: 365 dni.

Nastavenie:

- Hot: 5 min krok, 12 hladin, WebM ON.
- Warm: 10 min krok, 10 hladin, WebM len pre vytazene trasy.
- Cold: 30 min krok, 5 hladin, bez WebM.

Rozpocet:

- binarne vrstvy: 150 GB,
- metadata a integrity: 8 GB,
- WebM cache max: 42 GB.

## Profil L (1 TB)

- Ciel: centralny uzol alebo vykonne lokalne ulozisko.
- Hot okno: 7 dni.
- Warm okno: 180 dni.
- Cold okno: 5 rokov.

Nastavenie:

- Hot: 2-5 min krok, 16-20 hladin, WebM ON.
- Warm: 10 min krok, 14 hladin, WebM selective.
- Cold: 30 min krok, 8 hladin, bez WebM default.

Rozpocet:

- binarne vrstvy: 780 GB,
- metadata a integrity: 40 GB,
- WebM cache max: 180 GB.

## Trigger politika pre cistenie

- Disk > 80%: vypnut tvorbu novej WebM cache.
- Disk > 88%: mazat WebM od najstarsich fokusov.
- Disk > 93%: mazat preview produkty, ponechat binarne vrstvy.
- Disk > 96%: stop nepovinne vypocty, letovy balik zostava nedotknuty.

## Operacne KPI

Sledovat minimalne:

- velkost autoritativnych vrstiev,
- velkost cache,
- growth/day,
- cache hit rate pri prehravani,
- cas nacitania fokusu,
- pocet invalidovanych cache po zmene modelu.

## Poznamka k decentralizacii

Pri synchronizacii medzi uzlami sa prenasa primarne:

- manifest,
- integrity,
- binarne vrstvy.

WebM cache sa prenasa len volitelne a len ak je dostatok pasma a priestoru.

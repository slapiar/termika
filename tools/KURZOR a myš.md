Hotové, doplnil som všetky body z tvojej požiadavky a overil som backend aj syntax.

Čo je dorobené

- Živé súradnice pri pohybe myši v režime zameriavacieho kríža.
- Prepínač režimu myši vpravo hore (kríž/štandardný kurzor).
- V štandardnom režime sa mapové súradnice pri kurzore nevypisujú.
- Pole ikon vpravo hore je prerobené na mriežku 4 ikony na riadok.
- TEMP okno teraz drží aj fokus súradnice, aby bolo jasné ku ktorému bodu profil patrí.
- Uloženie TEMP do súboru má súradnice v názve.
- Uloženie TEMP do DB má súradnice uložené v samostatnom zozname TEMP.
- Pridané načítanie zoznamu uložených TEMP a opätovné načítanie profilu do TEMP okna.

Kde sú zmeny

- UI a logika na test stránke:
  - terrain-analysis-test.php
  - terrain-analysis-test.php
  - terrain-analysis-test.php
  - terrain-analysis-test.php
  - terrain-analysis-test.php
  - terrain-analysis-test.php
  - terrain-analysis-test.php
  - terrain-analysis-test.php
  - terrain-analysis-test.php
  - terrain-analysis-test.php
  - terrain-analysis-test.php
  - terrain-analysis-test.php
  - terrain-analysis-test.php

- Backend TEMP ukladanie a zoznam:
  - genauto.php
  - genauto.php
  - genauto.php
  - genauto.php
  - genauto.php
  - genauto.php

Overenie ktoré som spravil

- PHP lint bez chýb:
  - genauto.php
  - terrain-analysis-test.php
- API testy pre nové TEMP akcie prešli:
  - saveTempProfile vracia success a názov s lat/lon
  - listTempToday vracia záznamy vrátane center lat/lon

Krátko k používaniu

- Režim myši prepneš novou ikonou vpravo hore.
- V sekcii TEMP máš nové tlačidlá:
  - Stiahnuť TEMP JSON
  - Uložiť TEMP do DB
  - Načítať zoznam TEMP
  - Načítať vybraný profil zo zoznamu


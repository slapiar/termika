# TermikaXC v2.5 – kontrola AGL, načítanie TEMP a Skew‑T

Toto je kompletný balík projektu, nie čiastkový patch.

## Bezpečné nasadenie

1. Aktuálny priečinok `termika` premenuj napríklad na `termika-zaloha-v2.4`.
2. Vytvor nový prázdny priečinok `termika`.
3. Rozbaľ doň celý obsah ZIP súboru.
4. Skontroluj, že súbor je priamo v ceste `/termika/index.php`.
5. Otvor stránku a stlač `Ctrl + F5`.

## Rychle nastavenie bez terminalu (v2.6+)

Ak hostujes projekt bez SSH pristupu, otvor po nahrani:

`/termika/setup.php`

Tam vies ulozit lokalny konfiguracny subor `XC/asset/local-config.php` priamo formularom:

- Cesium token (aby mapa fungovala okamzite),
- Windy `WINDY_API_KEY` pre TEMP proxy cez Windy Point Forecast,
- Telegram token/chat (volitelne),
- `UPDATE_SHARED_KEY` pre ochranu `update.php` (volitelne, odporucane),
- DB udaje (len ak ich pouzivas).

Po ulozeni nemusis nastavovat serverove env premenne. Nastavenie ostava lokalne na tom hostingu.

## Novinky v2.5

- kontrolný súhrn AGL v pravom paneli:
  - AGL na štarte a pri pristátí,
  - minimum AGL na celej trase,
  - počet bodov, ktoré by po kalibrácii ostali pod terénom;
- tlačidlo **Načítať TEMP**;
- podporovaný je JSON profil aj jednoduchá textová tabuľka;
- tlačidlo **Zobraziť / Skryť Skew‑T**;
- samostatné pohyblivé a škálovateľné okno Skew‑T / log‑P;
- v grafe sa zobrazujú:
  - teplota T,
  - rosný bod Td,
  - tlakové hladiny,
  - šikmé izotermy,
  - suché adiabaty,
  - pracovné nasýtené adiabaty,
  - dráha častice oteplenej o 2,5 °C,
  - LCL,
  - smer a rýchlosť vetra podľa hladín;
- po načítaní nového TEMP sa okamžite prepočíta LCL a pracovný model termiky.

## Formát TEMP JSON

Použi pole hladín v tomto tvare:

```json
[
  {
    "p_hpa": 970,
    "z_m": 315,
    "T_c": 24.2,
    "Td_c": 15.0,
    "w_dir_deg": 190,
    "w_speed_kts": 6
  }
]
```

Povinné sú `p_hpa`, `z_m`, `T_c` a `Td_c`. Vietor môže chýbať; vtedy sa použije nula.

## Formát TEMP textovej tabuľky

Jeden riadok = jedna hladina, v poradí:

```text
p_hPa  z_m  T_C  Td_C  smer_vetra_deg  rychlost_vetra_kt
970    315  24.2 15.0  190             6
950    540  22.0 14.1  195             8
```

Oddeľovač môže byť medzera, tabulátor, čiarka alebo bodkočiarka. Pri bodkočiarke možno použiť aj desatinnú čiarku.

## Poznámka

Súbor `asset/config.php` obsahuje súkromné nastavenia. Balík nepublikuj do verejného repozitára.

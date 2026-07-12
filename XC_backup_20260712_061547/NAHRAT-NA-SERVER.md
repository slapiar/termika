# TermikaXC v2.4 – terénna kalibrácia a AGL

Táto verzia je kompletný projekt.

## Nasadenie

1. Premenuj aktuálny priečinok `termika` napríklad na `termika-zaloha-v2.3`.
2. Vytvor nový prázdny priečinok `termika`.
3. Rozbaľ doň celý obsah ZIP-u.
4. Skontroluj, že `index.php` je priamo v `/termika/index.php`.
5. Otvor stránku a urob `Ctrl + F5`.

## Čo pribudlo

- odčítanie výšky 3D terénu pod každým IGC bodom,
- samostatné zachovanie pôvodnej GPS/IGC výšky,
- lokálna vertikálna kalibrácia podľa bodu štartu a pristátia,
- plynulá korekcia prípadného driftu GPS výšky medzi oboma kotvami,
- samostatná výška pre Cesium `render_alt_m`,
- výpočet `AGL = render_alt_m - terrain_height_m`,
- zobrazenie výšky terénu, AGL a použitej korekcie v pravom paneli,
- farebná stopa, prehrávaná stopa, pilot aj kamery používajú kalibrovanú výšku.

## Dôležité

Surová výška v IGC sa neprepisuje. Ostáva v `alt_amsl` a `alt_amsl_raw`.
Terénna interpretácia je uložená oddelene:

- `terrain_height_m`
- `vertical_correction_m`
- `render_alt_m`
- `agl_m`

Pri načítaní väčšieho IGC môže odčítanie najdetailnejšieho terénu trvať niekoľko sekúnd. Stav je viditeľný v hornej lište mapy a v diagnostickom pulte.

## Bezpečnostná poznámka

Balík obsahuje pôvodný `asset/config.php`. Nezverejňuj ho vo verejnom repozitári.

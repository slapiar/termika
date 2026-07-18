# Quick-dock v hlavnom indexe a reverzné ovládanie

Dátum: 18. 07. 2026

## Dôvod zmeny

Modul oblohy, časová značka a IGC súhrn boli načítané iba cez quick-dock testovacej stránky terénnej analýzy. Hlavné prostredie `index.php` preto zmenu po načítaní IGC nemohlo zobraziť.

## Prijaté riešenie

- `quick-tool-dock` sa načítava implicitne aj v hlavnom prostredí cez view modulu prehrávania letu,
- stav zobrazenia panela sa zachováva v `localStorage`, pričom prvé zobrazenie je zapnuté,
- do navigačnej lišty sa dynamicky dopĺňa ikonový prepínač s maticou 9 bodiek vedľa ovládania HUD/LET,
- textový prepínač `NÁSTROJE` sa v navigácii nevytvára, aby nevznikol druhý vstup k tomu istému panelu,
- ikonový ovládač druhým kliknutím panel skryje,
- tlačidlá s atribútom `data-show-window` majú jednotné reverzné správanie: prvé kliknutie okno zobrazí, druhé ho skryje,
- tlačidlá priebežne zobrazujú stav cez `is-active` a `aria-pressed`.

Jednorazové príkazy, napríklad načítanie súboru, spustenie výpočtu alebo vymazanie výsledku, zostávajú príkazmi. Reverzná funkcia sa týka ovládačov stavov, vrstiev, panelov a okien.

## Súvisiace súbory

- `CC/ux/workbench-shell/quick-tool-dock/quick-tool-dock-controller.js`
- `CC/ux/workbench-shell/quick-tool-dock/quick-tool-dock.view.php`
- `CC/ux/flight-playback/flight-playback/flight-playback-controls.view.php`

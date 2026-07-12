# TermikaXC v2.6 – diagnostika geometrie terénu

## Stav

Prvá etapa v2.6 overuje iba geometriu skutočného Cesium terénu. Hotspot, slnečný model ani prúdenie sa zatiaľ nepočítajú.

## Súbory

- `XC/js/terrain-analysis.js` – výšková mriežka, sklon, orientácia, zakrivenie a pracovná morfologická klasifikácia.
- `XC/terrain-analysis-test.php` – samostatná testovacia stránka bez zásahu do funkčnej v2.5.
- `XC/js/terrain-analysis-ui.js` – pripravené ovládanie pre neskoršie zapojenie do hlavnej aplikácie.

## Test

1. Otvoriť `XC/terrain-analysis-test.php`.
2. Kliknutím vybrať stred analyzovanej oblasti.
3. Spustiť analýzu.
4. Porovnať farebnú diagnostiku s reálnou geometriou terénu.

Až po overení geometrie sa pokračuje modelom polohy Slnka a insolácie.

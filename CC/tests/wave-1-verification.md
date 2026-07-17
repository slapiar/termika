# Overenie prvej vlny v XC

Žiadny kandidát sa nezapojí do runtime `CC`, kým nemá zaznamenané `VERIFIED_XC`.

| Modul | Hostiteľské pracoviská | Aktuálny stav | Povinný dôkaz pred prenosom |
|---|---|---|---|
| `system-status-bar` | `XC/terrain-analysis-test.php` | DEBUGGING_XC | po nasadení zobrazuje vlastníka, rok a `3.1.0` z `XC/asset/RELEASE_VERSION.txt`; chýbajúci/neplatný súbor dá jasný chybový stav |
| `window-core` | `XC/index.php`, `XC/terrain-analysis-test.php` | DISCOVERED | presun, resize, focus, z-index, zatvorenie, opätovné otvorenie a reset bez duplicitných listenerov |
| `workbench-shell` | `XC/explorer.php`, `XC/terrain-analysis-test.php` | DISCOVERED | navigácia, dock, téma, quick tools a otvorenie nastavení na podporovaných šírkach |
| `map-pointer-tools` | Explorer a Terrain Analysis | DISCOVERED | prepnutie kurzora, reticle a súradnice bez zásahu do mapového picku |
| `camera-hud` | Explorer a Terrain Analysis | DISCOVERED | zobrazenie, skrytie, súradnice, kamera a AGL bez falošného `#radiusInput` kontraktu |
| `cesium-basemap-control` | Terrain Analysis | DISCOVERED | skrytie/obnova imagery bez vypnutia 3D reliéfu a korektné nové vrstvy |
| `diagnostics-console` | `XC/index.php`, `XC/terrain-analysis-test.php` | DISCOVERED | logovanie, čistenie, skrytie a obnova v oboch hostiteľoch |
| `terrain-legend` | Terrain Analysis | DISCOVERED | otvorenie, obsah, presun, resize, zatvorenie a opätovné otvorenie |

## Beh 2026-07-17 – vstupná kontrola

- Register obsahuje presne osem kandidátov a všetci majú `runtime_enabled: false`.
- Všetkých osem manifestov je platný JSON a každý odkazovaný zdroj v `XC` existuje.
- Všetky kotvy uvedené za `#` boli nájdené v príslušnom zdroji.
- Opravený bol chybný zápis pôvodu `window-core` z `XC/terrain-analysis-test.php:.floating-window` na `XC/terrain-analysis-test.php#.floating-window`.
- Verejný koreň `https://xc.flyfree.cloud/` momentálne zobrazuje predvolenú stránku hostingu; očakávaná cesta `/termika/XC/terrain-analysis-test.php` vracia 404.
- V pracovnom prostredí nie je PHP runtime a cloudový prehliadač nemá prístup k lokálnemu preview. Interakčné dôkazy preto v tomto behu nevznikli.

Výsledok: vstupná štruktúra prešla, ale žiadny kandidát nebol iba na základe statickej kontroly povýšený na `VERIFIED_XC`.

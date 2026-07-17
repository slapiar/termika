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

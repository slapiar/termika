<nav id="quickToolDock" class="quick-tool-dock" aria-label="Rýchle mapové nástroje">
    <button type="button" id="quickOpenSourcesButton" title="Zdroje a nastavenia">◎</button>
    <button type="button" id="quickAnalyzeButton" title="Spustiť analýzu">▶</button>
    <button type="button" id="quickClearButton" title="Skryť výsledky">■</button>
    <button type="button" id="quickCursorModeButton" title="Prepnúť režim myši (zameriavací/štandardný)">✛</button>
    <button type="button" data-show-window="legend" title="Legenda">L</button>
    <button type="button" data-show-window="debugConsole" title="Debugger">D</button>
    <button type="button" data-show-window="cellDiagnostics" title="Diagnostika bunky">?</button>
    <button type="button" data-show-window="windyMapWindow" title="Windy mapa">W</button>
    <?php require __DIR__ . '/../../map-pointer-tools/cursor-coordinate-badge/cursor-coordinate-badge.view.php'; ?>
    <button type="button" id="quickHudToggleButton" title="Kamerový HUD">H</button>
    <button type="button" id="quickLoadIgcButton" title="Načítať IGC (dátum letu → TEMP podľa trate)">⇧</button>
    <button type="button" id="quickTempReachButton" title="Zobraziť dosah pripojených TEMP profilov (100 km)">⊚</button>
    <button type="button" id="quickPilotModelToggleButton" title="Vyber 3D objekt v sekcii Zdroje" disabled>✈</button>
</nav>

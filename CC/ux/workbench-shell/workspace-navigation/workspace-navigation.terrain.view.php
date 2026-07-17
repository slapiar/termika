<div id="navShell" class="nav-shell" data-dock="top">
    <div class="nav-bar" role="navigation" aria-label="Navigačný panel testovacej stránky">
        <div class="nav-brand">
            <strong>TermikaXC Test Navigator</strong>
            <span>priorita: Zdroje → Analýza → Zobrazenie → Vietor → TEMP → Záznam → Okná</span>
        </div>
        <div class="nav-primary">
            <button type="button" class="nav-tab" data-nav-route="explorer">Explorer</button>
            <button type="button" class="nav-tab is-active" data-nav-section="sources">Zdroje</button>
            <button type="button" class="nav-tab" data-nav-section="analysis">Analýza</button>
            <button type="button" class="nav-tab" data-nav-section="display">Zobrazenie</button>
            <button type="button" class="nav-tab" data-nav-section="wind">Vietor</button>
            <button type="button" class="nav-tab" data-nav-section="temp">TEMP</button>
            <button type="button" class="nav-tab" data-nav-section="record">Záznam</button>
            <button type="button" class="nav-tab" data-nav-section="windows">Okná</button>
            <button type="button" class="nav-tab nav-home-tab" data-nav-home="index">Domov</button>
        </div>
        <div class="nav-meta">
            <label class="nav-dock-picker">Lišta
                <select id="navDockMode" aria-label="Ukotvenie navigačnej lišty">
                    <option value="top" selected>Hore</option>
                    <option value="bottom">Dole</option>
                    <option value="left">Vľavo</option>
                    <option value="right">Vpravo</option>
                </select>
            </label>
            <button id="navThemeToggleButton" class="nav-theme-toggle" type="button" title="Prepnúť svetlý/tmavý režim">☀</button>
            <button id="navCloseDrawerButton" class="nav-close-button" type="button" title="Zavrieť vysúvateľný panel">×</button>
        </div>
    </div>

    <section id="navDrawer" class="nav-drawer" aria-label="Obsah navigačnej sekcie" hidden>
        <div class="nav-drawer-section" data-nav-section="explorer">
            <div class="drawer-grid">
                <div class="drawer-card full">
                    <h3>Explorer</h3>
                    <p>Táto sekcia je pripravená pre Joyee workflow a prieskumné nástroje. Môže tu pribudnúť výber vrstiev, diagnostické pohľady a ďalšie prieskumné režimy bez zahltenia hlavných sekcií.</p>
                    <div class="action-row">
                        <button type="button" data-show-window="legend">Legenda</button>
                        <button type="button" data-show-window="cellDiagnostics">Diagnostika bunky</button>
                        <button type="button" data-show-window="debugConsole">Debugger</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="nav-drawer-section is-active" data-nav-section="sources">
            <div class="drawer-grid">
                <div class="drawer-card wide">
                    <h3>Zdroje letu a profilov</h3>
                    <p>Načítanie IGC a TEMP patrí sem. Z tejto sekcie sa začína pracovný tok.</p>
                    <input id="igcFileInput" type="file" accept=".igc,text/plain,application/octet-stream" hidden>
                    <input id="tempFileInput" type="file" accept=".json,.txt,.csv,.temp,.snd,application/json,text/plain,text/csv" hidden>
                    <div class="action-row">
                        <button id="loadIgcButton" type="button" title="Načítať iný IGC z počítača">Načítať IGC</button>
                        <button id="loadTempButton" type="button" title="Načítať TEMP profil zo súboru">Načítať TEMP</button>
                    </div>
                    <div class="row"><span class="label">IGC zdroj:</span><span id="loadedIgcName" class="val">bez súboru</span></div>
                    <div class="row"><span class="label">Aktuálny stred:</span><strong id="centerText">46.43000, 11.85000</strong></div>
                    <div class="row"><span class="label">TEMP zdroj:</span><span id="pTempFile" class="val">XCtrack/temptest.json</span></div>
                    <div class="row"><span class="label">Počet hladín:</span><span id="pTempLevels" class="val">--</span></div>
                </div>
                <div class="drawer-card">
                    <h3>Nastavenie fokusu</h3>
                    <label>Zadaj stred (lat, lon)
                        <input id="centerInput" type="text" value="46.43000, 11.85000" placeholder="46.43000, 11.85000" style="width:100%">
                    </label>
                    <button id="centerApplyButton" type="button">Presunúť mapu na stred (3000 m ASL)</button>
                </div>
                <div class="drawer-card full">
                    <h3>Zdroje TEMP a sieťové nastavenia</h3>
                    <div class="drawer-grid">
                        <div class="drawer-card">
                            <label>Zdroj TEMP
                                <select id="windTempSourceMode">
                                    <option value="auto">Automaticky (Windy → stanica → súbor)</option>
                                    <option value="windy" selected>Windy.com cez proxy</option>
                                    <option value="station">Najbližšia meteo stanica</option>
                                    <option value="file">Lokálny súbor</option>
                                </select>
                            </label>
                            <label>Lokálny TEMP súbor alebo adresa <input id="windTempSourceUrl" type="text" value="XCtrack/temptest.json"></label>
                        </div>
                        <div class="drawer-card">
                            <label>Adresa Windy proxy <input id="windyTempUrl" type="text" value="windy-temp-proxy.php?lat=${lat}&lon=${lon}" placeholder="windy-temp-proxy.php?lat=${lat}&amp;lon=${lon}"></label>
                            <label>Zoznam staníc alebo jeho adresa <input id="stationIndexUrl" type="text" placeholder="https://... alebo template s ${lat}/${lon}"></label>
                            <label>Šablóna adresy profilu stanice <input id="stationProfileUrlTemplate" type="text" placeholder="https://.../${stationId}.json"></label>
                            <div class="action-row">
                                <button id="openSetupButton" type="button">Otvoriť setup.php</button>
                            </div>
                            <p style="margin:6px 0 0;color:#6f8594;font-size:12px;">Tu sa zadáva aj <strong>WINDY_API_KEY</strong> pre Windy TEMP proxy.</p>
                        </div>
                        <div class="drawer-card">
                            <h3>Údržba dát TEMP</h3>
                            <p>Ručné čistenie automaticky uložených TEMP záznamov, ktoré neboli použité v žiadnej uloženej analýze.</p>
                            <div class="action-row">
                                <button id="tempCleanupButton" type="button" title="Vymazať nepoužité auto TEMP záznamy">Vyčistiť nepoužité TEMP</button>
                            </div>
                            <p id="tempUnusedCountStatus" style="margin:6px 0 0;color:#8fa9b8;font-size:12px;">Nepoužité TEMP v DB: <strong id="tempUnusedCountBadge" style="color:#ff6b6b;font-size:11px;">--</strong></p>
                            <p id="tempCleanupStatus" style="margin:6px 0 0;color:#8fa9b8;font-size:12px;">Posledná údržba: --</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="nav-drawer-section" data-nav-section="analysis">
            <div class="drawer-grid">
                <div class="drawer-card">
                    <h3>Rozsah analýzy</h3>
                    <label>Polomer kruhu <input id="radiusInput" type="number" min="40" max="20000" step="40" value="400"> m</label>
                    <label>Rozostup vzoriek <input id="spacingInput" type="number" min="5" max="1000" step="5" value="40"> m</label>
                </div>
                <div class="drawer-card wide">
                    <h3>Analytické vrstvy</h3>
                    <label><input class="module-toggle" type="checkbox" value="geometry" checked> Geometria reliéfu</label>
                    <label><input class="module-toggle" type="checkbox" value="contours" checked> Vrstevnice</label>
                    <label class="future"><input type="checkbox" disabled> Doliny a žľaby – pripravujeme</label>
                    <label class="future"><input type="checkbox" disabled> Hydrológia – pripravujeme</label>
                    <label class="future"><input type="checkbox" disabled> Povrchový kryt – pripravujeme</label>
                    <label class="future"><input type="checkbox" disabled> Geológia – pripravujeme</label>
                    <label class="future"><input type="checkbox" disabled> Oslnenie – pripravujeme</label>
                </div>
                <div class="drawer-card full">
                    <h3>Výpočet</h3>
                    <div class="action-row">
                        <button id="analyzeButton" type="button">Spustiť vybrané analýzy</button>
                        <button id="clearButton" type="button">Skryť výsledky</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="nav-drawer-section" data-nav-section="display">
            <div class="drawer-grid">
                <div class="drawer-card">
                    <h3>Mapové vrstvy</h3>
                    <label><input id="geometryVisible" type="checkbox" checked> Zobraziť geometriu reliéfu</label>
                    <label><input id="contoursVisible" type="checkbox" checked> Zobraziť tmavošedé vrstevnice</label>
                </div>
                <div class="drawer-card wide">
                    <h3>Pomocné okná a zobrazenia</h3>
                    <div class="action-row">
                        <button type="button" data-show-window="legend">Legenda</button>
                        <button type="button" data-show-window="cellDiagnostics">Diagnostika bunky</button>
                        <button type="button" data-show-window="debugConsole">Debugger</button>
                    </div>
                    <p>Legenda, diagnostika a debugger sú samostatné plávajúce okná, presúvateľné a zatvárateľné.</p>
                </div>
            </div>
        </div>

        <div class="nav-drawer-section" data-nav-section="wind">
            <div class="drawer-grid">
                <div class="drawer-card">
                    <h3>WIND jadro</h3>
                    <label><input id="windEnabled" type="checkbox" checked> Zobraziť veterné prúdnice</label>
                    <label>Výška nad terénom <input id="windAglInput" type="number" min="20" max="5000" step="10" value="300"> m AGL</label>
                    <label>Rozostup vetra <input id="windSpacingInput" type="number" min="30" max="1200" step="10" value="120"> m</label>
                    <label>Základná rýchlosť <input id="windSpeedInput" type="number" min="0" max="40" step="0.1" value="4.5"> m/s</label>
                    <label>Smer toku <input id="windDirInput" type="number" min="0" max="359" step="1" value="230"> °</label>
                    <label><input id="windUseTempProfile" type="checkbox" checked> Použiť vietor z TEMP profilu</label>
                </div>
                <div class="drawer-card wide">
                    <h3>Vizuál vetra a animácia</h3>
                    <label>Farebnosť vetra
                        <select id="windColorMode">
                            <option value="tempDeltaK" selected>Teplotný kontrast</option>
                            <option value="speed">Rýchlosť vetra</option>
                            <option value="convergence">Konvergencia/divergencia</option>
                            <option value="verticalMotion">Vertikálny pohyb (stúpanie/klesanie)</option>
                        </select>
                    </label>
                    <div id="windColorLegend" style="margin-top:6px;padding:6px 8px;border:1px solid #35505f;border-radius:6px;background:rgba(16,33,43,.45);font-size:12px;color:#cfe3ef"></div>
                    <label>Téma farieb
                        <select id="windColorTheme">
                            <option value="dark" selected>Tmavé pozadie</option>
                            <option value="light">Svetlé pozadie</option>
                        </select>
                    </label>
                    <label><input id="windAnimate" type="checkbox" checked> Animovať smer toku</label>
                    <label>Intenzita animácie
                        <select id="windAnimationIntensity">
                            <option value="low">Nízka</option>
                            <option value="medium" selected>Stredná</option>
                            <option value="high">Vysoká</option>
                            <option value="auto">Auto (podľa FPS)</option>
                        </select>
                    </label>
                    <div id="windFpsIndicator" style="margin-top:4px;color:#8fa9b8;font-size:12px;">FPS: -- | AUTO profil: --</div>
                </div>
                <div class="drawer-card full">
                    <h3>Komunikácia fokusu (windy-focus)</h3>
                    <p>Univerzálny komunikačný kanál pre prenos fokusu medzi nástrojmi. Týmto sa mapové integrácie prepájajú bez pevnej väzby na konkrétny panel.</p>
                    <div class="row" style="margin:6px 0 10px;">
                        <span class="label">Windy adapter:</span>
                        <span id="windyAdapterStatusBadge" class="val">OFFLINE</span>
                    </div>
                    <div class="row" style="margin:0 0 10px;">
                        <span class="label">Posledný update:</span>
                        <span id="windyAdapterLastUpdateBadge" class="val">--</span>
                    </div>
                    <div class="row" style="margin:0 0 10px;">
                        <span class="label">Zdroj:</span>
                        <span id="windyAdapterSourceBadge" class="val">--</span>
                    </div>
                    <div class="action-row">
                        <button id="windyAdapterConnectButton" type="button">Skúsiť pripojiť Windy adapter</button>
                        <button id="windBroadcastFocusButton" type="button">Poslať aktuálny fokus</button>
                        <button id="windSimulateIncomingFocusButton" type="button">Simulovať príchod fokusu</button>
                    </div>
                </div>
                <div class="drawer-card full">
                    <h3>Generácie vetra a porovnanie</h3>
                    <div class="wind-generation-radio-group" role="radiogroup" aria-label="Režim generácie vetra">
                        <label><input type="radio" name="windGenerationModeTest" value="keep" checked> Zachovať poslednú generáciu</label>
                        <label><input type="radio" name="windGenerationModeTest" value="clear-last"> Vymazať poslednú generáciu</label>
                        <label><input type="radio" name="windGenerationModeTest" value="clear-all"> Vymazať všetky generácie z mapy</label>
                    </div>
                    <div class="action-row">
                        <button id="windDeleteLastButton" type="button">Zmazať poslednú generáciu</button>
                        <button id="windDeleteAllButton" type="button">Zmazať všetky generácie</button>
                        <button id="windClearTodayButtonTest" type="button">Vymazať dnešné GENauto</button>
                        <button id="windLoadFromFilesButtonTest" type="button">Načítať vietor zo súborov</button>
                        <button id="mapLoadFromFilesButtonTest" type="button">Načítať mapu zo súborov</button>
                    </div>
                    <div class="compare-row">
                        <span>Porovnať:</span>
                        <select id="windCompareGenerationTest" class="compare-select" aria-label="Výber WIND generácie na porovnanie">
                            <option value="">Najprv načítaj uložené WIND generácie</option>
                        </select>
                    </div>
                    <div class="compare-row">
                        <span>Mapa:</span>
                        <select id="mapCompareGenerationTest" class="compare-select" aria-label="Výber mapovej generácie na porovnanie">
                            <option value="">Najprv načítaj uložené mapové generácie</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div class="nav-drawer-section" data-nav-section="temp">
            <div class="drawer-grid">
                <div class="drawer-card full">
                    <h3>TEMP profil</h3>
                    <p>V tejto sekcii je vždy viditeľná aktuálna tabuľka TEMP a prehľadový graf. Pri výpočte sa sem zapíše profil použitý tesne pred simuláciou.</p>
                    <div class="row"><span class="label">Fokus TEMP:</span><span id="tempFocusCoords" class="val">--</span></div>
                    <div class="action-row">
                        <button id="tempDownloadButton" type="button" title="Stiahnuť aktuálny TEMP profil do JSON">Stiahnuť TEMP JSON</button>
                        <button id="tempSaveDbButton" type="button" title="Uložiť aktuálny TEMP profil do GENauto databázy">Uložiť TEMP do DB</button>
                        <button id="tempRefreshSavedButton" type="button" title="Načítať dnešný zoznam uložených TEMP profilov">Načítať zoznam TEMP</button>
                    </div>
                    <div class="row" style="margin-top:8px;gap:8px;">
                        <span class="label">Uložené TEMP:</span>
                        <select id="tempSavedSelect" class="compare-select" aria-label="Výber uloženého TEMP profilu" style="flex:1;min-width:220px;">
                            <option value="">Najprv načítaj zoznam TEMP</option>
                        </select>
                        <button id="tempLoadSavedButton" type="button" title="Načítať vybraný TEMP profil zo zoznamu">Načítať</button>
                    </div>
                    <div id="tempProfileSummary" class="temp-data-summary"></div>
                </div>
                <div class="drawer-card wide">
                    <h3>Graf profilu</h3>
                    <div class="temp-graph-wrap">
                        <canvas id="tempProfileGraph"></canvas>
                    </div>
                </div>
                <div class="drawer-card wide">
                    <h3>Tabuľka hladín</h3>
                    <div id="tempProfileTableWrap" class="temp-table-wrap"></div>
                </div>
            </div>
        </div>

        <div class="nav-drawer-section" data-nav-section="record">
            <div class="drawer-grid">
                <div class="drawer-card full">
                    <h3>Záznam videa</h3>
                    <label>FPS záznamu
                        <select id="recordFps">
                            <option value="30" selected>30 fps</option>
                            <option value="60">60 fps</option>
                        </select>
                    </label>
                    <label>Kvalita
                        <select id="recordQuality">
                            <option value="normal" selected>Normal (8 Mbps)</option>
                            <option value="high">High (16 Mbps)</option>
                        </select>
                    </label>
                    <label><input id="recordAutoHideUi" type="checkbox" checked> Pri zázname skryť legendu a diagnostiku</label>
                    <div class="record-row">
                        <button id="recordToggleButton" type="button">Start recording</button>
                        <span id="recordBadge" class="record-badge" hidden><i class="record-dot"></i><span id="recordElapsed">REC 00:00</span></span>
                    </div>
                </div>
            </div>
        </div>

        <div class="nav-drawer-section" data-nav-section="windows">
            <div class="drawer-grid">
                <div class="drawer-card full">
                    <h3>Okná a nástroje</h3>
                    <div class="action-row">
                        <button type="button" data-show-window="legend">Otvoriť legendu</button>
                        <button type="button" data-show-window="cellDiagnostics">Otvoriť diagnostiku</button>
                        <button type="button" data-show-window="debugConsole">Otvoriť debugger</button>
                        <button type="button" data-show-window="windyMapWindow">Otvoriť Windy mapu</button>
                    </div>
                </div>
            </div>
        </div>
    </section>
</div>

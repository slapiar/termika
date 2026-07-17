<aside id="rightPanel" class="dashboard-panel workspace-window" aria-label="Meteo a 3D geometria">
            <div class="window-header orange" title="Potiahni za hlavičku. Dvojklik vráti panel na pôvodné miesto.">
                <strong>METEO &amp; 3D GEOMETRIA</strong>
                <span class="drag-symbol" aria-hidden="true">⠿</span>
            </div>
            <div class="panel-content">
                <div class="row"><span class="label">Vario:</span><span id="pVario" class="val">-- m/s</span></div>
                <div class="row"><span class="label">Výška IGC:</span><span id="pAlt" class="val">-- m AMSL</span></div>
                <div class="row"><span class="label">Výška terénu:</span><span id="pTerrain" class="val">--</span></div>
                <div class="row"><span class="label">Nad terénom:</span><span id="pAgl" class="val cyan">-- m AGL</span></div>
                <div class="row"><span class="label">Vertikálna korekcia:</span><span id="pAltCorrection" class="val">--</span></div>
                <div class="row"><span class="label">Kalibrácia:</span><span id="pTerrainMode" class="val">Čakám...</span></div>
                <div class="row"><span class="label">AGL štart / cieľ:</span><span id="pAglStartFinish" class="val">--</span></div>
                <div class="row"><span class="label">Minimum AGL:</span><span id="pAglMin" class="val">--</span></div>
                <div class="row"><span class="label">Body pod terénom:</span><span id="pAglNegative" class="val">--</span></div>
                <div class="row"><span class="label">Poloha IGC:</span><span id="pPosition" class="val">--</span></div>
                <div class="row"><span class="label">Základňa (LCL):</span><span id="pLcl" class="val magenta">Vypočítavam...</span></div>
                <div class="row"><span class="label">Priestor CTR:</span><span id="pAirspace" class="val">Bezpečný</span></div>
                <div class="separator"></div>
                <div class="row"><span class="label">IGC súbor:</span><span id="pIgcFile" class="val">let.igc</span></div>
                <div class="row"><span class="label">IGC bodov:</span><span id="pIgcPoints" class="val">--</span></div>
                <div class="row"><span class="label">TEMP súbor:</span><span id="pTempFile" class="val">temptest.json</span></div>
                <div class="row"><span class="label">TEMP hladín:</span><span id="pTempLevels" class="val">--</span></div>
                <div class="row"><span class="label">Miesto:</span><span id="pSite" class="val">--</span></div>
                <div class="separator"></div>
                <div class="panel-subtitle">WIND GENERÁCIE</div>
                <div class="wind-generation-radio-group" role="radiogroup" aria-label="Režim generácie vetra">
                    <label><input type="radio" name="windGenerationModeMain" value="keep" checked> Zachovať poslednú generáciu</label>
                    <label><input type="radio" name="windGenerationModeMain" value="clear-last"> Vymazať poslednú generáciu</label>
                    <label><input type="radio" name="windGenerationModeMain" value="clear-all"> Vymazať všetky generácie z mapy</label>
                </div>
                <div class="wind-generation-mini-actions">
                    <button id="windClearTodayButtonMain" type="button" title="Ručne vymazať všetky dnešné generácie z GENauto a z mapy">Vymazať dnešné GENauto</button>
                    <button id="windLoadFromFilesButtonMain" type="button" title="Načítať vietor zo súborov GENauto/wind">Načítať vietor zo súborov</button>
                    <button id="mapLoadFromFilesButtonMain" type="button" title="Načítať mapové generácie zo súborov GENauto/map">Načítať mapu zo súborov</button>
                </div>
                <div class="row wind-compare-row">
                    <span class="label">Porovnať:</span>
                    <select id="windCompareGenerationMain" class="wind-compare-select" aria-label="Výber WIND generácie na porovnanie">
                        <option value="">Najprv načítaj uložené WIND generácie</option>
                    </select>
                </div>
                <div class="row map-compare-row">
                    <span class="label">Mapa:</span>
                    <select id="mapCompareGenerationMain" class="map-compare-select" aria-label="Výber mapovej generácie na porovnanie">
                        <option value="">Najprv načítaj uložené mapové generácie</option>
                    </select>
                </div>
            </div>
        </aside>

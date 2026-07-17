<aside id="leftPanel" class="dashboard-panel workspace-window" aria-label="Fyziológia pilota">
            <div class="window-header cyan" title="Potiahni za hlavičku. Dvojklik vráti panel na pôvodné miesto.">
                <strong>FYZIOLÓGIA PILOTA (LIVE)</strong>
                <span class="drag-symbol" aria-hidden="true">⠿</span>
            </div>
            <div class="panel-content">
                <div class="row"><span class="label">Pilot:</span><span id="pId" class="val">Čakám na IGC...</span></div>
                <div class="row"><span class="label">Srdcový tep:</span><span id="pHr" class="val">-- BPM</span></div>
                <div class="row"><span class="label">Saturácia SpO₂:</span><span id="pSpo2" class="val">-- %</span></div>
                <div class="row"><span class="label">Stav tela:</span><span id="pStatus" class="val">--</span></div>
                <div class="chart-wrap">
                    <canvas id="liveBioChart"></canvas>
                </div>
            </div>
        </aside>

<section id="flightControls" class="flight-controls" aria-label="Ovládanie prehrávania letu">
                <div class="playback-buttons">
                    <button id="playPauseButton" type="button" disabled title="Spustiť alebo pozastaviť prehrávanie letu">▶ Prehrať</button>
                    <button id="stopPlaybackButton" type="button" disabled title="Zastaviť prehrávanie a vrátiť sa na začiatok">■ Stop</button>
                </div>

                <div class="timeline-area">
                    <div class="timeline-meta">
                        <span id="flightCurrentTime">--:--:--</span>
                        <span id="flightProgressText">0 / 0</span>
                        <span id="flightEndTime">--:--:--</span>
                    </div>
                    <input id="flightTimeline" type="range" min="0" max="0" value="0" step="1" disabled aria-label="Časová os letu">
                </div>

                <div class="vario-legend" aria-label="Farebná legenda vária">
                    <span><i class="vario-swatch strong-up"></i>&gt; +2</span>
                    <span><i class="vario-swatch up"></i>stúpanie</span>
                    <span><i class="vario-swatch neutral"></i>0</span>
                    <span><i class="vario-swatch down"></i>klesanie</span>
                    <span><i class="vario-swatch strong-down"></i>&lt; −1,5</span>
                </div>
            </section>
<?php require __DIR__ . '/../../workbench-shell/quick-tool-dock/quick-tool-dock.view.php'; ?>

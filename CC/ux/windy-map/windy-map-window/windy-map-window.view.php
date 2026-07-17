<section id="windyMapWindow" class="floating-window" data-window-name="Windy mapa" style="width:520px;height:480px;right:20px;top:80px" hidden>
    <header class="window-header">
        <div class="window-title">Windy mapa</div>
        <div class="window-actions">
            <span id="windyConnectionStatusBadge" style="display:inline-flex;align-items:center;padding:0 8px;height:24px;border:1px solid #426277;border-radius:999px;background:rgba(7,16,24,.8);color:#8fa9b8;font-size:11px;font-weight:700;line-height:1;white-space:nowrap">Windy: čakám</span>
            <button id="windyFocusPickerToggleButton" class="window-action" type="button" title="Zapnúť výber fokusu z mapy">⌖</button>
            <button class="window-action close-window" type="button" title="Zavrieť okno">×</button>
        </div>
    </header>
    <div class="window-body" style="padding:0;display:flex;flex-direction:column;height:calc(100% - 36px)">
        <div style="position:relative;flex:1;min-height:0">
            <div id="windy" style="position:absolute;inset:0;min-height:0"></div>
            <div id="windyMapLoadingPanel" style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:14px;background:rgba(5,12,18,.84);border-bottom:1px solid #35505f;z-index:2">
                <div style="font-size:12px;font-weight:700;letter-spacing:.04em;color:#70e8ff;margin-bottom:8px">WINDY MAPA - STAV PRIPOJENIA</div>
                <div id="windyMapLoadingText" style="font-size:12px;line-height:1.45;color:#cfe6f3;white-space:pre-line">Čakám na otvorenie okna Windy...</div>
            </div>
        </div>
        <div style="padding:8px;display:flex;align-items:center;gap:8px;border-top:1px solid #35505f;background:rgba(7,16,24,.85)">
            <span id="windyMapFocusLabel" style="flex:1;font-size:12px;color:#8fa9b8">Naviguj na Windy mape...</span>
            <button id="windyUseFocusButton" type="button" style="padding:6px 14px;background:#0d4a6b;border:1px solid #70e8ff;border-radius:6px;color:#dff7ff;cursor:pointer;font-weight:700">Použiť tento fokus ↗</button>
        </div>
    </div>
</section>

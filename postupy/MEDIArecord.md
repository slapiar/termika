# TermikaXC - MEDIArecord (snimka a video priam z appky)

Tento postup popisuje, ako urobit:

1. rychly zaznam obrazovky (bez zasahu do kodu),
2. natyvny Record rezim priamo v appke cez MediaRecorder,
3. export videa pripraveneho na web.

Ciel: jednym klikom spustit zaznam animacie prudnic a jednym klikom ulozit video.

## 1) Najrychlejsia cesta bez kodu (OBS)

Pouzi OBS Studio, ked potrebujes okamzite vystup bez implementacie.

Odporucane parametre:

- rozlisenie: 1920x1080,
- fps: 30 (alebo 60 pre velmi plynuly pohyb),
- format: MP4 (H.264),
- bitrate: 8-16 Mbps.

Vyhoda: ziadna zmena projektu. Nevyhoda: nahrava sa aj UI/okolie okna, nie len canvas.

## 2) Natyvny Record rezim v appke (MediaRecorder)

## 2.1 Co chceme dosiahnut

- tlacidlo Start recording,
- tlacidlo Stop recording,
- ulozenie suboru WebM alebo MP4 (podla browseru),
- nazov suboru s datumom a casom,
- bez ruiveho UI (volitelne skrytie panelov pocas zaznamu).

## 2.2 Kde to napojit

Pre testovaci rezim je vhodne pridat ovladanie do:

- XC/terrain-analysis-test.php (UI tlacidla + volby),
- samostatny JS helper, napr. XC/js/wind-recorder.js.

Pre produkciu to iste napojit aj do hlavnej stranky:

- XC/index.php.

## 2.3 Zakladny tok

1. Ziskaj referenciu na Cesium canvas.
2. Zavolaj canvas.captureStream(fps).
3. Vytvor MediaRecorder(stream, options).
4. Zbieraj chunks v ondataavailable.
5. Pri stop vytvor Blob a stiahni cez odkaz.

## 2.4 Minimalny implementacny kod

```javascript
function createWindRecorder(opts) {
  const {
    canvas,
    fps = 30,
    bitrate = 12_000_000,
    onStart,
    onStop,
    onError
  } = opts || {};

  let stream = null;
  let recorder = null;
  let chunks = [];
  let startedAt = 0;

  function pickMimeType() {
    const candidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    for (const t of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  }

  function start() {
    if (!canvas) throw new Error('Recorder: missing canvas');
    if (!window.MediaRecorder) throw new Error('MediaRecorder is not supported');
    if (recorder && recorder.state === 'recording') return;

    chunks = [];
    startedAt = Date.now();
    stream = canvas.captureStream(fps);
    const mimeType = pickMimeType();

    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: bitrate
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onerror = (e) => {
      if (typeof onError === 'function') onError(e.error || e);
    };

    recorder.onstart = () => {
      if (typeof onStart === 'function') onStart();
    };

    recorder.start(1000);
  }

  function stop() {
    return new Promise((resolve, reject) => {
      if (!recorder || recorder.state !== 'recording') {
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        try {
          const mime = recorder.mimeType || 'video/webm';
          const blob = new Blob(chunks, { type: mime });
          const elapsedMs = Date.now() - startedAt;

          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
          }

          if (typeof onStop === 'function') onStop({ blob, mime, elapsedMs });
          resolve({ blob, mime, elapsedMs });
        } catch (err) {
          reject(err);
        } finally {
          recorder = null;
          stream = null;
          chunks = [];
        }
      };

      recorder.stop();
    });
  }

  return { start, stop };
}
```

## 2.5 Ulozenie suboru

```javascript
function downloadRecording(blob, mimeType) {
  const ext = (mimeType || '').includes('webm') ? 'webm' : 'mp4';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `termikaxc-wind-${stamp}.${ext}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
```

## 2.6 One-click UX navrh

Prakticke ovladanie:

- jedno tlacidlo Record (toggle):
  - stav A: Start recording,
  - stav B: Stop recording.
- mini indikator REC + casovac mm:ss,
- volby v paneli:
  - FPS: 30 / 60,
  - kvalita: normal / high,
  - auto-hide panelov pri zazname (on/off).

Dolezite:

- pocas zaznamu zamknut UI zmeny, ktore menia layout,
- nepouzivat zbytocne redraw mimo animacie,
- po stop vratit UI do povodneho stavu.

## 2.7 Kompatibilita browserov

- Chrome/Edge: WebM zvycajne bez problemov,
- Firefox: tiez vhodny pre WebM,
- Safari: podpora byva odlisna, treba fallback.

Fallback strategia:

1. ak nie je MediaRecorder, vypisat hlasku a ponuknut OBS,
2. ak mime type nie je podporeny, skusit dalsi kandidatsky typ,
3. ak browser nevie mp4 cez MediaRecorder, exportuj WebM a pre web pripadne prekoduj.

## 2.8 Priprava videa pre web

Odporucany vystup:

- hlavny subor: MP4 (H.264 + AAC),
- alternativa: WebM (VP9).

Priklad prekodovania (server/local stroj s ffmpeg):

```bash
ffmpeg -i input.webm -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -movflags +faststart output.mp4
```

Poznamka:

- `+faststart` je dolezite pre rychle nacitanie videa na webe.

## 2.9 Performance odporucania pre plynuly zaznam

- preferovat 1080p / 30 fps pre stabilitu,
- obmedzit nepotrebne tie mapove vrstvy pri recordingu,
- fixnut pocet prudnic (zabranit nahlym skokom hustoty),
- drzat stabilnu kameru pocas promo zaznamu,
- pri 60 fps zvycit obmedzit detail sceny.

## 2.10 Integracny checklist

1. Pridat JS modul recordera.
2. Pridat UI prvky Start/Stop + volby.
3. Napojit na Cesium canvas.
4. Otestovat 30 a 60 fps.
5. Otestovat dlhy zaznam (2-5 min) bez memory leak.
6. Otestovat fallback bez MediaRecorder.
7. Otestovat export a prehratie vo webovom prehravaci.

## 3) Co implementovat ako prve

Najlepsi postup pre najblizsi krok:

1. najprv pridat Record do XC/terrain-analysis-test.php,
2. po overeni preniest rovnaky modul do XC/index.php,
3. doplnit volitelny auto-hide debug panelov,
4. doplnit predvolene web export profily (1080p30 normal, 1080p60 high).

Takto dostaneme spolahlivy one-click workflow: Start -> leti animacia -> Stop -> stiahne sa video pripravene na web.
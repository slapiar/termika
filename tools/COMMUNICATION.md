# Univerzalny komunikacny modul

## 1. Ucel

Tento nastroj zavadza jednotne rozhranie pre komunikaciu medzi:

- nastrojmi v kliente,
- integraciami tretich stran (napriklad Windy),
- buducimi adaptermi na serverove endpointy.

Ciel je odstranit ad-hoc volania a zjednotit komunikaciu do jedneho modulu, pouzitelneho v celom TermikaXC.

## 2. Identita a stav

| Polozka | Hodnota |
|---|---|
| ID nastroja | `communication-tool` |
| Nazov | Univerzalny komunikacny modul |
| Stav | `ROZPRACOVANE` |
| Verzia | `1.0.0` |
| Implementacia | `XC/js/tool-communication.js` |
| Predvoleny adapter | `local-event-bus` |

## 3. Co modul riesi

1. Registraciu adapterov (`registerAdapter`).
2. Odosielanie sprav (`send`).
3. Dotaz/odpoved (`request`) tam, kde adapter tuto schopnost podporuje.
4. Event hooky pre telemetriu a diagnostiku (`on`, `off`, `emit`).
5. Timeout ochranu pri komunikacii.

## 4. Verejne API

```js
window.TermikaCommunicationTool = {
    VERSION,
    registerAdapter,
    unregisterAdapter,
    listAdapters,
    on,
    off,
    emit,
    send,
    request
};
```

## 5. Zakladne pouzitie

### Odber lokalneho kanala

```js
const stopListening = window.TermikaCommunicationTool.on(
    "channel:windy-focus",
    ({ payload }) => {
        console.log("Windy focus:", payload);
    }
);

// neskor odpojenie listenera
stopListening();
```

### Odoslanie udalosti do kanala

```js
await window.TermikaCommunicationTool.send("windy-focus", {
    lat: 48.97,
    lon: 20.23,
    zoom: 9
});
```

### Registracia externého adaptera

```js
window.TermikaCommunicationTool.registerAdapter({
    id: "windy-map",
    title: "Windy Map Bridge",
    isAvailable: () => Boolean(window.windyAPI),
    send: async (channel, payload) => {
        // implementacia podla konkretneho SDK
        return { ok: true, channel, payload };
    },
    request: async (channel, payload) => {
        return { channel, payload, reply: null };
    }
});
```

## 6. Implementacny postup pre integracie

1. Definovat datovy kontrakt pre kanal (napr. `windy-focus`).
2. Pridat adapter pre konkretny zdroj alebo SDK.
3. Pripojit listener v UI vrstve.
4. Spracovat timeout a fallback spravanie.
5. Logovat `send:start`, `send:success`, `request:start`, `request:success`.

## 7. Prepojenie s Windy navrhom

Pre Windy mapovy most sa odporuca:

- kanal `windy-focus` pre prenos vybraneho fokusu,
- kanal `windy-layer-state` pre aktivny overlay/model/level,
- adapter `windy-map` pre API plugin,
- fallback na `local-event-bus`, ked externy adapter nie je dostupny.

Aktualny stav v kode:

- testovacia stranka ma zapojeny kanal `windy-focus`,
- pripraveny je skeleton adapter `windy-map` v `XC/js/windy-map-adapter.js`,
- adapter publikuje stav cez event `windy-map-adapter:status` (`ready/offline/error`),
- testovacia stranka zobrazuje stav adaptera v sekcii Vietor.

## 8. Obmedzenia aktualnej verzie

1. Modul neriesi perzistenciu sprav (len runtime komunikacia).
2. Modul este nema centralny retry mechanizmus.
3. `request` je adapter-specific a nema unifikovany reply schema.
4. Modul neobsahuje built-in auth vrstvu pre server API.

## 9. Plan rozvoja

1. Pridat korelacne ID pre request/response tracing.
2. Pridat standardizovany error objekt.
3. Pridat volitelny debug panel komunikacie v testovacej stranke.
4. Pridat adapter pre backend proxy endpointy.

## 10. Suvisiace subory

- [`../TOOLS.md`](../TOOLS.md)
- [`WINDY.md`](WINDY.md)
- [`../XC/js/tool-communication.js`](../XC/js/tool-communication.js)
- [`../XC/js/windy-map-adapter.js`](../XC/js/windy-map-adapter.js)
- [`../XC/terrain-analysis-test.php`](../XC/terrain-analysis-test.php)

# START-TERMIKAXC

## Ucel
Spustenie lokalneho PHP servera pre TermikaXC v Codespaces s automatickym prepnutim portov na private.

## Spustenie
```bash
./start-termikaxc.sh
```

Volitelny port (predvolene `8000`):
```bash
./start-termikaxc.sh 8000
```

## Co robi skript
- spusti PHP server na `0.0.0.0:<PORT>` s document root `XC/`
- overi health endpoint na `http://127.0.0.1:<PORT>/`
- v Codespaces automaticky prepne porty na private
- otvori `terrain-analysis-test.php` v prehliadaci (ak je dostupny `BROWSER`)

## Private porty v Codespaces
Predvolene sa po starte prepinaju na private:
- `8000`
- `8001`

Konfigurovatelny zoznam portov:
```bash
TERMIKA_PRIVATE_PORTS="8000,8001,8099" ./start-termikaxc.sh
```

Podporovane formaty:
- oddelenie ciarkou (`8000,8001`)
- oddelenie medzerou (`8000 8001`)

## Poznamky
- Nastavenie private je idempotentne, skript ho moze bezpecne vykonat pri kazdom starte.
- Ak `gh` CLI nie je dostupne, server sa aj tak spusti (bez zlyhania skriptu).

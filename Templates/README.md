# Templates

Zdrojová vrstva jednotnej konštrukcie stránok TermikaXC.

## Štruktúra

```text
Templates/
├── registry.json
├── families/
│   ├── workbench/
│   │   └── template.json
│   ├── setup/
│   │   └── template.json
│   ├── public/
│   │   └── template.json
│   └── embedded/
│       └── template.json
└── shells/
    └── README.md
```

Rodina stránky určuje spoločný dizajnový bundle a základné správanie. Konkrétna stránka poskytuje obsah pomenovaných slotov; funkčné moduly a ich view zostávajú v `/CC`.

Template manifest opisuje:

- identifikátor a rodinu,
- povinné atribúty `<body>`,
- CSS a JS assety,
- dostupné sloty,
- používané jazykové domény.

Template nesmie obsahovať výpočtové jadro, tajné údaje ani kópiu modulového runtime.
# Správa o hromadnom prenose modulov do CC

**Dátum:** 17. júl 2026  
**Zdroj:** `XC`  
**Cieľ:** `CC`

## Výsledok

- 69 prenositeľných nástrojov, prístrojov, okien, adaptérov a služieb má samostatný modulový adresár.
- 12 analytických a fyzikálnych jadier je zachovaných osobitne v `CC/kernels/analytic-and-physics/`.
- Funkčné skupiny sú iba nadradené adresáre; nijaká skupina nebola zlúčená do jedného implementačného súboru.
- Každý modul má jedinečné ID, vlastný manifest, vstupný JavaScript, CSS hranicu a zdrojové snapshoty.
- Všetky snapshoty boli binárne porovnané so zdrojmi v `XC`.
- Žiadny modul nebol automaticky zapojený do runtime.

## Význam vstupných súborov

Vstupný súbor modulu poskytuje `describe()` a pri moduloch s pôvodným JavaScriptom aj `loadLegacy()`. Funkcia načíta zachované skripty z vlastného adresára modulu v deklarovanom poradí. Tým vznikla samostatná načítavacia hranica bez prepisovania vnútornej implementácie.

Pri funkciách, ktoré sú dnes vložené priamo v PHP stránke, je hostiteľský PHP zdroj uložený v `source/`. Taký modul je prenesený a evidovaný, ale jeho manifest pravdivo ponecháva `runtime_enabled: false`; oddelenie konkrétneho inline kontraktu bude ďalší krok.

## Registre

- `CC/registry/modules.json` – všetky samostatné moduly a zachované jadrá,
- `CC/registry/groups.json` – skupiny a ich členské moduly,
- `CC/registry/wave-1.json` – pôvodný pilotný register prvej vlny.

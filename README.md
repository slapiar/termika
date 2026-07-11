# termika
Výpočet preletových možností a stavu pilota za letu

# 3D Tactical Flight Control & Debriefing Station (TermikaXC)

## 1. Úvod a vizia projektu
**TermikaXC** predstavuje taktickú leteckú základňu novej generácie pre bezmotorové lietanie (gliding, paragliding, hang-gliding). Systém bol vyvinutý s primárnym dôrazom na **Red Bull X-Alps disciplínu** a výkonnostné prelety, kde piloti siahajú na absolútne dno svojich fyzických a mentálnych síl. 

Na rozdiel od doterajších 2D sledovacích systémov, ktoré zobrazujú iba polohu lietadla, TermikaXC spája **termodynamiku atmosféry, aerodynamiku krídla a fyziológiu človeka do jedného 3D ekosystému**. Umožňuje pozemnému personálu, lekárom a inštruktorom vidieť inak neviditeľné sily prírody a včas odhaliť kritické chyby alebo fyziologické zlyhania pilota za letu.

---

## 2. Meteorológia a termodynamika (Ako to počítame)
Systém nepracuje s odhadmi, ale s exaktnou fyzikou atmosféry na základe medzinárodných aerologických správ **TEMP (WMO FM-35)**.

*   **Detekcia odtrhnutia (Konvektívna teplota $T_c$):** Algoritmus prechádza vrstvy TEMP od zeme nahor, hľadá priesečník miešacieho pomeru vlhkosti s čiarou nasýtenia (hladina CCL). Spätným prepočtom suchou adiabatou určí minimálnu teplotu skál, potrebnú na naštartovanie termiky.
*   **Základňa oblakov (Boltonov vzorec pre LCL):** Výška kondenzácie nenasýtenej častice je počítaná cez Boltonovu rovnicu, ktorá zohľadňuje nelineárne správanie vodnej pary:
    $$T_{LCL} = T_{d0} - (0.001296 \cdot T_{d0} + 0.1977) \cdot (T_0 - T_{d0})$$
    Následne cez barometrickú formulu určuje presnú geopotenciálnu výšku základne kumulu (AMSL).
*   **3D ohýbanie a stabilita komína (Wind Shear):** Systém integruje silu a smer vetra v jednotlivých hladinách TEMP. Vypočítava čas prechodu stúpajúcej vzduchovej bubliny vrstvou ($\Delta t = \Delta z / w_{air}$). Ak horizontálny strih vetra prekoná vertikálnu stúpavosť ($V_{wind} > 1.4 \cdot w_{air}$), model prepne stav komína z celistvého na "trhané bubliny", čo varuje pilota pred turbulenciou.

---

## 3. Aerodynamika stroja (Poláry vo výške)
Variometer v kokpite neukazuje čisté stúpanie vzduchu, ale výsledok síl. Systém v reálnom čase aplikuje **rýchlostnú poláru lietadla** (kvadratická rovnica klesania $w_{sink0} = aV^2 + bV + c$).

*   **Výšková korekcia hustoty vzduchu ($\rho$):** S rastúcou výškou klesá hustota vzduchu. Systém podľa stavovej rovnice plynu prepočítava faktor zrednutia vzduchu $k = \sqrt{\rho_0 / \rho}$. 
*   **Čistá indikácia:** Výsledná stopa letu zobrazuje korigovaný údaj, ktorý pilot skutočne vidí na variometri ($w_{vario} = w_{air} - |w_{sink0} \cdot k|$), čím eliminuje chyby merania vo výškach nad 3000 m n.m.

---

## 4. Fyziologický a biometrický monitoring
Najväčším nepriateľom bezpečnosti je tunelové videnie unaveného pilota. Systém cez Bluetooth (BLE) rozhranie smart hodiniek priebežne sníma:
*   **Srdcový tep (BPM) & Vodivosť kože (GSR):** Indikátory akútneho stresového bloku.
*   **Saturácia kyslíkom ($SpO_2$):** Detekcia tichej hypoxie vo výškach. Ak $SpO_2$ klesne pod 90 %, systém diagnostikuje plytké dýchanie/apnoe.
*   **Kognitívna únava:** Prepojenie biometrie s mechanikou letu. Ak klesá kyslík a pilot začne chaoticky striedať polomery točenia (preťaženie > 2G) a vypadávať z osi 3D komína, systém okamžite identifikuje kritickú vyčerpanosť.

---

## 5. Programová architektúra a nasadenie
Aplikácia je navrhnutá ako ultra-ľahká, stabilná a vysoko optimalizovaná štruktúra, pripravená pre beh na klasickom webhostingu (napr. Hostinger Business Plan):

*   **Backend (PHP - `update.php`):** Extrémne rýchla I/O brána. Prijíma JSON telemetriu z kokpitu (XCTrack, trackery), ukladá dáta do textovej vyrovnávacej pamäte `data.json` a trvalo zapisuje priebeh letu do nezávislých tabuliek MySQL databázy (`xc_flights`, `xc_telemetry`).
*   **Bezpečnostný Alert Engine:** PHP skript obsahuje automatický strážny filter. Pri narušení Geofencingu riadených vzdušných priestorov (CTR/TMA) alebo pri kritickom poklese biometrie ($SpO_2 < 90\%$) okamžite odosiela výstražné správy cez Telegram Bot API pozemnému tímu a lekárovi.
*   **Frontend (JavaScript - `index.php` + moduly):** Všetka 3D matematika, Boltonove výpočty a vykresľovanie grafov sú presunuté na stranu klienta. Využíva **CesiumJS** na vykreslenie 3D fotogrammetrického terénu s orografiou a **Chart.js** na vykreslenie kardiografov.

---

## 6. K čomu to všetko bude dobré? (Prínos pre prax)

1.  **Taktika pretekov (Pre zvoz a ground team):** Tím v aute vidí skutočný 3D sklon termického komína. Vie určiť prízemný **Hotspot (miesto odtrhnutia)**. Ak pilot vypadne z prúdu, tím vie, kam presne ho vietor uniesol a kam smerovať auto pre prípadný zvoz.
2.  **Bezpečnosť a Geofencing:** Monitorovanie zakázaných zón CTR/TMA v 3D priestore zabráni diskvalifikácii alebo narušeniu vzdušného priestoru civilných letísk, zatiaľ čo monitoring búrkových jadier (CB) chráni pilota pred nasatím do mraku.
3.  **Letecký inštruktážny Debriefing (Poletový rozbor):** 18 rokov inštruktorskej praxe potvrdzuje, že pilota presvedčia len tvrdé dáta. Spätné prehrávanie IGC logu prepojené s biometrickým grafom odhalí pilotovi pravdu: že z komína nevypadol kvôli slabému dňu, ale preto, že vo výške prestal pod vplyvom únavy správne dýchať a jeho mozog urobil skratové rozhodnutie.
4.  **Budúcnosť - Letový simulátor:** Architektúra systému je plne pripravená na prepojenie s trenažérmi (Condor 2, X-Plane). Žiaci leteckých škôl tak môžu bezpečne na zemi trénovať zvládanie stresu, centrovanie v silnom strihu vetra a správne dýchanie pod dohľadom inštruktora, ktorý vidí ich kompletnú fyziológiu na monitore.

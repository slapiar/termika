# WIND binarne pole format v1 (txwf-bin.v1)

## Ucel

Format txwf-bin.v1 je autoritativny binarny nosic fyzikalnych vrstiev pre jeden fokus a jednu vrstvu. Je navrhnuty tak, aby bol:

- rychly na nacitanie do GPU,
- kontrolovatelny cez hash,
- kompresovatelny,
- vhodny pre verzovanie a deduplikaciu blokov.

## Rozsah jedneho suboru

Jeden subor reprezentuje:

- 1 fokus,
- 1 typ vrstvy,
- 1 vertikalnu hladinu,
- 1 interval platnosti.

Nazov odporucany:

fields/<kind>.layer-<Lxx>.valid-<UTC>.v<NN>.bin

## Byte order a zaklad

- Endian: little-endian.
- Header ma pevnu velkost 128 B.
- Data cast moze byt suvisla alebo blokova.

## Header (128 B)

| Offset | Velkost | Typ      | Nazov                | Popis |
|-------:|--------:|----------|----------------------|-------|
| 0      | 4       | char[4]  | magic                | TXWF |
| 4      | 2       | uint16   | version              | 1 |
| 6      | 2       | uint16   | header_size          | 128 |
| 8      | 4       | uint32   | flags                | bitove flagy |
| 12     | 8       | uint64   | focus_id_hash64      | skratena identita fokusu |
| 20     | 8       | int64    | valid_from_unix_ms   | UTC ms |
| 28     | 8       | int64    | valid_to_unix_ms     | UTC ms |
| 36     | 2       | uint16   | nx                   | pocet bodov X |
| 38     | 2       | uint16   | ny                   | pocet bodov Y |
| 40     | 2       | uint16   | channels             | 1..4 |
| 42     | 2       | uint16   | dtype                | 1=float16, 2=float32, 3=int16_scaled |
| 44     | 4       | float32  | scale                | pre int16_scaled |
| 48     | 4       | float32  | offset               | pre int16_scaled |
| 52     | 4       | uint32   | block_count          | 0=suvisle pole |
| 56     | 4       | uint32   | block_table_offset   | offset tabulky blokov |
| 60     | 4       | uint32   | data_offset          | offset dat |
| 64     | 4       | uint32   | data_size_bytes      | velkost dat pred kompresiou |
| 68     | 4       | uint32   | compression          | 0=none, 1=gzip, 2=zstd |
| 72     | 8       | uint64   | uncompressed_crc64   | kontrola integrity |
| 80     | 48      | byte[48] | reserved             | buduco pouzitelne |

## Kodovanie dat

### A) Suvisle pole (block_count=0)

- data su ulozene od data_offset po riadkoch: y-major, x-minor, potom kanaly.
- poradie kanalov pre wind_uv: [u_ms, v_ms].

### B) Blokove pole (block_count>0)

- Header obsahuje block_table_offset.
- Tabulka blokov ma block_count zaznamov po 32 B.
- Kazdy zaznam obsahuje:
  - bx, by (uint16),
  - bwidth, bheight (uint16),
  - payload_offset (uint32),
  - payload_size (uint32),
  - payload_hash64 (uint64),
  - reserved (uint64).

Blokovy rezim je vhodny na deduplikaciu v ramci fokusu aj medzi verziami.

## Deduplikacia

- Pri zapise bloku sa vypocita SHA-256 celeho payload.
- Ak rovnaky hash uz existuje v lokalnom sklade, ulozi sa iba referencia v block table.
- Manifest vrstvy musi obsahovat finalny SHA-256 suboru aj mapovanie na referencovane bloky.

## Presnost a chyba

- Produkcna fyzika: float16 alebo int16_scaled so znamou chybou.
- Odporucana hranica kvantizacnej chyby pre vietor: max 0.2 m/s.
- Ak chyba prekroci limit, prepnuti na float16 alebo float32.

## Vazba na render cache

WebM metadata musi obsahovat:

- source_field_hash_sha256,
- source_manifest_layer_id,
- render_algorithm_version.

Ak sa hash nezhoduje, cache je neplatna a musi sa znovu vyratat.

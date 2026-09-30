# Datový model

## Osoba (YAML frontmatter)

Viz ukázkové soubory v `data/people/`.

Povinná pole: `id` (celé číslo nebo řetězec), `slug`, `givenName`, `gender`, `lineage`.

Volitelná pole: `familyName`, `maidenName` (rodné příjmení — vyplňuje se ručně, neodvozuje se z `lineage`), `birth`, `death`, `note`, `internal_note`, `links`.

Vztahy: `parents`, `spouses` — pole ID. U `spouses` každá položka může mít `marriageDate` a volitelně `marriagePlace`. Pole `children` se neukládá — odvozuje se z `parents` u potomků.

```yaml
parents:
  - "3"
  - "4"
spouses:
  - id: "13"
    marriageDate: "21.9.2024"
links:
  - link: "https://example.com/matrika"
    popisek: "Matrika svatby"
internal_note: "interní TODO pro mě"
note: "veřejná poznámka o osobě"
```

Soubor končí YAML frontmatterem (bez markdown těla).

## Texty (`texts/*.md`)

Volné markdown soubory s příběhy, výpisy z matrik nebo poznámkami. Jména a rody se v textu označí složenými závorkami, které se v aplikaci **nezobrazují**.

Prohlížení všech textů je na stránce **Povídání** (mezi Stromem a Časovou osou): dlaždice s náhledem, řazení podle data / rodu / názvu, čtení se zvýrazněnými zmínkami. **Klik** na osobu (nebo rod) přepne do Stromu; chip „Zpět k textu“ nebo **prohlížečové Zpět** vrátí na stejný text.

Čitelné URL: `/tree`, `/texts`, `/texts/<id>`, `/timeline`, `/calendar`, `/map` (volitelně `?sel=` / `?year=`).

```md
---
title: Svatba Jana a Marie
date: "11.9.2022"
family: novakovi
---

Ženich [Jan Novák]{1} se oženil s [Marií Dvořákovou]{13}.
Obřad spojil rodiny Novákovi{novakovi} a Dvořákovi{dvorakovi}.
```

- `title`, `date` — volitelný frontmatter (title lze také z `#` nadpisu)
- `family` / `lineage` — volitelný klíč rodu pro řazení na Povídání (jinak se odvodí ze zmínek)
- `[viditelný text]{id}` — označí více slov (osoba)
- `Jméno{id}` — označí jedno slovo
- `{id}` je `id` osoby z `people/`
- rod: `Novákovi{novakovi}` nebo `Novákovi{rod:novakovi}` (klíč jako v panelu rodů)

Po kliknutí na osobu ve stromu (nebo na rod v pravém panelu) se v bočním panelu ukážou náhledy všech textů, kde je entita označená. Celý text otevře náhled se zvýrazněným jménem.

Na Povídání admin může v detailu textu upravit `title`, `family`, `date` a tělo markdownu (včetně značek zmínek), a z přehledu vytvořit nový text.

### Komentáře k úsekům textu

Komentáře **nejsou** v markdown vaultu — ukládají se přes Django API (`TextComment`). Vidí je jen **autor komentáře** a **admin**.

| Method | Path | Popis |
|--------|------|--------|
| GET | `/api/texts/<text_id>/comments` | seznam viditelných komentářů |
| POST | `/api/texts/<text_id>/comments` | `{ start, end, quote, body }` |
| DELETE | `/api/texts/comments/<id>` | autor nebo admin |

`start` / `end` jsou offsety v `displayBody` (text bez `{id}` značek). `text_id` odpovídá `TextDocument.id` (např. `svatba-jana-a-marie`).

## Config

`timeLayers` — radiální vrstvy sféry podle roku narození.

`lineageColors` — barvy pro legendu a uzly.

## Layout

Uložené `theta`, `phi`, `radius` per uzel + `lineageOffsets` pro posun celého rodu.

## Události

`events/world-events.yaml` — historické milníky pro boční timeline.

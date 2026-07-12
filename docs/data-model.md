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

## Config

`timeLayers` — radiální vrstvy sféry podle roku narození.

`lineageColors` — barvy pro legendu a uzly.

## Layout

Uložené `theta`, `phi`, `radius` per uzel + `lineageOffsets` pro posun celého rodu.

## Události

`events/world-events.yaml` — historické milníky pro boční timeline.

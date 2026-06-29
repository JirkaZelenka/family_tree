# Datový model

## Osoba (YAML frontmatter)

Viz ukázkové soubory v `data/people/`.

Povinná pole: `id` (celé číslo nebo řetězec), `slug`, `givenName`, `gender`, `lineage`.

Vztahy: `parents`, `spouses`, `children` — pole ID (v YAML klidně jako čísla: `[1, 2]`).

## Config

`timeLayers` — radiální vrstvy sféry podle roku narození.

`lineageColors` — barvy pro legendu a uzly.

## Layout

Uložené `theta`, `phi`, `radius` per uzel + `lineageOffsets` pro posun celého rodu.

## Události

`events/world-events.yaml` — historické milníky pro boční timeline.

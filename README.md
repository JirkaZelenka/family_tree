# Family Tree Graph

Moderní browser-only aplikace pro vizualizaci genealogických dat inspirovaná Obsidian Graph View.

## Funkce

- **3D sféra** (React Three Fiber) — osoby podle období narození, shluky rodů
- **Více pohledů** — Sféra, Strom, Force graf, Časová osa, Mapa
- **Markdown vault** — jeden člověk = jeden `.md` soubor s YAML frontmatter
- **Texty** — složka `texts/` se zmínkami `{id}` u osob a rodů, náhledy v bočním panelu
- **Vyhledávání** (FlexSearch), tooltips, detail osoby, současníci
- **Časový slider** s animací
- **Import/Export** ZIP vaultu a GEDCOM
- **Výpočet příbuznosti**, heatmapa rodů, sdílení pohledu přes URL
- **Auto-save** do složky přes File System Access API

## Rychlý start

```bash
npm install
python3 -m pip install -r backend/requirements.txt
python3 backend/manage.py migrate
python3 backend/manage.py createsuperuser   # admin účet (přístup na /admin)
```

Ve dvou terminálech:

```bash
npm run dev:backend    # Django na :8000 (session, /admin)
npm run dev             # Vite na :5173
```

Otevřete http://localhost:5173 — nejdřív se přihlásíte, potom aplikace načte ukázková data z `data/`.

### Účty

Účty se spravují v Django adminu (`http://localhost:5173/admin/` nebo `:8000/admin/`).

| Role | Jak vznikne | Oprávnění |
|------|-------------|-----------|
| **admin** | `createsuperuser` nebo zaškrtnutí *Personál webu* / *Superuser* | `/admin` + vše, co umí editor |
| **editor** | uživatel v adminu s rolí *Editor* | ukládání a mazání uložených pohledů |
| **read only** | uživatel v adminu s rolí *Pouze čtení* (výchozí) | pohledy jen otevře, neuloží ani nesmaže |

U editora a read-only účtu admin v profilu zaškrtne **viditelné rody**. Nezaškrtnuté lineage v grafu nejsou; u příbuzných a v textech je místo nich `X`. Admin vidí všechny rody.

## Vault struktura

```
data/                          # lokální data (většina v .gitignore)
├── people/*.md
├── texts/*.md                 # příběhy a zmínky o osobách / rodech
├── events/world-events.yaml
└── .family-tree/
    ├── config.yaml
    └── layout.json

templates/data/                # fiktivní ukázky (Novák / Dvořák) — v gitu
```

Po čistém clone spusťte `npm run setup:local` — zkopíruje šablony do `data/` a dalších gitignorovaných cest. Viz [templates/README.md](templates/README.md).

## Skripty

| Příkaz | Popis |
|--------|-------|
| `npm run dev` | Vývojový server (Vite, :5173) |
| `npm run dev:backend` | Django (:8000) — přihlášení a `/admin` |
| `npm run build` | Produkční build |
| `npm run test` | Unit testy (Vitest) |
| `npm run test:e2e` | E2E testy (Playwright) |
| `npm run ci` | lint + test + build |

## Dokumentace

- [Architektura](docs/architecture.md)
- [Datový model](docs/data-model.md)
- [Roadmapa](docs/roadmap.md)
- [Přispívání](CONTRIBUTING.md)

## Licence

MIT

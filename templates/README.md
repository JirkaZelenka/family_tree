# Šablony soukromých dat

Tyto soubory jsou **fiktivní ukázky** (Novák / Dvořák). Skutečná data jsou v `.gitignore`.

## Mapování šablon → lokální soubory

| Šablona | Zkopírovat do |
|---------|---------------|
| `templates/data/people/*.md` | `data/people/*.md` |
| `templates/data/texts/*.md` | `data/texts/*.md` |
| `templates/data/.family-tree/config.yaml` | `data/.family-tree/config.yaml` |
| `templates/data/.family-tree/layout.json` | `data/.family-tree/layout.json` |
| `templates/src/types/vault.ts` | `src/types/vault.ts` |
| `templates/tests/lineage-names.test.ts` | `tests/lineage-names.test.ts` |

## Rychlý setup

```bash
node scripts/setup-from-templates.mjs
```

Skript zkopíruje chybějící soubory (existující **nepřepíše**). Pro přepsání:

```bash
node scripts/setup-from-templates.mjs --force
```

## Dev / CI

- Živá aplikace a Django admin berou osoby/rody **jen z `data/`**.
- `templates/data/` je jen šablona pro `npm run setup:local` (a pro testy přes `loadTemplateVaultFileMap`).
- Pokud máte vlastní soubory v `data/`, setup je nepřepisuje (bez `--force`).
- `src/types/vault.ts` a `tests/lineage-names.test.ts` musíte mít lokálně — buď zkopírujte ze šablony, nebo spusťte setup skript.

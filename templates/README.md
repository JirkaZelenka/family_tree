# Šablony soukromých dat

Tyto soubory jsou **fiktivní ukázky** (Novák / Dvořák). Skutečná data jsou v `.gitignore`.

## Mapování šablon → lokální soubory

| Šablona | Zkopírovat do |
|---------|---------------|
| `templates/data/people/*.md` | `data/people/*.md` |
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

- Aplikace a testy načítají ukázková data z `templates/data/`.
- Pokud máte vlastní soubory v `data/`, mají přednost (lidské soubory přepíší šablony se stejným názvem).
- `src/types/vault.ts` a `tests/lineage-names.test.ts` musíte mít lokálně — buď zkopírujte ze šablony, nebo spusťte setup skript.

# Architektura

Aplikace je SPA s Django session autentizací.

## Vrstvy

1. **Auth** — Django session (login, role: readonly / editor / admin), `/admin` pro správu účtů
2. **Storage** — File System Access API, IndexedDB cache, ZIP import/export
3. **Parser** — YAML frontmatter osob + markdown texty se zmínkami `{id}`
4. **Graph** — Graphology builder, queries (současníci, předci)
5. **Layout** — d3-force + ForceAtlas2 na sféře, persistence v layout.json
6. **Views** — plugin registry (sphere, tree, force, timeline, map)
7. **UI** — React + shadcn/ui + Zustand stores

## Datový tok

Markdown → Parser → Graphology → Stores → View plugins

## Přidání nového pohledu

1. Vytvořte `src/views/<name>/<Name>View.tsx`
2. Zaregistrujte v `src/views/registry.ts`
3. Implementujte `ViewPlugin` interface

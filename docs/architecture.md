# Architektura

Viz hlavní plán projektu. Aplikace je čistě klientská SPA.

## Vrstvy

1. **Storage** — File System Access API, IndexedDB cache, ZIP import/export
2. **Parser** — YAML frontmatter osob + markdown texty se zmínkami `{id}`
3. **Graph** — Graphology builder, queries (současníci, předci)
4. **Layout** — d3-force + ForceAtlas2 na sféře, persistence v layout.json
5. **Views** — plugin registry (sphere, tree, force, timeline, map)
6. **UI** — React + shadcn/ui + Zustand stores

## Datový tok

Markdown → Parser → Graphology → Stores → View plugins

## Přidání nového pohledu

1. Vytvořte `src/views/<name>/<Name>View.tsx`
2. Zaregistrujte v `src/views/registry.ts`
3. Implementujte `ViewPlugin` interface

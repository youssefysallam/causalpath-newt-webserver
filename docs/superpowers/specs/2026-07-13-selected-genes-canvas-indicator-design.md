# Selected-genes subgraph canvas indicator

## Problem
When a user loads a subgraph (selected genes + 1-hop neighbors) onto the main
canvas, nothing tells them the canvas is a filtered view rather than the full
graph, and there's no way to drop a gene without redoing the whole dialog.

## Behavior (decided)
- **Re-filter from seed genes.** The chips are the seed "genes of interest" the
  user picked. Removing one recomputes seeds + 1-hop neighbors from the original
  full SIF and reloads the canvas.
- **Compact expandable badge**, sitting just above the file tree.
- **Reload full graph** when the last seed is removed or "Show full graph" is
  clicked, then hide the badge.

## New module: `public/javascript/newt/subgraph-indicator.js`
Self-contained (scoped styles injected once, like `subgraph-preview.js`).
Depends only on `subgraph-utils`, `main-canvas-load`, jQuery.

State: `{ fullSif, format, fileName, seeds[] }` or null, plus an `expanded` flag.

- `show({fullSif, format, fileName, seeds})` — store state, render collapsed badge.
- `hide()` — clear state, empty container.
- `removeGene(name)` — drop from seeds; empty -> `showFull()`, else `reFilter()`.
- `reFilter()` — `parseSifGenes(fullSif)` -> `expandWithNeighbors(seeds)` ->
  `filterSif` -> `mainCanvasLoad.loadStyledSifToCanvas(subSif, format, fileName)`;
  re-render badge.
- `showFull()` — `loadStyledSifToCanvas(fullSif, format, fileName)` then `hide()`.

Pure helper `removeSeed(seeds, name)` in `subgraph-utils.js` (unit tested):
returns a new seed array with `name` removed.

## UI
Container `<div id="subgraph-indicator-container">` in `views/index.html`
between `#back_menu` and `#folder-tree-container`.

- Collapsed: `[ Subgraph • N genes ▾ ]`
- Expanded: removable chips `[TP53 ×] …` + "Show full graph" link.
- Event-delegated clicks: toggle expand / remove chip / show full.

## Wiring
- `backbone-views.js` `LoadSubgraphView.confirm()`:
  - canvas mode + >=1 valid gene -> `indicator.show({fullSif, format, fileName, seeds:valid})`
  - canvas mode + 0 genes (full graph) -> `indicator.hide()`
  - overlay mode -> leave indicator untouched.
- `indicator.hide()` at other canvas-replacing entry points so the badge can't go
  stale: tree dbl-click load, `newtOpenFile`, New, Open… menu file input, Back/clear.

## Scope / non-goals
- Badge reflects the active canvas only. Per-tab persistence across multiple
  network tabs is out of scope for v1 (New / tab-switch just hides it).
- `expandWithNeighbors` / `filterSif` already unit-tested; only the new pure
  `removeSeed` helper gets a new test.

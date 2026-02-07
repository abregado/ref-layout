# Ref Layout

WYSIWYG document layout tool for tabletop wargame reference sheets. Vanilla TypeScript + HTML + CSS, no framework.

## Build

```
npm run build    # runs tsc, outputs to dist/
```

Serve `index.html` via a local server (ES modules require it). The HTML loads `dist/main.js` as a module.

## Architecture

### State management
Single `AppStateManager` class (`src/state.ts`) owns all state. Mutations go through methods, which emit typed events. Consumers subscribe via `state.on('eventName', callback)`.

Container tree is a flat `Map<string, ContainerNode>` with parent/children ID refs.

### Page scaling
`PageManager` (`src/page.ts`) renders the page at real mm dimensions (A4 = 793.7px x 1122.5px at 96 DPI). A `#page-scaler` wrapper applies `transform: translate() scale()` to fit the workspace, capped at 1.0. `#page` is a flex container; the root container uses `flex: 1` to fill the content area (respecting page padding for margins).

### CSS class system
- One layout class per container, storing only flexbox properties
- Editing a property on a container with a class updates the class definition, propagating to all containers using that class
- `CssClassManager` (`src/css-class-manager.ts`) maintains a dynamic `<style>` element with generated rules
- Assigning a class copies current inline props into the class; unassigning copies class props back to inline

### Mode switching
`body.mode-layout` / `body.mode-preview` CSS classes toggle visual helpers. Layout mode adds green outlines and enforces 2px min margin/padding on containers. Preview mode hides all helpers, deselects, and disables pointer events.

### Persistence
Two layers: **file-based** (explicit Save/Open) and **localStorage** (background session backup).

- Save exports the active element as a standalone HTML file via `src/serializer.ts`. The file contains a `<script type="application/json" id="ref-layout-data">` tag with the full serialized element (Maps as `[key, value][]` arrays), plus CSS/HTML for visual preview.
- Open reads an HTML file, parses the JSON metadata, and imports it as a new element via `state.importElement()`.
- localStorage auto-saves on a 500ms debounce after any mutation event. The dirty flag only clears on explicit file Save, not on localStorage writes.

### Container tree rendering
`ContainerTree` (`src/container-tree.ts`) reconciles the state tree into DOM. On changes it rebuilds the element tree under `#page`, applying flex styles and layout-mode helpers.

## File structure

```
index.html                  Entry point
css/
  reset.css                 Minimal reset
  app.css                   Toolbar, sidebar, workspace chrome
  page.css                  Page rendering, scaling, print styles
  layout-mode.css           Green borders, selection highlight, preview hiding
src/
  types.ts                  All interfaces/types, page dimension constants
  state.ts                  Centralized AppStateManager + typed event emitter
  main.ts                   Bootstrap, wires all modules together
  page.ts                   Page DOM, scaling math
  toolbar.ts                Page size/orientation/margin controls, mode toggle
  container-tree.ts         Container data model <-> DOM reconciliation
  selection.ts              Click-to-select containers (event delegation)
  sidebar.ts                Flex property editors for selected container
  css-class-manager.ts      Dynamic <style> for layout classes
  mode-manager.ts           Mode switching, layout helper toggling
  serializer.ts             Export element → HTML file, import HTML file → element data
  context-menu.ts           Right-click: add child/sibling, remove container
```

## Implemented features (Layout + Preview modes)

- Scaled A4/Letter page, portrait/landscape toggle
- Adjustable page margin (mm)
- Flexbox container tree: add child, add sibling before/after, remove (via right-click context menu)
- Click-to-select containers with blue highlight
- Sidebar with flex container props (direction, wrap, justify, align-items, align-content, gap) and flex item props (grow, shrink, basis, align-self)
- Save container styles as a named CSS class; editing propagates to all users of that class
- Layout mode: green outlines, 2px min margin/padding for clickability
- Preview mode: clean print-ready view, no outlines, nothing selectable
- Print styles hide chrome
- File-based Save/Open: Save downloads active element as standalone HTML (with embedded JSON metadata for round-tripping); Open imports an HTML file as a new element
- localStorage auto-save: debounced 500ms background session backup on every mutation (dirty flag only clears on explicit file Save)

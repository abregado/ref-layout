import { AppStateManager } from './state.js';
import { PageManager } from './page.js';
import { Toolbar } from './toolbar.js';
import { ContainerTree } from './container-tree.js';
import { ModeManager } from './mode-manager.js';
import { SelectionManager } from './selection.js';
import { Sidebar } from './sidebar.js';
import { CssClassManager } from './css-class-manager.js';
import { ContextMenu } from './context-menu.js';

function main(): void {
  const state = new AppStateManager();

  // Load saved elements or create a default one
  if (!state.loadFromLocalStorage()) {
    state.newElement('Untitled');
    state.clearDirty();
  }

  const pageManager = new PageManager(state);
  const pageEl = pageManager.getPageElement();

  new Toolbar(state);
  const containerTree = new ContainerTree(state, pageEl);
  new ModeManager(state, containerTree, pageManager);
  new SelectionManager(state, pageEl);
  new Sidebar(state);
  new CssClassManager(state);
  new ContextMenu(state, pageEl);

  // Re-scale when sidebar visibility changes
  state.on('selectionChanged', () => {
    requestAnimationFrame(() => pageManager.update());
  });

  // Debounced localStorage auto-save
  let saveTimer: number;
  const autoSave = () => {
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => state.saveToLocalStorage(), 500);
  };
  const autoSaveEvents = [
    'containerAdded', 'containerRemoved', 'containerUpdated',
    'layoutClassChanged', 'layoutClassRemoved', 'elementDimensionsChanged',
    'elementListChanged', 'activeElementChanged', 'treeChanged',
  ] as const;
  for (const event of autoSaveEvents) {
    state.on(event, autoSave);
  }
}

document.addEventListener('DOMContentLoaded', main);

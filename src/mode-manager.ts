import { AppStateManager } from './state.js';
import { ContainerTree } from './container-tree.js';
import { PageManager } from './page.js';

export class ModeManager {
  constructor(
    private state: AppStateManager,
    private containerTree: ContainerTree,
    private pageManager: PageManager,
  ) {
    this.state.on('modeChanged', (mode) => this.applyMode(mode));
    this.applyMode(this.state.getMode());
  }

  private applyMode(mode: string): void {
    document.body.classList.remove('mode-layout', 'mode-content', 'mode-preview');
    document.body.classList.add(`mode-${mode}`);

    if (mode === 'preview' || mode === 'content') {
      // Deselect when switching modes
      this.state.setSelection(null);
    }

    // Refresh layout helpers (add/remove min margins, content-eligible markers)
    this.containerTree.refreshLayoutHelpers();

    // Re-scale page since sidebar visibility may change
    requestAnimationFrame(() => this.pageManager.update());
  }
}

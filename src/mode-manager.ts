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
    document.body.classList.remove('mode-layout', 'mode-preview');
    document.body.classList.add(`mode-${mode}`);

    if (mode === 'preview') {
      // Deselect everything in preview
      this.state.setSelection(null);
    }

    // Refresh layout helpers (add/remove min margins)
    this.containerTree.refreshLayoutHelpers();

    // Re-scale page since sidebar visibility may change
    requestAnimationFrame(() => this.pageManager.update());
  }
}

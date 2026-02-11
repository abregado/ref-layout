import { AppStateManager } from './state.js';

export class SelectionManager {
  private pageEl: HTMLElement;

  constructor(private state: AppStateManager, pageEl: HTMLElement) {
    this.pageEl = pageEl;

    // Event delegation on page
    this.pageEl.addEventListener('click', (e) => this.handleClick(e));

    // Update visual selection
    this.state.on('selectionChanged', (id) => this.updateVisual(id));
  }

  private handleClick(e: MouseEvent): void {
    const mode = this.state.getMode();
    if (mode !== 'layout' && mode !== 'content') return;

    const target = e.target as HTMLElement;

    if (mode === 'content') {
      // In content mode, only select eligible (leaf) containers
      const container = target.closest('.flex-container.content-eligible') as HTMLElement | null;
      if (container && container.dataset.containerId) {
        e.stopPropagation();
        this.state.setSelection(container.dataset.containerId);
      } else {
        this.state.setSelection(null);
      }
      return;
    }

    // Layout mode
    const container = target.closest('.flex-container') as HTMLElement | null;

    if (container && container.dataset.containerId) {
      e.stopPropagation();
      this.state.setSelection(container.dataset.containerId);
    } else {
      this.state.setSelection(null);
    }
  }

  private updateVisual(selectedId: string | null): void {
    // Remove old selection
    const prev = this.pageEl.querySelector('.flex-container.selected');
    if (prev) prev.classList.remove('selected');

    // Add new selection
    if (selectedId) {
      const el = this.pageEl.querySelector(`[data-container-id="${selectedId}"]`);
      if (el) el.classList.add('selected');
    }
  }
}

import { AppStateManager } from './state.js';

interface MenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
}

export class ContextMenu {
  private menuEl: HTMLElement;
  private targetContainerId: string | null = null;

  constructor(private state: AppStateManager, private pageEl: HTMLElement) {
    this.menuEl = document.getElementById('context-menu')!;

    this.pageEl.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    document.addEventListener('click', () => this.hide());
    document.addEventListener('contextmenu', (e) => {
      if (!(e.target as HTMLElement).closest('#page')) {
        this.hide();
      }
    });

    // Close context menu when selection changes (e.g. left-click on a container)
    this.state.on('selectionChanged', () => this.hide());
  }

  private handleContextMenu(e: MouseEvent): void {
    const mode = this.state.getMode();
    if (mode === 'preview') return;

    e.preventDefault();

    if (mode === 'content') {
      this.handleContentContextMenu(e);
      return;
    }

    // Layout mode
    const target = e.target as HTMLElement;
    const container = target.closest('.flex-container') as HTMLElement | null;
    if (!container || !container.dataset.containerId) return;

    this.targetContainerId = container.dataset.containerId;
    this.state.setSelection(this.targetContainerId);

    const node = this.state.getContainer(this.targetContainerId);
    if (!node) return;

    const isRoot = node.parentId === null;
    const hasContent = node.contentElements && node.contentElements.length > 0;

    const items: MenuItem[] = [
      {
        label: 'Add Child Container',
        disabled: hasContent,
        action: () => {
          if (this.targetContainerId) {
            this.state.addContainer(this.targetContainerId);
          }
        },
      },
      {
        label: 'Add Sibling After',
        disabled: isRoot || hasContent,
        action: () => {
          if (!this.targetContainerId || isRoot) return;
          const n = this.state.getContainer(this.targetContainerId);
          if (!n || !n.parentId) return;
          const parent = this.state.getContainer(n.parentId);
          if (!parent) return;
          const idx = parent.childrenIds.indexOf(this.targetContainerId);
          this.state.addContainer(n.parentId, idx + 1);
        },
      },
      {
        label: 'Add Sibling Before',
        disabled: isRoot || hasContent,
        action: () => {
          if (!this.targetContainerId || isRoot) return;
          const n = this.state.getContainer(this.targetContainerId);
          if (!n || !n.parentId) return;
          const parent = this.state.getContainer(n.parentId);
          if (!parent) return;
          const idx = parent.childrenIds.indexOf(this.targetContainerId);
          this.state.addContainer(n.parentId, idx);
        },
      },
      {
        label: 'Remove Container',
        disabled: isRoot,
        action: () => {
          if (this.targetContainerId && !isRoot) {
            this.state.removeContainer(this.targetContainerId);
          }
        },
      },
    ];

    this.show(e.clientX, e.clientY, items);
  }

  private handleContentContextMenu(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    // Check if right-clicked on a content element
    const contentEl = target.closest('.content-element') as HTMLElement | null;
    if (contentEl && contentEl.dataset.contentId) {
      const container = contentEl.closest('.flex-container') as HTMLElement | null;
      if (!container || !container.dataset.containerId) return;

      const containerId = container.dataset.containerId;
      const contentId = contentEl.dataset.contentId;

      this.show(e.clientX, e.clientY, [
        {
          label: 'Delete Content Element',
          action: () => {
            this.state.removeContentElement(containerId, contentId);
          },
        },
      ]);
      return;
    }

    // Check if right-clicked on an eligible container (leaf)
    const container = target.closest('.flex-container.content-eligible') as HTMLElement | null;
    if (!container || !container.dataset.containerId) return;

    const containerId = container.dataset.containerId;
    this.state.setSelection(containerId);

    this.show(e.clientX, e.clientY, [
      {
        label: 'Add Heading',
        action: () => this.state.addContentElement(containerId, 'heading'),
      },
      {
        label: 'Add Text',
        action: () => this.state.addContentElement(containerId, 'text'),
      },
      {
        label: 'Add Table',
        action: () => this.state.addContentElement(containerId, 'table'),
      },
      {
        label: 'Add List',
        action: () => this.state.addContentElement(containerId, 'list'),
      },
    ]);
  }

  private show(x: number, y: number, items: MenuItem[]): void {
    this.menuEl.innerHTML = '';
    this.menuEl.style.cssText = `
      display: block;
      position: fixed;
      z-index: 1000;
      left: ${x}px;
      top: ${y}px;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      padding: 4px 0;
      min-width: 180px;
      font-size: 13px;
    `;

    for (const item of items) {
      const div = document.createElement('div');
      div.textContent = item.label;
      div.style.cssText = `
        padding: 6px 16px;
        cursor: ${item.disabled ? 'default' : 'pointer'};
        color: ${item.disabled ? '#aaa' : '#222'};
      `;
      if (!item.disabled) {
        div.addEventListener('mouseenter', () => { div.style.background = '#e8f0fe'; });
        div.addEventListener('mouseleave', () => { div.style.background = ''; });
        div.addEventListener('click', (e) => {
          e.stopPropagation();
          item.action();
          this.hide();
        });
      }
      this.menuEl.appendChild(div);
    }

    // Adjust position if off-screen
    requestAnimationFrame(() => {
      const rect = this.menuEl.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        this.menuEl.style.left = `${window.innerWidth - rect.width - 4}px`;
      }
      if (rect.bottom > window.innerHeight) {
        this.menuEl.style.top = `${window.innerHeight - rect.height - 4}px`;
      }
    });
  }

  private hide(): void {
    this.menuEl.style.display = 'none';
    this.targetContainerId = null;
  }
}

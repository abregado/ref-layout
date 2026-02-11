import { AppStateManager } from './state.js';
import { ContainerNode, ContentElement, FlexContainerProps, FlexItemProps } from './types.js';

export class ContainerTree {
  private pageEl: HTMLElement;
  private elements = new Map<string, HTMLElement>();

  constructor(private state: AppStateManager, pageEl: HTMLElement) {
    this.pageEl = pageEl;

    this.state.on('containerAdded', () => this.reconcile());
    this.state.on('containerRemoved', () => this.reconcile());
    this.state.on('containerUpdated', (node) => this.updateElement(node));
    this.state.on('treeChanged', () => this.reconcile());
    this.state.on('layoutClassChanged', (lc) => this.applyClassToContainers(lc.name));
    this.state.on('contentElementAdded', () => this.reconcile());
    this.state.on('contentElementRemoved', () => this.reconcile());

    this.reconcile();
  }

  getElement(id: string): HTMLElement | undefined {
    return this.elements.get(id);
  }

  reconcile(): void {
    const rootId = this.state.getRootId();
    const rootNode = this.state.getContainer(rootId);
    if (!rootNode) return;

    // Build DOM tree recursively
    const newElements = new Map<string, HTMLElement>();
    const rootEl = this.buildElement(rootNode, newElements);

    // Clear page and append
    this.pageEl.innerHTML = '';
    this.pageEl.appendChild(rootEl);

    // Remove old refs, set new
    this.elements = newElements;
  }

  private buildElement(node: ContainerNode, elementMap: Map<string, HTMLElement>): HTMLElement {
    // Reuse existing element if possible (to keep state)
    let el = this.elements.get(node.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'flex-container';
      el.dataset.containerId = node.id;
    } else {
      el.innerHTML = '';
    }

    this.applyStyles(el, node);
    elementMap.set(node.id, el);

    // Build children
    for (const childId of node.childrenIds) {
      const childNode = this.state.getContainer(childId);
      if (childNode) {
        const childEl = this.buildElement(childNode, elementMap);
        el.appendChild(childEl);
      }
    }

    // Render content elements in leaf containers
    if (node.childrenIds.length === 0 && node.contentElements && node.contentElements.length > 0) {
      for (const ce of node.contentElements) {
        el.appendChild(this.buildContentElement(ce));
      }
    }

    return el;
  }

  private buildContentElement(ce: ContentElement): HTMLElement {
    let el: HTMLElement;
    switch (ce.type) {
      case 'heading':
        el = document.createElement('h3');
        el.textContent = 'Heading';
        break;
      case 'text':
        el = document.createElement('p');
        el.textContent = 'Text content';
        break;
      case 'table': {
        const table = document.createElement('table');
        for (let r = 0; r < 2; r++) {
          const tr = document.createElement('tr');
          for (let c = 0; c < 2; c++) {
            const td = document.createElement(r === 0 ? 'th' : 'td');
            td.textContent = r === 0 ? `Header ${c + 1}` : `Cell ${c + 1}`;
            tr.appendChild(td);
          }
          table.appendChild(tr);
        }
        el = table;
        break;
      }
      case 'list': {
        const ul = document.createElement('ul');
        for (let i = 0; i < 2; i++) {
          const li = document.createElement('li');
          li.textContent = `List item ${i + 1}`;
          ul.appendChild(li);
        }
        el = ul;
        break;
      }
      default:
        el = document.createElement('div');
        el.textContent = ce.type;
    }
    el.classList.add('content-element');
    el.dataset.contentId = ce.id;
    el.dataset.containerId = '';  // will be set via parent
    return el;
  }

  private applyStyles(el: HTMLElement, node: ContainerNode): void {
    const props = this.state.getEffectiveProps(node.id);
    if (!props) return;

    this.applyFlexContainerStyles(el, props.container);
    this.applyFlexItemStyles(el, props.item);
    this.applyLayoutModeHelpers(el, node);
  }

  private applyFlexContainerStyles(el: HTMLElement, c: FlexContainerProps): void {
    el.style.flexDirection = c.flexDirection;
    el.style.flexWrap = c.flexWrap;
    el.style.justifyContent = c.justifyContent;
    el.style.alignItems = c.alignItems;
    el.style.alignContent = c.alignContent;
    el.style.gap = c.gap > 0 ? `${c.gap}px` : '';
  }

  private applyFlexItemStyles(el: HTMLElement, i: FlexItemProps): void {
    el.style.flexGrow = String(i.flexGrow);
    el.style.flexShrink = String(i.flexShrink);
    el.style.flexBasis = i.flexBasis;
    el.style.alignSelf = i.alignSelf;
  }

  private applyLayoutModeHelpers(el: HTMLElement, node: ContainerNode): void {
    const mode = this.state.getMode();

    // Always clear content-eligible marker first
    el.classList.remove('content-eligible');

    if (mode === 'content') {
      // Content mode: eligible containers (leaf) get green border + min margin
      const isLeaf = node.childrenIds.length === 0;
      if (isLeaf) {
        el.classList.add('content-eligible');
        el.style.margin = '2px';
        el.style.padding = '2px';
        el.dataset.minMargin = '1';
        el.dataset.minPadding = '1';
      } else {
        // Non-eligible: normal properties
        el.style.margin = '';
        el.style.padding = '';
        el.removeAttribute('data-min-margin');
        el.removeAttribute('data-min-padding');
      }
      return;
    }

    if (mode !== 'layout') {
      // Preview mode: remove min helpers
      el.style.margin = '';
      el.style.padding = '';
      el.removeAttribute('data-min-margin');
      el.removeAttribute('data-min-padding');
      return;
    }

    // In layout mode: enforce minimum 2px margin/padding for clickability
    const currentMargin = parseFloat(el.style.margin) || 0;
    const currentPadding = parseFloat(el.style.padding) || 0;

    if (currentMargin < 2) {
      el.style.margin = '2px';
      el.dataset.minMargin = '1';
    }
    if (currentPadding < 2) {
      el.style.padding = '2px';
      el.dataset.minPadding = '1';
    }
  }

  private updateElement(node: ContainerNode): void {
    const el = this.elements.get(node.id);
    if (!el) return;
    this.applyStyles(el, node);
  }

  private applyClassToContainers(className: string): void {
    for (const node of this.state.getAllContainers()) {
      if (node.className === className) {
        this.updateElement(node);
      }
    }
  }

  refreshLayoutHelpers(): void {
    for (const node of this.state.getAllContainers()) {
      const el = this.elements.get(node.id);
      if (el) {
        this.applyLayoutModeHelpers(el, node);
      }
    }
  }
}

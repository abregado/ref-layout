import {
  AppState,
  AppEvents,
  AppEventName,
  ContainerNode,
  EditMode,
  FlexContainerProps,
  FlexItemProps,
  LayoutClass,
  PageConfig,
  defaultFlexContainerProps,
  defaultFlexItemProps,
} from './types.js';

type Listener<T> = (data: T) => void;

export class AppStateManager {
  private state: AppState;
  private listeners = new Map<AppEventName, Set<Listener<any>>>();

  constructor() {
    const rootId = 'c-0';
    const root: ContainerNode = {
      id: rootId,
      parentId: null,
      childrenIds: [],
      className: null,
      container: defaultFlexContainerProps(),
      item: defaultFlexItemProps(),
    };

    this.state = {
      page: { size: 'a4', orientation: 'portrait', marginMm: 5 },
      mode: 'layout',
      containers: new Map([[rootId, root]]),
      rootContainerId: rootId,
      selectedContainerId: null,
      layoutClasses: new Map(),
      nextContainerId: 1,
    };
  }

  // ── Event system ────────────────────────────────────────────────

  on<K extends AppEventName>(event: K, listener: Listener<AppEvents[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  private emit<K extends AppEventName>(event: K, data: AppEvents[K]): void {
    this.listeners.get(event)?.forEach(fn => fn(data));
  }

  // ── Getters ─────────────────────────────────────────────────────

  getPage(): PageConfig { return { ...this.state.page }; }
  getMode(): EditMode { return this.state.mode; }
  getContainer(id: string): ContainerNode | undefined {
    const c = this.state.containers.get(id);
    return c ? { ...c, childrenIds: [...c.childrenIds], container: { ...c.container }, item: { ...c.item } } : undefined;
  }
  getRootId(): string { return this.state.rootContainerId; }
  getSelectedId(): string | null { return this.state.selectedContainerId; }
  getAllContainers(): ContainerNode[] {
    return Array.from(this.state.containers.values()).map(c => ({
      ...c, childrenIds: [...c.childrenIds], container: { ...c.container }, item: { ...c.item },
    }));
  }
  getLayoutClass(name: string): LayoutClass | undefined {
    const lc = this.state.layoutClasses.get(name);
    return lc ? { ...lc, container: { ...lc.container }, item: { ...lc.item } } : undefined;
  }
  getAllLayoutClasses(): LayoutClass[] {
    return Array.from(this.state.layoutClasses.values()).map(lc => ({
      ...lc, container: { ...lc.container }, item: { ...lc.item },
    }));
  }

  // ── Page mutations ──────────────────────────────────────────────

  setPageConfig(partial: Partial<PageConfig>): void {
    Object.assign(this.state.page, partial);
    this.emit('pageConfigChanged', this.getPage());
  }

  // ── Mode mutations ──────────────────────────────────────────────

  setMode(mode: EditMode): void {
    this.state.mode = mode;
    this.emit('modeChanged', mode);
  }

  // ── Selection ───────────────────────────────────────────────────

  setSelection(id: string | null): void {
    if (this.state.selectedContainerId === id) return;
    this.state.selectedContainerId = id;
    this.emit('selectionChanged', id);
  }

  // ── Container tree mutations ────────────────────────────────────

  addContainer(parentId: string, index?: number): ContainerNode {
    const parent = this.state.containers.get(parentId);
    if (!parent) throw new Error(`Parent ${parentId} not found`);

    const id = `c-${this.state.nextContainerId++}`;
    const node: ContainerNode = {
      id,
      parentId,
      childrenIds: [],
      className: null,
      container: defaultFlexContainerProps(),
      item: defaultFlexItemProps(),
    };
    this.state.containers.set(id, node);

    if (index !== undefined && index >= 0 && index <= parent.childrenIds.length) {
      parent.childrenIds.splice(index, 0, id);
    } else {
      parent.childrenIds.push(id);
    }

    this.emit('containerAdded', this.getContainer(id)!);
    this.emit('treeChanged', undefined as any);
    return this.getContainer(id)!;
  }

  removeContainer(id: string): void {
    if (id === this.state.rootContainerId) return; // can't remove root
    const node = this.state.containers.get(id);
    if (!node) return;

    // Recursively remove children
    for (const childId of [...node.childrenIds]) {
      this.removeContainer(childId);
    }

    // Remove from parent
    if (node.parentId) {
      const parent = this.state.containers.get(node.parentId);
      if (parent) {
        parent.childrenIds = parent.childrenIds.filter(cid => cid !== id);
      }
    }

    // Deselect if selected
    if (this.state.selectedContainerId === id) {
      this.setSelection(null);
    }

    this.state.containers.delete(id);
    this.emit('containerRemoved', { id, parentId: node.parentId });
    this.emit('treeChanged', undefined as any);
  }

  updateContainerProps(id: string, container?: Partial<FlexContainerProps>, item?: Partial<FlexItemProps>): void {
    const node = this.state.containers.get(id);
    if (!node) return;

    // If this container has a class, update the class instead
    if (node.className) {
      const lc = this.state.layoutClasses.get(node.className);
      if (lc) {
        if (container) Object.assign(lc.container, container);
        if (item) Object.assign(lc.item, item);
        this.emit('layoutClassChanged', this.getLayoutClass(node.className)!);
        return;
      }
    }

    // Otherwise update inline
    if (container) Object.assign(node.container, container);
    if (item) Object.assign(node.item, item);
    this.emit('containerUpdated', this.getContainer(id)!);
  }

  assignClass(containerId: string, className: string): void {
    const node = this.state.containers.get(containerId);
    if (!node) return;
    node.className = className;

    // Copy current inline props to class if class doesn't exist yet
    if (!this.state.layoutClasses.has(className)) {
      this.state.layoutClasses.set(className, {
        name: className,
        container: { ...node.container },
        item: { ...node.item },
      });
      this.emit('layoutClassChanged', this.getLayoutClass(className)!);
    }

    this.emit('containerUpdated', this.getContainer(containerId)!);
  }

  unassignClass(containerId: string): void {
    const node = this.state.containers.get(containerId);
    if (!node || !node.className) return;

    // Copy class props to inline before unassigning
    const lc = this.state.layoutClasses.get(node.className);
    if (lc) {
      node.container = { ...lc.container };
      node.item = { ...lc.item };
    }

    node.className = null;
    this.emit('containerUpdated', this.getContainer(containerId)!);
  }

  // ── Layout class mutations ──────────────────────────────────────

  removeLayoutClass(name: string): void {
    // Unassign from all containers first
    for (const node of this.state.containers.values()) {
      if (node.className === name) {
        const lc = this.state.layoutClasses.get(name);
        if (lc) {
          node.container = { ...lc.container };
          node.item = { ...lc.item };
        }
        node.className = null;
        this.emit('containerUpdated', this.getContainer(node.id)!);
      }
    }
    this.state.layoutClasses.delete(name);
    this.emit('layoutClassRemoved', name);
  }

  // Get effective props for a container (class or inline)
  getEffectiveProps(id: string): { container: FlexContainerProps; item: FlexItemProps } | undefined {
    const node = this.state.containers.get(id);
    if (!node) return undefined;

    if (node.className) {
      const lc = this.state.layoutClasses.get(node.className);
      if (lc) return { container: { ...lc.container }, item: { ...lc.item } };
    }

    return { container: { ...node.container }, item: { ...node.item } };
  }
}

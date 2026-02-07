import {
  AppState,
  AppEvents,
  AppEventName,
  ContainerNode,
  EditMode,
  ElementTemplate,
  FlexContainerProps,
  FlexItemProps,
  LayoutClass,
  defaultFlexContainerProps,
  defaultFlexItemProps,
} from './types.js';

type Listener<T> = (data: T) => void;

const STORAGE_KEY = 'ref-layout-elements';

export class AppStateManager {
  private state: AppState;
  private listeners = new Map<AppEventName, Set<Listener<any>>>();
  private dirty = false;

  constructor() {
    this.state = {
      elements: new Map(),
      activeElementId: null,
      mode: 'layout',
      selectedContainerId: null,
      nextElementId: 0,
    };
  }

  // ── Active element helper ─────────────────────────────────────────

  private active(): ElementTemplate {
    const el = this.state.activeElementId
      ? this.state.elements.get(this.state.activeElementId)
      : undefined;
    if (!el) throw new Error('No active element');
    return el;
  }

  // ── Event system ──────────────────────────────────────────────────

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

  // ── Getters ───────────────────────────────────────────────────────

  getMode(): EditMode { return this.state.mode; }
  getContainer(id: string): ContainerNode | undefined {
    const c = this.active().containers.get(id);
    return c ? { ...c, childrenIds: [...c.childrenIds], container: { ...c.container }, item: { ...c.item } } : undefined;
  }
  getRootId(): string { return this.active().rootContainerId; }
  getSelectedId(): string | null { return this.state.selectedContainerId; }
  getAllContainers(): ContainerNode[] {
    return Array.from(this.active().containers.values()).map(c => ({
      ...c, childrenIds: [...c.childrenIds], container: { ...c.container }, item: { ...c.item },
    }));
  }
  getLayoutClass(name: string): LayoutClass | undefined {
    const lc = this.active().layoutClasses.get(name);
    return lc ? { ...lc, container: { ...lc.container }, item: { ...lc.item } } : undefined;
  }
  getAllLayoutClasses(): LayoutClass[] {
    return Array.from(this.active().layoutClasses.values()).map(lc => ({
      ...lc, container: { ...lc.container }, item: { ...lc.item },
    }));
  }

  // ── Element CRUD ──────────────────────────────────────────────────

  newElement(name?: string): ElementTemplate {
    const id = `el-${this.state.nextElementId++}`;
    const rootId = 'c-0';
    const root: ContainerNode = {
      id: rootId,
      parentId: null,
      childrenIds: [],
      className: null,
      container: defaultFlexContainerProps(),
      item: defaultFlexItemProps(),
    };

    const element: ElementTemplate = {
      id,
      name: name || 'Untitled',
      widthMm: 210,
      heightMm: 297,
      containers: new Map([[rootId, root]]),
      rootContainerId: rootId,
      layoutClasses: new Map(),
      nextContainerId: 1,
    };

    this.state.elements.set(id, element);
    this.state.activeElementId = id;
    this.state.selectedContainerId = null;
    this.dirty = true;

    this.emit('elementListChanged', undefined as any);
    this.emit('activeElementChanged', this.getActiveElement());
    this.emit('selectionChanged', null);
    this.emit('treeChanged', undefined as any);
    return this.getActiveElement()!;
  }

  switchElement(id: string): void {
    if (!this.state.elements.has(id)) return;
    if (this.state.activeElementId === id) return;
    this.state.activeElementId = id;
    this.state.selectedContainerId = null;
    this.emit('activeElementChanged', this.getActiveElement());
    this.emit('selectionChanged', null);
    this.emit('treeChanged', undefined as any);
  }

  renameElement(id: string, newName: string): void {
    const el = this.state.elements.get(id);
    if (!el) return;
    el.name = newName;
    this.dirty = true;
    this.emit('elementListChanged', undefined as any);
  }

  deleteElement(id: string): void {
    if (this.state.elements.size <= 1) return; // prevent deleting last
    this.state.elements.delete(id);
    this.dirty = true;

    if (this.state.activeElementId === id) {
      // Switch to first remaining element
      const firstId = this.state.elements.keys().next().value!;
      this.state.activeElementId = firstId;
      this.state.selectedContainerId = null;
      this.emit('activeElementChanged', this.getActiveElement());
      this.emit('selectionChanged', null);
      this.emit('treeChanged', undefined as any);
    }

    this.emit('elementListChanged', undefined as any);
  }

  importElement(data: {
    name: string;
    widthMm: number;
    heightMm: number;
    containers: Map<string, ContainerNode>;
    rootContainerId: string;
    layoutClasses: Map<string, LayoutClass>;
    nextContainerId: number;
  }): ElementTemplate {
    const id = `el-${this.state.nextElementId++}`;
    const element: ElementTemplate = {
      id,
      name: data.name,
      widthMm: data.widthMm,
      heightMm: data.heightMm,
      containers: data.containers,
      rootContainerId: data.rootContainerId,
      layoutClasses: data.layoutClasses,
      nextContainerId: data.nextContainerId,
    };

    this.state.elements.set(id, element);
    this.state.activeElementId = id;
    this.state.selectedContainerId = null;
    this.dirty = true;

    this.emit('elementListChanged', undefined as any);
    this.emit('activeElementChanged', this.getActiveElement());
    this.emit('selectionChanged', null);
    this.emit('treeChanged', undefined as any);
    return this.getActiveElement()!;
  }

  getActiveElement(): ElementTemplate | null {
    if (!this.state.activeElementId) return null;
    const el = this.state.elements.get(this.state.activeElementId);
    if (!el) return null;
    return {
      ...el,
      containers: new Map(el.containers),
      layoutClasses: new Map(el.layoutClasses),
    };
  }

  getAllElements(): { id: string; name: string }[] {
    return Array.from(this.state.elements.values()).map(el => ({ id: el.id, name: el.name }));
  }

  setElementDimensions(widthMm: number, heightMm: number): void {
    const el = this.active();
    el.widthMm = widthMm;
    el.heightMm = heightMm;
    this.dirty = true;
    this.emit('elementDimensionsChanged', { widthMm, heightMm });
  }

  // ── Dirty tracking ────────────────────────────────────────────────

  markDirty(): void { this.dirty = true; }
  isDirty(): boolean { return this.dirty; }
  clearDirty(): void { this.dirty = false; }

  // ── localStorage persistence ──────────────────────────────────────

  saveToLocalStorage(): void {
    const data = {
      nextElementId: this.state.nextElementId,
      activeElementId: this.state.activeElementId,
      elements: Array.from(this.state.elements.values()).map(el => ({
        id: el.id,
        name: el.name,
        widthMm: el.widthMm,
        heightMm: el.heightMm,
        rootContainerId: el.rootContainerId,
        nextContainerId: el.nextContainerId,
        containers: Array.from(el.containers.entries()),
        layoutClasses: Array.from(el.layoutClasses.entries()),
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  loadFromLocalStorage(): boolean {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    try {
      const data = JSON.parse(raw);
      this.state.nextElementId = data.nextElementId;
      this.state.elements.clear();

      for (const elData of data.elements) {
        const element: ElementTemplate = {
          id: elData.id,
          name: elData.name,
          widthMm: elData.widthMm,
          heightMm: elData.heightMm,
          rootContainerId: elData.rootContainerId,
          nextContainerId: elData.nextContainerId,
          containers: new Map(elData.containers),
          layoutClasses: new Map(elData.layoutClasses),
        };
        this.state.elements.set(element.id, element);
      }

      this.state.activeElementId = data.activeElementId;
      this.state.selectedContainerId = null;
      this.dirty = false;

      this.emit('elementListChanged', undefined as any);
      this.emit('activeElementChanged', this.getActiveElement());
      this.emit('treeChanged', undefined as any);
      return true;
    } catch {
      return false;
    }
  }

  // ── Mode mutations ────────────────────────────────────────────────

  setMode(mode: EditMode): void {
    this.state.mode = mode;
    this.emit('modeChanged', mode);
  }

  // ── Selection ─────────────────────────────────────────────────────

  setSelection(id: string | null): void {
    if (this.state.selectedContainerId === id) return;
    this.state.selectedContainerId = id;
    this.emit('selectionChanged', id);
  }

  // ── Container tree mutations ──────────────────────────────────────

  addContainer(parentId: string, index?: number): ContainerNode {
    const el = this.active();
    const parent = el.containers.get(parentId);
    if (!parent) throw new Error(`Parent ${parentId} not found`);

    const id = `c-${el.nextContainerId++}`;
    const node: ContainerNode = {
      id,
      parentId,
      childrenIds: [],
      className: null,
      container: defaultFlexContainerProps(),
      item: defaultFlexItemProps(),
    };
    el.containers.set(id, node);

    if (index !== undefined && index >= 0 && index <= parent.childrenIds.length) {
      parent.childrenIds.splice(index, 0, id);
    } else {
      parent.childrenIds.push(id);
    }

    this.dirty = true;
    this.emit('containerAdded', this.getContainer(id)!);
    this.emit('treeChanged', undefined as any);
    return this.getContainer(id)!;
  }

  removeContainer(id: string): void {
    const el = this.active();
    if (id === el.rootContainerId) return; // can't remove root
    const node = el.containers.get(id);
    if (!node) return;

    // Recursively remove children
    for (const childId of [...node.childrenIds]) {
      this.removeContainer(childId);
    }

    // Remove from parent
    if (node.parentId) {
      const parent = el.containers.get(node.parentId);
      if (parent) {
        parent.childrenIds = parent.childrenIds.filter(cid => cid !== id);
      }
    }

    // Deselect if selected
    if (this.state.selectedContainerId === id) {
      this.setSelection(null);
    }

    el.containers.delete(id);
    this.dirty = true;
    this.emit('containerRemoved', { id, parentId: node.parentId });
    this.emit('treeChanged', undefined as any);
  }

  updateContainerProps(id: string, container?: Partial<FlexContainerProps>, item?: Partial<FlexItemProps>): void {
    const el = this.active();
    const node = el.containers.get(id);
    if (!node) return;

    // If this container has a class, update the class instead
    if (node.className) {
      const lc = el.layoutClasses.get(node.className);
      if (lc) {
        if (container) Object.assign(lc.container, container);
        if (item) Object.assign(lc.item, item);
        this.dirty = true;
        this.emit('layoutClassChanged', this.getLayoutClass(node.className)!);
        return;
      }
    }

    // Otherwise update inline
    if (container) Object.assign(node.container, container);
    if (item) Object.assign(node.item, item);
    this.dirty = true;
    this.emit('containerUpdated', this.getContainer(id)!);
  }

  assignClass(containerId: string, className: string): void {
    const el = this.active();
    const node = el.containers.get(containerId);
    if (!node) return;
    node.className = className;

    // Copy current inline props to class if class doesn't exist yet
    if (!el.layoutClasses.has(className)) {
      el.layoutClasses.set(className, {
        name: className,
        container: { ...node.container },
        item: { ...node.item },
      });
      this.emit('layoutClassChanged', this.getLayoutClass(className)!);
    }

    this.dirty = true;
    this.emit('containerUpdated', this.getContainer(containerId)!);
  }

  unassignClass(containerId: string): void {
    const el = this.active();
    const node = el.containers.get(containerId);
    if (!node || !node.className) return;

    // Copy class props to inline before unassigning
    const lc = el.layoutClasses.get(node.className);
    if (lc) {
      node.container = { ...lc.container };
      node.item = { ...lc.item };
    }

    node.className = null;
    this.dirty = true;
    this.emit('containerUpdated', this.getContainer(containerId)!);
  }

  // ── Layout class mutations ────────────────────────────────────────

  removeLayoutClass(name: string): void {
    const el = this.active();
    // Unassign from all containers first
    for (const node of el.containers.values()) {
      if (node.className === name) {
        const lc = el.layoutClasses.get(name);
        if (lc) {
          node.container = { ...lc.container };
          node.item = { ...lc.item };
        }
        node.className = null;
        this.emit('containerUpdated', this.getContainer(node.id)!);
      }
    }
    el.layoutClasses.delete(name);
    this.dirty = true;
    this.emit('layoutClassRemoved', name);
  }

  // Get effective props for a container (class or inline)
  getEffectiveProps(id: string): { container: FlexContainerProps; item: FlexItemProps } | undefined {
    const el = this.active();
    const node = el.containers.get(id);
    if (!node) return undefined;

    if (node.className) {
      const lc = el.layoutClasses.get(node.className);
      if (lc) return { container: { ...lc.container }, item: { ...lc.item } };
    }

    return { container: { ...node.container }, item: { ...node.item } };
  }
}

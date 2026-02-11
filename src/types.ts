// ── Edit mode ───────────────────────────────────────────────────────

export type EditMode = 'layout' | 'content' | 'preview';

// 96 DPI: 1 inch = 25.4 mm → 1 mm ≈ 3.7795px
export const MM_TO_PX = 96 / 25.4;

// ── Flexbox properties ──────────────────────────────────────────────

export interface FlexContainerProps {
  flexDirection: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  alignContent: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around';
  gap: number; // px
}

export interface FlexItemProps {
  flexGrow: number;
  flexShrink: number;
  flexBasis: string; // e.g. 'auto', '100px', '50%'
  alignSelf: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
}

export function defaultFlexContainerProps(): FlexContainerProps {
  return {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    alignContent: 'stretch',
    gap: 0,
  };
}

export function defaultFlexItemProps(): FlexItemProps {
  return {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    alignSelf: 'auto',
  };
}

// ── Content elements ─────────────────────────────────────────────────

export type ContentElementType = 'heading' | 'text' | 'table' | 'list';

export interface ContentElement {
  id: string;
  type: ContentElementType;
}

// ── Layout class ────────────────────────────────────────────────────

export interface LayoutClass {
  name: string;
  container: FlexContainerProps;
  item: FlexItemProps;
}

// ── Container tree node ─────────────────────────────────────────────

export interface ContainerNode {
  id: string;
  parentId: string | null;
  childrenIds: string[];
  className: string | null; // assigned LayoutClass name, or null
  // Inline overrides (used when no class assigned)
  container: FlexContainerProps;
  item: FlexItemProps;
  contentElements: ContentElement[];
}

// ── Element template ────────────────────────────────────────────────

export interface ElementTemplate {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  containers: Map<string, ContainerNode>;
  rootContainerId: string;
  layoutClasses: Map<string, LayoutClass>;
  nextContainerId: number;
  nextContentElementId: number;
}

// ── App state ───────────────────────────────────────────────────────

export interface AppState {
  elements: Map<string, ElementTemplate>;
  activeElementId: string | null;
  mode: EditMode;
  selectedContainerId: string | null;
  nextElementId: number;
}

// ── Events ──────────────────────────────────────────────────────────

export interface AppEvents {
  elementDimensionsChanged: { widthMm: number; heightMm: number };
  activeElementChanged: ElementTemplate | null;
  elementListChanged: void;
  modeChanged: EditMode;
  containerAdded: ContainerNode;
  containerRemoved: { id: string; parentId: string | null };
  containerUpdated: ContainerNode;
  selectionChanged: string | null;
  layoutClassChanged: LayoutClass;
  layoutClassRemoved: string;
  contentElementAdded: { containerId: string; element: ContentElement };
  contentElementRemoved: { containerId: string; elementId: string };
  treeChanged: void;
}

export type AppEventName = keyof AppEvents;

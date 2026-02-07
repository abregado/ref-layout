// ── Page configuration ──────────────────────────────────────────────

export type PageSize = 'a4' | 'letter';
export type PageOrientation = 'portrait' | 'landscape';
export type EditMode = 'layout' | 'preview';

export interface PageConfig {
  size: PageSize;
  orientation: PageOrientation;
  marginMm: number; // uniform margin in mm
}

// Real dimensions in mm
export const PAGE_DIMENSIONS: Record<PageSize, { widthMm: number; heightMm: number }> = {
  a4: { widthMm: 210, heightMm: 297 },
  letter: { widthMm: 215.9, heightMm: 279.4 },
};

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
}

// ── App state ───────────────────────────────────────────────────────

export interface AppState {
  page: PageConfig;
  mode: EditMode;
  containers: Map<string, ContainerNode>;
  rootContainerId: string;
  selectedContainerId: string | null;
  layoutClasses: Map<string, LayoutClass>;
  nextContainerId: number;
}

// ── Events ──────────────────────────────────────────────────────────

export interface AppEvents {
  pageConfigChanged: PageConfig;
  modeChanged: EditMode;
  containerAdded: ContainerNode;
  containerRemoved: { id: string; parentId: string | null };
  containerUpdated: ContainerNode;
  selectionChanged: string | null;
  layoutClassChanged: LayoutClass;
  layoutClassRemoved: string;
  treeChanged: void;
}

export type AppEventName = keyof AppEvents;

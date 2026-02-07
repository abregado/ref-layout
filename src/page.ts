import { AppStateManager } from './state.js';
import { MM_TO_PX } from './types.js';

const VISUAL_MARGIN = 20; // px margin around page in workspace

export class PageManager {
  private workspace: HTMLElement;
  private scaler: HTMLElement;
  private page: HTMLElement;
  private resizeObserver: ResizeObserver;

  constructor(private state: AppStateManager) {
    this.workspace = document.getElementById('workspace')!;
    this.scaler = document.getElementById('page-scaler')!;
    this.page = document.getElementById('page')!;

    this.state.on('elementDimensionsChanged', () => this.update());
    this.state.on('activeElementChanged', () => this.update());

    this.resizeObserver = new ResizeObserver(() => this.update());
    this.resizeObserver.observe(this.workspace);

    this.update();
  }

  getPageElement(): HTMLElement {
    return this.page;
  }

  update(): void {
    const el = this.state.getActiveElement();
    if (!el) return;

    const pageW = Math.round(el.widthMm * MM_TO_PX);
    const pageH = Math.round(el.heightMm * MM_TO_PX);

    // Set page real size, no padding
    this.page.style.width = `${pageW}px`;
    this.page.style.height = `${pageH}px`;
    this.page.style.padding = '0';

    // Compute scale to fit workspace
    const wsRect = this.workspace.getBoundingClientRect();
    const availW = wsRect.width - VISUAL_MARGIN * 2;
    const availH = wsRect.height - VISUAL_MARGIN * 2;

    if (availW <= 0 || availH <= 0) return;

    const scaleX = availW / pageW;
    const scaleY = availH / pageH;
    const scale = Math.min(scaleX, scaleY, 1.0); // cap at 1.0

    // Position: center in workspace
    const scaledW = pageW * scale;
    const scaledH = pageH * scale;
    const offsetX = Math.max(VISUAL_MARGIN, (wsRect.width - scaledW) / 2);
    const offsetY = Math.max(VISUAL_MARGIN, (wsRect.height - scaledH) / 2);

    this.scaler.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    this.scaler.style.width = `${pageW}px`;
    this.scaler.style.height = `${pageH}px`;
  }
}

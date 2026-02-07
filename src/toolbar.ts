import { AppStateManager } from './state.js';
import { PageSize, PageOrientation, EditMode } from './types.js';

export class Toolbar {
  private sizeSelect: HTMLSelectElement;
  private orientSelect: HTMLSelectElement;
  private marginInput: HTMLInputElement;
  private layoutBtn: HTMLButtonElement;
  private previewBtn: HTMLButtonElement;

  constructor(private state: AppStateManager) {
    this.sizeSelect = document.getElementById('tb-page-size') as HTMLSelectElement;
    this.orientSelect = document.getElementById('tb-orientation') as HTMLSelectElement;
    this.marginInput = document.getElementById('tb-margin') as HTMLInputElement;
    this.layoutBtn = document.getElementById('tb-mode-layout') as HTMLButtonElement;
    this.previewBtn = document.getElementById('tb-mode-preview') as HTMLButtonElement;

    this.bindEvents();
    this.syncFromState();

    this.state.on('pageConfigChanged', () => this.syncFromState());
    this.state.on('modeChanged', () => this.syncModeButtons());
  }

  private bindEvents(): void {
    this.sizeSelect.addEventListener('change', () => {
      this.state.setPageConfig({ size: this.sizeSelect.value as PageSize });
    });

    this.orientSelect.addEventListener('change', () => {
      this.state.setPageConfig({ orientation: this.orientSelect.value as PageOrientation });
    });

    this.marginInput.addEventListener('input', () => {
      const val = parseInt(this.marginInput.value, 10);
      if (!isNaN(val) && val >= 0 && val <= 25) {
        this.state.setPageConfig({ marginMm: val });
      }
    });

    this.layoutBtn.addEventListener('click', () => this.state.setMode('layout'));
    this.previewBtn.addEventListener('click', () => this.state.setMode('preview'));
  }

  private syncFromState(): void {
    const page = this.state.getPage();
    this.sizeSelect.value = page.size;
    this.orientSelect.value = page.orientation;
    this.marginInput.value = String(page.marginMm);
  }

  private syncModeButtons(): void {
    const mode = this.state.getMode();
    this.layoutBtn.classList.toggle('active', mode === 'layout');
    this.previewBtn.classList.toggle('active', mode === 'preview');
  }
}

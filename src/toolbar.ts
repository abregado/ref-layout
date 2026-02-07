import { AppStateManager } from './state.js';

export class Toolbar {
  private elementSelect: HTMLSelectElement;
  private widthInput: HTMLInputElement;
  private heightInput: HTMLInputElement;
  private newBtn: HTMLButtonElement;
  private saveBtn: HTMLButtonElement;
  private renameBtn: HTMLButtonElement;
  private deleteBtn: HTMLButtonElement;
  private layoutBtn: HTMLButtonElement;
  private previewBtn: HTMLButtonElement;

  constructor(private state: AppStateManager) {
    this.elementSelect = document.getElementById('tb-element-select') as HTMLSelectElement;
    this.widthInput = document.getElementById('tb-width') as HTMLInputElement;
    this.heightInput = document.getElementById('tb-height') as HTMLInputElement;
    this.newBtn = document.getElementById('tb-element-new') as HTMLButtonElement;
    this.saveBtn = document.getElementById('tb-element-save') as HTMLButtonElement;
    this.renameBtn = document.getElementById('tb-element-rename') as HTMLButtonElement;
    this.deleteBtn = document.getElementById('tb-element-delete') as HTMLButtonElement;
    this.layoutBtn = document.getElementById('tb-mode-layout') as HTMLButtonElement;
    this.previewBtn = document.getElementById('tb-mode-preview') as HTMLButtonElement;

    this.bindEvents();
    this.syncFromState();

    this.state.on('activeElementChanged', () => this.syncFromState());
    this.state.on('elementListChanged', () => this.populateDropdown());
    this.state.on('elementDimensionsChanged', (dims) => {
      this.widthInput.value = String(dims.widthMm);
      this.heightInput.value = String(dims.heightMm);
    });
    this.state.on('modeChanged', () => this.syncModeButtons());
  }

  private bindEvents(): void {
    this.elementSelect.addEventListener('change', () => {
      const id = this.elementSelect.value;
      if (this.state.isDirty()) {
        if (!confirm('You have unsaved changes. Switch element without saving?')) {
          // Revert dropdown to current active element
          const active = this.state.getActiveElement();
          if (active) this.elementSelect.value = active.id;
          return;
        }
      }
      this.state.switchElement(id);
    });

    this.widthInput.addEventListener('input', () => {
      const val = parseInt(this.widthInput.value, 10);
      if (!isNaN(val) && val >= 10 && val <= 500) {
        const el = this.state.getActiveElement();
        if (el) this.state.setElementDimensions(val, el.heightMm);
      }
    });

    this.heightInput.addEventListener('input', () => {
      const val = parseInt(this.heightInput.value, 10);
      if (!isNaN(val) && val >= 10 && val <= 500) {
        const el = this.state.getActiveElement();
        if (el) this.state.setElementDimensions(el.widthMm, val);
      }
    });

    this.newBtn.addEventListener('click', () => {
      const name = prompt('Element name:', 'Untitled');
      if (name !== null) {
        this.state.newElement(name || 'Untitled');
      }
    });

    this.saveBtn.addEventListener('click', () => {
      this.state.saveToLocalStorage();
    });

    this.renameBtn.addEventListener('click', () => {
      const el = this.state.getActiveElement();
      if (!el) return;
      const name = prompt('Rename element:', el.name);
      if (name !== null && name.trim()) {
        this.state.renameElement(el.id, name.trim());
      }
    });

    this.deleteBtn.addEventListener('click', () => {
      const el = this.state.getActiveElement();
      if (!el) return;
      if (confirm(`Delete element "${el.name}"?`)) {
        this.state.deleteElement(el.id);
      }
    });

    this.layoutBtn.addEventListener('click', () => this.state.setMode('layout'));
    this.previewBtn.addEventListener('click', () => this.state.setMode('preview'));
  }

  private syncFromState(): void {
    this.populateDropdown();
    const el = this.state.getActiveElement();
    if (el) {
      this.elementSelect.value = el.id;
      this.widthInput.value = String(el.widthMm);
      this.heightInput.value = String(el.heightMm);
    }
    this.updateDeleteButton();
    this.syncModeButtons();
  }

  private populateDropdown(): void {
    const elements = this.state.getAllElements();
    const active = this.state.getActiveElement();
    this.elementSelect.innerHTML = '';
    for (const el of elements) {
      const opt = document.createElement('option');
      opt.value = el.id;
      opt.textContent = el.name;
      this.elementSelect.appendChild(opt);
    }
    if (active) {
      this.elementSelect.value = active.id;
    }
    this.updateDeleteButton();
  }

  private updateDeleteButton(): void {
    const elements = this.state.getAllElements();
    this.deleteBtn.disabled = elements.length <= 1;
  }

  private syncModeButtons(): void {
    const mode = this.state.getMode();
    this.layoutBtn.classList.toggle('active', mode === 'layout');
    this.previewBtn.classList.toggle('active', mode === 'preview');
  }
}

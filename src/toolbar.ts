import { AppStateManager } from './state.js';
import { exportElementToHtml, importElementFromHtml } from './serializer.js';

export class Toolbar {
  private elementSelect: HTMLSelectElement;
  private widthInput: HTMLInputElement;
  private heightInput: HTMLInputElement;
  private newBtn: HTMLButtonElement;
  private openBtn: HTMLButtonElement;
  private saveBtn: HTMLButtonElement;
  private renameBtn: HTMLButtonElement;
  private deleteBtn: HTMLButtonElement;
  private layoutBtn: HTMLButtonElement;
  private contentBtn: HTMLButtonElement;
  private previewBtn: HTMLButtonElement;
  private fileInput: HTMLInputElement;

  constructor(private state: AppStateManager) {
    this.elementSelect = document.getElementById('tb-element-select') as HTMLSelectElement;
    this.widthInput = document.getElementById('tb-width') as HTMLInputElement;
    this.heightInput = document.getElementById('tb-height') as HTMLInputElement;
    this.newBtn = document.getElementById('tb-element-new') as HTMLButtonElement;
    this.openBtn = document.getElementById('tb-element-open') as HTMLButtonElement;
    this.saveBtn = document.getElementById('tb-element-save') as HTMLButtonElement;
    this.renameBtn = document.getElementById('tb-element-rename') as HTMLButtonElement;
    this.deleteBtn = document.getElementById('tb-element-delete') as HTMLButtonElement;
    this.layoutBtn = document.getElementById('tb-mode-layout') as HTMLButtonElement;
    this.contentBtn = document.getElementById('tb-mode-content') as HTMLButtonElement;
    this.previewBtn = document.getElementById('tb-mode-preview') as HTMLButtonElement;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;

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
      const el = this.state.getActiveElement();
      if (!el) return;
      const html = exportElementToHtml(el);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${el.name}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.state.clearDirty();
    });

    this.openBtn.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = importElementFromHtml(reader.result as string);
          this.state.importElement(data);
        } catch (e) {
          alert(`Failed to open file: ${e instanceof Error ? e.message : e}`);
        }
      };
      reader.readAsText(file);
      this.fileInput.value = '';
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
    this.contentBtn.addEventListener('click', () => this.state.setMode('content'));
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
    this.contentBtn.classList.toggle('active', mode === 'content');
    this.previewBtn.classList.toggle('active', mode === 'preview');
  }
}

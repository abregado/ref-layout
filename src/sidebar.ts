import { AppStateManager } from './state.js';
import { FlexContainerProps, FlexItemProps } from './types.js';

export class Sidebar {
  private el: HTMLElement;
  private currentId: string | null = null;

  constructor(private state: AppStateManager) {
    this.el = document.getElementById('sidebar')!;

    this.state.on('selectionChanged', (id) => this.onSelectionChanged(id));
    this.state.on('containerUpdated', (node) => {
      if (node.id === this.currentId) this.render();
    });
    this.state.on('layoutClassChanged', () => {
      if (this.currentId) this.render();
    });
  }

  private onSelectionChanged(id: string | null): void {
    this.currentId = id;
    if (id) {
      this.el.classList.add('visible');
      this.render();
    } else {
      this.el.classList.remove('visible');
      this.el.innerHTML = '';
    }
  }

  private render(): void {
    if (!this.currentId) return;
    const node = this.state.getContainer(this.currentId);
    if (!node) return;

    const props = this.state.getEffectiveProps(this.currentId);
    if (!props) return;

    this.el.innerHTML = '';

    // Container ID display
    const idLabel = document.createElement('div');
    idLabel.style.cssText = 'font-size:11px;color:#999;margin-bottom:8px;';
    idLabel.textContent = `Container: ${node.id}`;
    this.el.appendChild(idLabel);

    // Class section
    this.renderClassSection(node.className);

    // Flex container props
    const h3c = document.createElement('h3');
    h3c.textContent = 'Flex Container';
    this.el.appendChild(h3c);
    this.renderContainerProps(props.container);

    // Flex item props
    const h3i = document.createElement('h3');
    h3i.textContent = 'Flex Item';
    this.el.appendChild(h3i);
    this.renderItemProps(props.item);
  }

  private renderClassSection(className: string | null): void {
    const section = document.createElement('div');
    section.className = 'class-section';

    if (className) {
      const display = document.createElement('div');
      display.className = 'class-name-display';
      display.textContent = `Class: .${className}`;
      section.appendChild(display);

      const row = document.createElement('div');
      row.className = 'class-row';
      const removeBtn = document.createElement('button');
      removeBtn.className = 'danger';
      removeBtn.textContent = 'Remove class';
      removeBtn.addEventListener('click', () => {
        if (this.currentId) this.state.unassignClass(this.currentId);
      });
      row.appendChild(removeBtn);
      section.appendChild(row);
    } else {
      const row = document.createElement('div');
      row.className = 'class-row';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Class name...';
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save as class';
      saveBtn.addEventListener('click', () => {
        const name = input.value.trim();
        if (name && this.currentId) {
          this.state.assignClass(this.currentId, name);
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveBtn.click();
      });
      row.appendChild(input);
      row.appendChild(saveBtn);
      section.appendChild(row);
    }

    this.el.appendChild(section);
  }

  private renderContainerProps(c: FlexContainerProps): void {
    this.addSelect('flex-direction', c.flexDirection,
      ['row', 'column', 'row-reverse', 'column-reverse'],
      (v) => this.updateContainer({ flexDirection: v as FlexContainerProps['flexDirection'] }));

    this.addSelect('flex-wrap', c.flexWrap,
      ['nowrap', 'wrap', 'wrap-reverse'],
      (v) => this.updateContainer({ flexWrap: v as FlexContainerProps['flexWrap'] }));

    this.addSelect('justify-content', c.justifyContent,
      ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
      (v) => this.updateContainer({ justifyContent: v as FlexContainerProps['justifyContent'] }));

    this.addSelect('align-items', c.alignItems,
      ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'],
      (v) => this.updateContainer({ alignItems: v as FlexContainerProps['alignItems'] }));

    this.addSelect('align-content', c.alignContent,
      ['flex-start', 'flex-end', 'center', 'stretch', 'space-between', 'space-around'],
      (v) => this.updateContainer({ alignContent: v as FlexContainerProps['alignContent'] }));

    this.addNumber('gap', c.gap, 0, 50, (v) => this.updateContainer({ gap: v }));
  }

  private renderItemProps(i: FlexItemProps): void {
    this.addNumber('flex-grow', i.flexGrow, 0, 20, (v) => this.updateItem({ flexGrow: v }));
    this.addNumber('flex-shrink', i.flexShrink, 0, 20, (v) => this.updateItem({ flexShrink: v }));

    this.addTextInput('flex-basis', i.flexBasis, (v) => this.updateItem({ flexBasis: v }));

    this.addSelect('align-self', i.alignSelf,
      ['auto', 'flex-start', 'flex-end', 'center', 'stretch', 'baseline'],
      (v) => this.updateItem({ alignSelf: v as FlexItemProps['alignSelf'] }));
  }

  private addSelect(label: string, current: string, options: string[], onChange: (v: string) => void): void {
    const row = document.createElement('div');
    row.className = 'prop-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const sel = document.createElement('select');
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      if (opt === current) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => onChange(sel.value));
    row.appendChild(lbl);
    row.appendChild(sel);
    this.el.appendChild(row);
  }

  private addNumber(label: string, current: number, min: number, max: number, onChange: (v: number) => void): void {
    const row = document.createElement('div');
    row.className = 'prop-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.value = String(current);
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      if (!isNaN(v)) onChange(v);
    });
    row.appendChild(lbl);
    row.appendChild(input);
    this.el.appendChild(row);
  }

  private addTextInput(label: string, current: string, onChange: (v: string) => void): void {
    const row = document.createElement('div');
    row.className = 'prop-row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.addEventListener('change', () => onChange(input.value));
    row.appendChild(lbl);
    row.appendChild(input);
    this.el.appendChild(row);
  }

  private updateContainer(partial: Partial<FlexContainerProps>): void {
    if (this.currentId) {
      this.state.updateContainerProps(this.currentId, partial);
    }
  }

  private updateItem(partial: Partial<FlexItemProps>): void {
    if (this.currentId) {
      this.state.updateContainerProps(this.currentId, undefined, partial);
    }
  }
}

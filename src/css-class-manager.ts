import { AppStateManager } from './state.js';
import { LayoutClass } from './types.js';

export class CssClassManager {
  private styleEl: HTMLStyleElement;

  constructor(private state: AppStateManager) {
    this.styleEl = document.createElement('style');
    this.styleEl.id = 'layout-classes';
    document.head.appendChild(this.styleEl);

    this.state.on('layoutClassChanged', () => this.rebuild());
    this.state.on('layoutClassRemoved', () => this.rebuild());

    this.rebuild();
  }

  private rebuild(): void {
    const classes = this.state.getAllLayoutClasses();
    const rules = classes.map(lc => this.buildRule(lc)).join('\n\n');
    this.styleEl.textContent = rules;
  }

  private buildRule(lc: LayoutClass): string {
    const c = lc.container;
    const i = lc.item;
    const props: string[] = [
      `flex-direction: ${c.flexDirection}`,
      `flex-wrap: ${c.flexWrap}`,
      `justify-content: ${c.justifyContent}`,
      `align-items: ${c.alignItems}`,
      `align-content: ${c.alignContent}`,
    ];
    if (c.gap > 0) props.push(`gap: ${c.gap}px`);
    props.push(
      `flex-grow: ${i.flexGrow}`,
      `flex-shrink: ${i.flexShrink}`,
      `flex-basis: ${i.flexBasis}`,
    );
    if (i.alignSelf !== 'auto') props.push(`align-self: ${i.alignSelf}`);

    return `.layout-class-${CSS.escape(lc.name)} {\n  ${props.join(';\n  ')};\n}`;
  }
}

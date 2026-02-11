import { ElementTemplate, ContainerNode, ContentElement, FlexContainerProps, FlexItemProps, LayoutClass } from './types.js';

interface SerializedElement {
  name: string;
  widthMm: number;
  heightMm: number;
  rootContainerId: string;
  nextContainerId: number;
  nextContentElementId: number;
  containers: [string, ContainerNode][];
  layoutClasses: [string, LayoutClass][];
}

function getEffectiveProps(
  node: ContainerNode,
  layoutClasses: Map<string, LayoutClass>,
): { container: FlexContainerProps; item: FlexItemProps } {
  if (node.className) {
    const lc = layoutClasses.get(node.className);
    if (lc) return { container: { ...lc.container }, item: { ...lc.item } };
  }
  return { container: { ...node.container }, item: { ...node.item } };
}

function flexContainerCss(c: FlexContainerProps): string {
  let css = `display: flex; flex-direction: ${c.flexDirection}; flex-wrap: ${c.flexWrap};`;
  css += ` justify-content: ${c.justifyContent}; align-items: ${c.alignItems}; align-content: ${c.alignContent};`;
  if (c.gap > 0) css += ` gap: ${c.gap}px;`;
  return css;
}

function flexItemCss(i: FlexItemProps): string {
  let css = `flex-grow: ${i.flexGrow}; flex-shrink: ${i.flexShrink}; flex-basis: ${i.flexBasis};`;
  if (i.alignSelf !== 'auto') css += ` align-self: ${i.alignSelf};`;
  return css;
}

function buildContentElementHtml(ce: ContentElement, indent: string): string {
  switch (ce.type) {
    case 'heading':
      return `${indent}<h3 class="content-element" data-content-id="${ce.id}">Heading</h3>`;
    case 'text':
      return `${indent}<p class="content-element" data-content-id="${ce.id}">Text content</p>`;
    case 'table':
      return `${indent}<table class="content-element" data-content-id="${ce.id}"><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Cell 1</td><td>Cell 2</td></tr></table>`;
    case 'list':
      return `${indent}<ul class="content-element" data-content-id="${ce.id}"><li>List item 1</li><li>List item 2</li></ul>`;
    default:
      return `${indent}<div class="content-element" data-content-id="${ce.id}">${ce.type}</div>`;
  }
}

function buildHtmlTree(
  nodeId: string,
  containers: Map<string, ContainerNode>,
  layoutClasses: Map<string, LayoutClass>,
  indent: string,
): string {
  const node = containers.get(nodeId);
  if (!node) return '';

  const props = getEffectiveProps(node, layoutClasses);
  const styleParts: string[] = [];
  styleParts.push(flexContainerCss(props.container));
  styleParts.push(flexItemCss(props.item));
  const style = styleParts.join(' ');

  const classAttr = node.className ? ` class="layout-class-${node.className}"` : '';

  if (node.childrenIds.length === 0 && (!node.contentElements || node.contentElements.length === 0)) {
    return `${indent}<div data-container-id="${node.id}"${classAttr} style="${style}"></div>`;
  }

  if (node.childrenIds.length === 0 && node.contentElements && node.contentElements.length > 0) {
    const lines: string[] = [];
    lines.push(`${indent}<div data-container-id="${node.id}"${classAttr} style="${style}">`);
    for (const ce of node.contentElements) {
      lines.push(buildContentElementHtml(ce, indent + '  '));
    }
    lines.push(`${indent}</div>`);
    return lines.join('\n');
  }

  const lines: string[] = [];
  lines.push(`${indent}<div data-container-id="${node.id}"${classAttr} style="${style}">`);
  for (const childId of node.childrenIds) {
    lines.push(buildHtmlTree(childId, containers, layoutClasses, indent + '  '));
  }
  lines.push(`${indent}</div>`);
  return lines.join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function exportElementToHtml(element: ElementTemplate): string {
  const data: SerializedElement = {
    name: element.name,
    widthMm: element.widthMm,
    heightMm: element.heightMm,
    rootContainerId: element.rootContainerId,
    nextContainerId: element.nextContainerId,
    nextContentElementId: element.nextContentElementId ?? 0,
    containers: Array.from(element.containers.entries()),
    layoutClasses: Array.from(element.layoutClasses.entries()),
  };

  // Build CSS rules
  const cssRules: string[] = [];
  cssRules.push('* { margin: 0; padding: 0; box-sizing: border-box; }');
  cssRules.push(`.ref-layout-root { display: flex; width: ${element.widthMm}mm; height: ${element.heightMm}mm; }`);

  // Layout class rules
  for (const [, lc] of element.layoutClasses) {
    cssRules.push(`.layout-class-${lc.name} { ${flexContainerCss(lc.container)} ${flexItemCss(lc.item)} }`);
  }

  // Per-container rules (effective props)
  for (const [id, node] of element.containers) {
    const props = getEffectiveProps(node, element.layoutClasses);
    cssRules.push(`[data-container-id="${id}"] { ${flexContainerCss(props.container)} ${flexItemCss(props.item)} }`);
  }

  const styleBlock = cssRules.map(r => `    ${r}`).join('\n');

  // Build body HTML
  const bodyHtml = buildHtmlTree(
    element.rootContainerId,
    element.containers,
    element.layoutClasses,
    '  ',
  );

  // Wrap root in ref-layout-root class
  const bodyWithRoot = bodyHtml.replace(
    `<div data-container-id="${element.rootContainerId}"`,
    `<div class="ref-layout-root" data-container-id="${element.rootContainerId}"`,
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(element.name)}</title>
  <script type="application/json" id="ref-layout-data">
${JSON.stringify(data, null, 2)}
  </script>
  <style>
${styleBlock}
  </style>
</head>
<body>
${bodyWithRoot}
</body>
</html>`;
}

export function importElementFromHtml(html: string): {
  name: string;
  widthMm: number;
  heightMm: number;
  containers: Map<string, ContainerNode>;
  rootContainerId: string;
  layoutClasses: Map<string, LayoutClass>;
  nextContainerId: number;
  nextContentElementId: number;
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const script = doc.getElementById('ref-layout-data');
  if (!script) throw new Error('Not a valid ref-layout file: missing ref-layout-data script tag');

  let data: SerializedElement;
  try {
    data = JSON.parse(script.textContent || '');
  } catch {
    throw new Error('Not a valid ref-layout file: invalid JSON data');
  }

  if (!data.rootContainerId || !data.containers) {
    throw new Error('Not a valid ref-layout file: missing required fields');
  }

  const containers = new Map<string, ContainerNode>(data.containers);
  // Backward compat: ensure all containers have contentElements
  for (const node of containers.values()) {
    if (!node.contentElements) node.contentElements = [];
  }

  return {
    name: data.name || 'Imported',
    widthMm: data.widthMm ?? 210,
    heightMm: data.heightMm ?? 297,
    containers,
    rootContainerId: data.rootContainerId,
    layoutClasses: new Map(data.layoutClasses || []),
    nextContainerId: data.nextContainerId ?? 1,
    nextContentElementId: data.nextContentElementId ?? 0,
  };
}

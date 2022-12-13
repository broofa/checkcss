// REF: https://www.w3.org/TR/selectors-3/#lex
const CLASS_IDENT_REGEX =
  /\.-?(?:[_a-z]|[^\0-\x7f]|\\[0-9a-f]{1,6}\s?|\\[^\s0-9a-f])(?:[_a-z0-9-]|[^\0-\x7f]|\\[0-9a-f]{1,6}\s?|\\[^\s0-9a-f])*/gi;

export function isGroupingRule(rule: CSSRule): rule is CSSGroupingRule {
  return 'cssRules' in rule;
}

export function isCSSStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return 'selectorText' in rule;
}

export function isLinkElement(el: Node): el is HTMLLinkElement {
  return (el as Element).tagName?.toLowerCase() === 'link';
}

export function isStyleElement(el: any): el is HTMLStyleElement {
  return (el as Element).tagName?.toLowerCase() === 'style';
}

export function isElement(el: Node): el is Element {
  return el instanceof Element;
}

export function scanElementForClassnames(
  node: Element,
  scanChildNodes: boolean = false,
  detected = new Set<string>()
) {
  if (node?.classList) {
    for (const cl of node.classList) {
      // Mark as seen
      detected.add(cl);
    }
  }

  if (scanChildNodes) {
    for (const el of node.querySelectorAll('*')) {
      scanElementForClassnames(el, false, detected);
    }
  }

  return detected;
}

export function parseSelectorForClassnames(sel: string) {
  const classnames = new Set<string>();
  const matches = sel.match(CLASS_IDENT_REGEX);

  if (matches) {
    for (let cl of matches) {
      // Strip '.'
      cl = cl.substring(1);

      // Unescape numeric escape sequences (\###)
      cl = cl.replaceAll(/\\[0-9a-f]{1,6}\s?/gi, escape => {
        return String.fromCodePoint(parseInt(escape.substring(1), 16));
      });

      // Unescape character escape sequences (\[some char])
      cl = cl.replaceAll(/\\[^\s0-9a-f]/g, c => c.substring(1));
      classnames.add(cl);
    }
  }

  return classnames;
}

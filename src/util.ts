// Regex for identifying class names in CSS selectors
//
// REF: https://www.w3.org/TR/selectors-3/#lex
const CLASS_IDENT_REGEX =
  /\.-?(?:[_a-z]|[^\0-\x7f]|\\[0-9a-f]{1,6}\s?|\\[^\s0-9a-f])(?:[_a-z0-9-]|[^\0-\x7f]|\\[0-9a-f]{1,6}\s?|\\[^\s0-9a-f])*/gi;

export function isGroupingRule(rule: any): rule is CSSGroupingRule {
  return (rule?.cssRules?.length ?? 0) > 0;
}

export function isCSSStyleRule(rule: any): rule is CSSStyleRule {
  return rule && 'selectorText' in rule;
}

export function isElement(el: Node): el is Element {
  return el?.nodeType === 1;
}

export function isLinkElement(el: Node): el is HTMLLinkElement {
  return (
    el.nodeName === 'LINK' && (el as Element).tagName?.toLowerCase() === 'link'
  );
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

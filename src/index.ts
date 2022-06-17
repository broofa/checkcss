// Regex for identifying class names in CSS selectors
// REF: https://www.w3.org/TR/selectors-3/#lex
export const CLASS_IDENT_REGEX =
  /\.-?(?:[_a-z]|[^\0-\x7f]|\\[0-9a-f]{1,6}\s?|\\[^\s0-9a-f])(?:[_a-z0-9-]|[^\0-\x7f]|\\[0-9a-f]{1,6}\s?|\\[^\s0-9a-f])*/gi;

const seen = new Set();
let defined: Set<any>;

let ignoreRE: RegExp | undefined;
export function ignoreCSS(re: RegExp | undefined) {
  ignoreRE = re;
}

function checkClassNames(node: Element, includeChildren = false) {
  if (node?.classList) {
    for (const cl of node.classList) {
      // Ignore defined and already-seen classes
      if (defined.has(cl) || seen.has(cl)) continue;

      // Mark as seen
      seen.add(cl);

      // Ignore classes that mathc the ignore regex
      if (ignoreRE?.test(cl)) continue;

      console.warn(`Undefined CSS class: ${cl}`, node);
    }
  }

  if (includeChildren) {
    for (const el of node.querySelectorAll('*')) {
      checkClassNames(el);
    }
  }
}

function isGroupingRule(rule: CSSRule): rule is CSSGroupingRule {
  return 'cssRules' in rule;
}

function isCSSStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return 'selectorText' in rule;
}

export function extractClasses(sel: string) {
  const classnames = sel.match(CLASS_IDENT_REGEX) ?? [];
  return classnames.map(c => {
    // Strip '.'
    c = c.substring(1);

    // Unescape numeric escape sequences (\###)
    c = c.replaceAll(/\\[0-9a-f]{1,6}\s?/gi, escape => {
      return String.fromCodePoint(parseInt(escape.substring(1), 16));
    });

    // Unescape character escape sequences (\[some char])
    c = c.replaceAll(/\\[^\s0-9a-f]/g, c => c.substring(1));
    return c;
  });
}

function ingestRules(rules: CSSRuleList) {
  for (const rule of rules) {
    if (isGroupingRule(rule)) {
      // Some rules are groups of rules (e.g. CSSMediaRule), so we need to
      // recurse into them
      ingestRules(rule.cssRules);
    } else if (isCSSStyleRule(rule)) {
      // Add each classname to the defined set
      for (const classname of extractClasses(rule.selectorText)) {
        defined.add(classname);
      }
    }
  }
}

export function monitorCSS() {
  const observer = new MutationObserver(mutationsList => {
    for (const mut of mutationsList) {
      if (mut.type === 'childList' && mut?.addedNodes) {
        for (const el of mut.addedNodes) {
          // Ignore text nodes
          if (el.nodeType == 3) continue;
          if (!(el instanceof HTMLElement)) return;

          // Sweep DOM fragment
          checkClassNames(el);
          for (const cel of el.querySelectorAll('*')) {
            checkClassNames(cel);
          }
        }
      } else if (mut?.attributeName == 'class') {
        // ... if the element 'class' changed
        checkClassNames(mut.target as Element);
      }
    }
  });

  observer.observe(document, {
    attributes: true,
    childList: true,
    subtree: true,
  });
}

export default function checkCSS() {
  if (defined) return;
  defined = new Set();

  // Ingest rules from all stylesheets
  for (const sheet of document.styleSheets) {
    ingestRules(sheet.cssRules);
  }

  // Do a sweep of the existing DOM
  checkClassNames(document.documentElement, true);
}

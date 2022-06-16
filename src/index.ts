const SELECTOR_REGEX = /\.(?:[\w-]|\\[:./[\]])+/g;

const seen = new Set();
let defined: Set<any>;

let ignoreRE: RegExp | undefined;
export function ignoreCSS(re: RegExp | undefined) {
  ignoreRE = re;
}

function checkClassNames(node: Element, includeChildren = false) {
  if (node?.classList)  {
    for (const cl of node.classList) {
      // Ignore defined and already-seen classes
      if (defined.has(cl) || seen.has(cl)) continue;

      // Mark as seen
      seen.add(cl);

      // Ignore if matches the ignore regex
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

function ingestRules(rules: CSSRuleList | StyleSheetList) {
  for (const rule of rules) {
    if (!rule) continue;
    try {
      (rule as CSSStyleSheet).cssRules;
    } catch (err) {
      console.log(`Unable to access ${(rule as CSSStyleSheet).href}`);
      continue;
    }
    if ((rule as CSSStyleSheet)?.cssRules) {
      // Rules can contain sub-rules (e.g. @media, @print)
      ingestRules((rule as CSSStyleSheet).cssRules);
    } else if ((rule as CSSStyleRule).selectorText) {
      // Get defined classes.  (Regex here could probably use improvement)
      const classes = (rule as CSSStyleRule).selectorText?.match(SELECTOR_REGEX);
      if (classes) {
        for (const cl of classes) {
          defined.add(cl.substring(1).replace(/\\/g, ''));
        }
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
    subtree: true
  });
}

export default function checkCSS() {
  if (defined) return;
  defined = new Set();

  // Cache
  ingestRules(document.styleSheets);

  // Do a sweep of the existing DOM
  checkClassNames(document.documentElement, true);
}

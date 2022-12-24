import {
  isCSSStyleRule,
  isElement,
  isGroupingRule,
  isLinkElement,
  parseSelectorForClassnames,
} from './util.js';

export enum ClassnameStatus {
  DETECTED = 0, // name is used in `class` attribute
  IGNORED = 1, // ... but ignored (e.g. via onClassnameDetected)
  EMITTED = 2, // ... or has already been emitted via onUndefinedClassname
  DEFINED = 3, // name is defined in a stylesheet
}

export class CheckCSS {
  // Classnames defined in stylesheets
  #classnames = new Map<string, ClassnameStatus>();

  // # of external stylesheets that actively loading.
  #pending = 0;

  // Default root element to scan for classnames
  #documentElement: HTMLElement;

  #observer?: MutationObserver;

  #watch = false;

  // Check timer
  #timer?: number;

  // Map that tracks the number of rules found in STYLE elements
  #seenStylesheets = new WeakMap<CSSRuleList, number>();

  // Hook for filtering classnames in DOM. Thi is called whenever a new
  // classname is detected in the DOM. Callback should return true to indicate
  // the class should be checked, false to ignore.
  onClassnameDetected?: (classname: string, el: Element) => boolean;

  // Callback when undefined classname is detected (defaults to console.warn())
  onUndefinedClassname(classname: string) {
    console.log(
      `%ccheckcss%c: No CSS rule for %c.${classname}%c, referenced by: %o`,
      'color: darkorange',
      '',
      'font-weight: bold',
      '',
      this.#documentElement.querySelectorAll(`.${classname}`)
    );
  }

  constructor(document: Document = window.document) {
    this.#documentElement = document.documentElement;
  }

  #check(delay = 0) {
    // Defer check until all LINK stylesheets have loaded
    if (this.#pending > 0) delay = 3_000;

    // Clear timer
    clearTimeout(this.#timer);
    this.#timer = undefined;

    // Defer if requested
    if (delay > 0) {
      this.#timer = setTimeout(() => this.#check(0), delay);
      return;
    }

    // Scan LINK[rel="stylesheet"] elements we haven't seen yet
    const styleLinks: NodeListOf<HTMLLinkElement> =
      this.#documentElement.querySelectorAll('link[rel="stylesheet"]');
    for (const styleLink of styleLinks) {
      if (styleLink.dataset.ccScanned !== undefined) continue;
      styleLink.dataset.ccScanned = ''; // Set attribute

      this.#processStylesheet(styleLink);
    }

    // Scan STYLE elements we haven't seen yet, or that might have changed
    const styleElements: NodeListOf<HTMLStyleElement> =
      this.#documentElement.querySelectorAll('style');
    for (const styleElement of styleElements) {
      const { sheet } = styleElement;
      if (!sheet) continue;

      // Skip style elements we've seen before.  This is complicated by how
      // STYLE elements can be dynamically modified, in one of two ways:
      //
      // 1. Setting `styleElement.textContent`, which blows away the
      //    `styleElement.sheet`
      // 2. Methods like `sheet#insertRule()` and `sheet#replace()`
      //
      // However none of these trigger DOM mutation events, so we have to resort
      // to the crude logic here to see if anythings change.  While this logic
      // isn't perfect, it's reasonably performant and good enough for most
      // purposes.
      const expectedLength = this.#seenStylesheets.get(sheet.cssRules) ?? 0;
      const actualLength = sheet.cssRules.length;
      if (expectedLength === actualLength) continue;
      this.#seenStylesheets.set(sheet.cssRules, actualLength);

      this.#processStylesheet(styleElement);
    }

    if (!this.onUndefinedClassname) return;

    for (const [classname, status] of this.#classnames) {
      if (status == ClassnameStatus.DETECTED) {
        this.#classnames.set(classname, ClassnameStatus.EMITTED);
        this.onUndefinedClassname(classname);
      }
    }

    // Repeat as long as we're in watch mode
    if (this.#watch) {
      this.#check(5_000);
    }
  }

  #processElement(el: Element, includeChildren = true) {
    // Skip non-Element nodes
    if (el.nodeType !== 1) return;

    // Detect styles referenced in "class" attribute
    for (const n of el.classList) {
      if (this.#classnames.has(n)) continue;
      this.#classnames.set(n, ClassnameStatus.DETECTED);
    }

    // Recurse into children(?)
    if (includeChildren) {
      for (const cel of el.querySelectorAll('*')) {
        this.#processElement(cel, false);
      }
    }
  }

  #processStylesheet(sheet: HTMLStyleElement | CSSGroupingRule) {
    const rules = isGroupingRule(sheet)
      ? sheet?.cssRules
      : sheet.sheet?.cssRules;

    if (!rules) return;

    for (const rule of rules) {
      if (isGroupingRule(rule)) {
        // Recurse into grouping rules (e.g. CSSMediaRule)
        this.#processStylesheet(rule);
      } else if (isCSSStyleRule(rule)) {
        // Add each classname to the defined set
        for (const classname of parseSelectorForClassnames(rule.selectorText)) {
          this.#classnames.set(classname, ClassnameStatus.DEFINED);
        }
      }
    }
  }

  // FOR TESTING ONLY.  This may be removed or changed without warning.
  get _testState() {
    return this.#classnames;
  }

  scan() {
    this.#processElement(this.#documentElement);
    this.#check(100);
    return this;
  }

  watch() {
    this.#watch = true;

    if (this.#observer) return;
    this.#observer = new MutationObserver(mutationsList => {
      for (const mut of mutationsList) {
        switch (mut.type) {
          case 'attributes': {
            this.#processElement(mut.target as Element, false);
          }

          case 'childList': {
            for (const el of mut.addedNodes) {
              if (!isElement(el)) continue;
              this.#processElement(el);

              // Track LINK elements
              if (isLinkElement(el)) {
                if (!el.sheet) {
                  // Style sheet link, but w/out styles (so not yet loaded?),
                  // wait until it's loaded
                  this.#pending++;

                  const loader = () => {
                    el.removeEventListener('load', loader);
                    el.removeEventListener('error', loader);

                    this.#pending--;
                    this.#check();
                  };

                  el.addEventListener('load', loader);
                  el.addEventListener('error', loader);
                }
              }
            }
          }
        }
      }

      // Check for undefined classes if there's no stylesheets loading
      this.#check();
    });

    this.#observer.observe(document, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true,
    });

    return this;
  }
}

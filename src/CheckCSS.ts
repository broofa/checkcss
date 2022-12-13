// Regex for identifying class names in CSS selectors

import {
  isCSSStyleRule,
  isGroupingRule,
  isLinkElement,
  isStyleElement,
  parseSelectorForClassnames,
  scanElementForClassnames,
} from './util.js';

enum ClassnameStatus {
  DETECTED = 0, // name is used in `class` attribute
  IGNORED = 1, // ... but ignored (e.g. via onClassnameDetected)
  EMITTED = 2, // ... or has already been emitted via onUndefinedClassname
  DEFINED = 3, // name is defined in a stylesheet
}

export class CheckCSS {
  // Event handler called whenever a new classname is detected in the DOM.
  // Return false to ignore the class name
  onClassnameDetected?: (classname: string, el: Element) => boolean;

  // Event handler called when an undefined classname is detected (defaults to
  // console.warn())
  onUndefinedClassname(classname: string) {
    console.warn(`CheckCSS: Undefined classname: ${classname}`);
  }

  // Classnames defined by stylesheets
  #classnames = new Map<string, ClassnameStatus>();

  #documentElement: HTMLElement;
  #observer?: MutationObserver;

  // Timer for debouncing checks
  #timer?: number;

  constructor(document: Document = window.document) {
    this.#documentElement = document.documentElement;
  }

  #check(lazy = false) {
    if (lazy) {
      if (this.#timer) return;
      this.#timer = setTimeout(() => {
        this.#timer = undefined;
        this.#check();
      }, 3000);
      return;
    }

    if (!this.onUndefinedClassname) return;

    for (const [classname, status] of this.#classnames) {
      if (status == ClassnameStatus.DETECTED) {
        this.#classnames.set(classname, ClassnameStatus.EMITTED);
        this.onUndefinedClassname(classname);
      }
    }
  }

  #processElement(
    el: Element = this.#documentElement,
    scanChildNodes: boolean = true
  ) {
    const classnames = scanElementForClassnames(el, true);
    for (const classname of classnames) {
      // Skip names we've already seen
      if (this.#classnames.has(classname)) continue;

      const ignore =
        this.onClassnameDetected && !this.onClassnameDetected(classname, el);
      this.#classnames.set(
        classname,
        ignore ? ClassnameStatus.IGNORED : ClassnameStatus.DETECTED
      );
    }

    this.#check(true);
  }

  #processStylesheet(sheet: CSSStyleSheet | CSSGroupingRule) {
    console.log('CheckCSS: Processing stylesheet ', sheet);
    for (const rule of sheet.cssRules) {
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

  // FOR TESTING ONLY!  Not a public API.  Expect this to break at any time.
  get _state() {
    return this.#classnames;
  }

  scan() {
    this.#processElement();
  }

  watch() {
    if (this.#observer) return;
    console.log('WATCH');

    this.#observer = new MutationObserver(mutationsList => {
      for (const mut of mutationsList) {
        if (mut.type === 'childList' && mut?.addedNodes) {
          for (const el of mut.addedNodes) {
            console.log('SCANNING', el);
            if ((isLinkElement(el) || isStyleElement(el)) && el.sheet) {
              // Ingest rules from dynamically added stylesheets
              this.#processStylesheet(el.sheet);
            } else if (el instanceof Element) {
              // Sweep DOM fragment
              this.#processElement(el);
            }
          }
        } else if (mut?.attributeName == 'class') {
          // ... if the element 'class' changed
          this.#processElement(mut.target as Element, false);
        }
      }
    });
    console.log('OBSERVE', document.body);

    this.#observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  }
}

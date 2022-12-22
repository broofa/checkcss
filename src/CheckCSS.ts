import {
  isCSSStyleRule,
  isGroupingRule,
  isLinkElement,
  isStyleElement,
  parseSelectorForClassnames,
  scanElementForClassnames,
} from './util.js';

export enum ClassnameStatus {
  DETECTED = 0, // name is used in `class` attribute
  IGNORED = 1, // ... but ignored (e.g. via onClassnameDetected)
  EMITTED = 2, // ... or has already been emitted via onUndefinedClassname
  DEFINED = 3, // name is defined in a stylesheet
}

export class CheckCSS {
  // Hook for filtering classnames in DOM. Thi is called whenever a new
  // classname is detected in the DOM. Callback should return true to indicate
  // the class should be checked, false to ignore.
  onClassnameDetected?: (classname: string, el: Element) => boolean;

  // Callback when undefined classname is detected (defaults to console.warn())
  onUndefinedClassname(classname: string) {
    console.warn(
      `CheckCSS: Undefined classname: ${classname}`,
      this.#documentElement.querySelectorAll(`.${classname}`)
    );
  }

  // Classnames defined in stylesheets
  #classnames = new Map<string, ClassnameStatus>();

  // # of external stylesheets that actively loading.
  #pending = 0;

  // Default root element to scan for classnames
  #documentElement: HTMLElement;

  #observer?: MutationObserver;

  // Check timer
  #timer?: number;

  constructor(document: Document = window.document) {
    this.#documentElement = document.documentElement;
  }

  #check(delay = 0) {
    // Clear pending timer
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }

    // If non-zero delay, defer the call
    if (delay > 0) {
      this.#timer = setTimeout(() => this.#check(0), delay);
      return;
    }

    // Skip checks while stylesheets are still pending
    if (this.#pending > 0) return;

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
  }

  #processStylesheet(sheet: CSSStyleSheet | CSSGroupingRule) {
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

  // FOR TESTING ONLY.  This may be removed or changed without warning.
  get _testState() {
    return this.#classnames;
  }

  scan(delay = 100) {
    this.#processElement();
    this.#check(delay);
    return this;
  }

  watch() {
    if (this.#observer) return;
    this.#observer = new MutationObserver(mutationsList => {
      for (const mut of mutationsList) {
        if (mut.type === 'childList' && mut?.addedNodes) {
          for (const el of mut.addedNodes) {
            if (isStyleElement(el)) {
              if (el.sheet) {
                this.#processStylesheet(el.sheet);
              }
            } else if (isLinkElement(el)) {
              if (el.sheet) {
                // Style sheet link, with styles already loaded(?), process it
                this.#processStylesheet(el.sheet);
              } else {
                // Style sheet link, but w/out styles (so not yet loaded?), wait
                // until it's loaded
                this.#pending++;

                const loader = () => {
                  el.removeEventListener('load', loader);
                  el.removeEventListener('error', loader);

                  if (el.sheet) this.#processStylesheet(el.sheet);

                  this.#pending--;
                  this.#check();
                };

                el.addEventListener('load', loader);
                el.addEventListener('error', loader);
              }
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

      // Check for undefined classes if there's no stylesheets loading
      this.#check();
    });

    this.#observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true,
    });

    return this;
  }
}

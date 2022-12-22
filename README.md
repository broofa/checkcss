# checkcss

Logic for detecting when DOM elements reference undefined CSS classes.

Note: The `scan()` method uses the [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) API to monitor DOM changes. While this should be pretty efficient, it's probably not something you want to be running in production.

## Installation

```
npm install checkcss
# or
yarn add checkcss
```

## Usage

```javascript
import { CheckCSS } from 'checkcss';

// Create CheckCSS instance
const checkcss = new CheckCSS();

// OPTIONAL: Set hook to filter classnames.
// Return false for classnames that should be ignored.
checkcss.onClassnameDetected = function (classname, element) {
  return /^license-|^maintainer-/.test();
};

// OPTIONAL: Set hook for custom logging (replaces default log method)
checkcss.onUndefinedClassname = function (classname) {
  // Custom logging goes here
};

// Scan current DOM for undefined classes
checkcss.scan();

// Monitor DOM as it changes
checkcss.watch();
```

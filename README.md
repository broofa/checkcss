# checkcss

Detect DOM elements that reference undefined CSS classes
## Installation

```bash
npm install checkcss
# or
yarn add checkcss
```

## Usage

```javascript
import { CheckCSS } from 'checkcss';

// Create CheckCSS instance
const checkcss = new CheckCSS();
checkcss.scan().watch();
```
... then look for messages like this in your browser console:
![image](https://user-images.githubusercontent.com/164050/209418239-dfd6584d-f1f3-4903-85fd-aeb3d5cb2e5a.png)

## Hooks
The following hooks are supported:
```javascript
// OPTIONAL: Hook for filtering classnames
checkcss.onClassnameDetected = function (classname, element) {
  // Return `false` to disable checks for `classname`.
  // For example, to ignore classnames starting with
  // "license-" or "maintainer-"...
  return /^license-|^maintainer-/.test(classname) ? false : true;
};

// OPTIONAL: Hook for custom logging
checkcss.onUndefinedClassname = function (classname) {
  // Custom logging goes here (replaces default log method)
};
```

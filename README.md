
# checkcss

Utility method for warning any time the `class` attribute of an element references an undefined CSS class.

This module provides two methods:

* `checkCSS()` performs a one-time sweep of the DOM.
* `monitorCSS()` Sets up a
[MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) to continuously monitor DOM changes, looking for elements that reference undefined CSS classes.

(Note: `monitorCSS()` is fairly efficient but is probably not something you want to be
 running in production.)

## Installation

```
npm i checkcss
```

## Usage

```javascript
import checkCSS, { ignoreCSS, monitorCSS } from 'checkcss';

// (optional) Set a regex for classnames to ignore
ignoreCSS(/^license-|^maintainer-/);

// Check current DOM
checkCSS();

// ... and setup monitor to check DOM as it changes
monitorCSS();
```

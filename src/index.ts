import { CheckCSS } from './CheckCSS.js';
export * from './CheckCSS.js';

let ignoreRE: RegExp | undefined;

let checkcss: CheckCSS;

const warned = new Set();
function warn(msg: string) {
  if (warned.has(msg)) return;
  warned.add(msg);
  console.warn(msg);
}

// Legacy API support
export function ignoreCSS(re: RegExp | undefined) {
  warn(
    'ignoreRE is deprecated and will be removed in the next major release. Use CheckCSS#onClassnameDetected instead'
  );
  ignoreRE = re;
}

export default function checkCSS() {
  warn('checkCSS() is deprecated. Use CheckCSS#scan() instead');

  if (!checkcss) {
    checkcss = new CheckCSS(document);

    // Legacy API support for ignoreRE.
    checkcss.onClassnameDetected = (classname, el) => {
      return ignoreRE?.test(classname) ?? true;
    };
  }

  checkcss.scan();
}

export function monitorCSS() {
  warn('monitorCSS() is deprecated. Use CheckCSS#watch() instead');
  checkcss.watch();
}

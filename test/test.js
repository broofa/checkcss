import assert from 'assert';
import { extractClasses } from '../dist/index.js';

//
// Test the regex used to scrape classnames out of rule selector text
//

// Sampling of selector patterns that show up in the `tailwind` framework. "X" =
// text of some sort, "0" = numeric digits of some sort.
const TAILWIND_SELECTORS = {
  '.-X\\.X': ['-X.X'],
  '.-X\\.X > :X([X]) ~ :X([X])': ['-X.X'],
  '.X, .X, .X': ['X', 'X', 'X'],
  '.X:X .X\\:X': ['X', 'X:X'],
  '.X:X .X\\:X\\:X': ['X', 'X:X:X'],
  '.X:X .\\0xl\\:X\\:X': ['X', '\x00xl:X:X'],
  '.X\\.X': ['X.X'],
  '.X\\.X > :X([X]) ~ :X([X])': ['X.X'],
  '.X\\:-X\\.X': ['X:-X.X'],
  '.X\\:-X\\.X > :X([X]) ~ :X([X])': ['X:-X.X'],
  '.X\\:-X\\.X:X': ['X:-X.X'],
  '.X\\:X, .X\\:X, .X\\:X': ['X:X', 'X:X', 'X:X'],
  '.X\\:X\\.X': ['X:X.X'],
  '.X\\:X\\.X > :X([X]) ~ :X([X])': ['X:X.X'],
  '.X\\:X\\.X:X': ['X:X.X'],
  '.X\\:X\\:-X\\.X:X': ['X:X:-X.X'],
  '.X\\:X\\:X\\.X:X': ['X:X:X.X'],
  '.\\0xl\\:-X\\.X': ['\x00xl:-X.X'],
  '.\\0xl\\:-X\\.X > :X([X]) ~ :X([X])': ['\x00xl:-X.X'],
  '.\\0xl\\:X, .\\0xl\\:X, .\\0xl\\:X': ['\x00xl:X', '\x00xl:X', '\x00xl:X'],
  '.\\0xl\\:X\\.X': ['\x00xl:X.X'],
  '.\\0xl\\:X\\.X > :X([X]) ~ :X([X])': ['\x00xl:X.X'],
  '.\\0xl\\:X\\:-X\\.X:X': ['\x00xl:X:-X.X'],
  '.\\0xl\\:X\\:X\\.X:X': ['\x00xl:X:X.X']
};

for (const [sel, expected] of Object.entries(TAILWIND_SELECTORS)) {
  const actual = extractClasses(sel);

  assert.deepEqual(extractClasses(sel), expected, sel);

  // Make sure we get the same results when whitespace is removed.
  assert.deepEqual(extractClasses(sel.replace(/\s/g, '')), expected, sel);
}

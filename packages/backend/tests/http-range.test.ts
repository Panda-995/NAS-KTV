import assert from 'node:assert/strict';
import { parseByteRange } from '../src/utils/http-range.ts';

assert.deepEqual(parseByteRange('bytes=0-', 1000), { start: 0, end: 999 });
assert.deepEqual(parseByteRange('bytes=0-4095', 1000), { start: 0, end: 999 });
assert.deepEqual(parseByteRange('bytes=900-1200', 1000), { start: 900, end: 999 });
assert.deepEqual(parseByteRange('bytes=-100', 1000), { start: 900, end: 999 });
assert.deepEqual(parseByteRange('bytes=-5000', 1000), { start: 0, end: 999 });
assert.equal(parseByteRange('bytes=1000-', 1000), null);
assert.equal(parseByteRange('bytes=-0', 1000), null);
assert.equal(parseByteRange('bytes=0-1,3-4', 1000), null);
assert.equal(parseByteRange('invalid', 1000), null);

console.info('HTTP media ranges support Android WebView range request variants');

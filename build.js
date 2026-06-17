import { mkdirSync, copyFileSync, writeFileSync } from 'fs';

mkdirSync('dist', { recursive: true });

copyFileSync('src/index.js', 'dist/index.js');
copyFileSync('src/index.d.ts', 'dist/index.d.ts');

const cjs = `'use strict';
let _mod;
async function _load() {
  if (!_mod) _mod = await import('./index.js');
  return _mod;
}
module.exports.withLatency = function withLatency() {
  throw new Error('npm-slowmo: Use ESM (import) for best experience. CJS: const { withLatency } = await import("npm-slowmo")');
};
module.exports.load = _load;
`;

writeFileSync('dist/index.cjs', cjs);

console.log('✓ dist/index.js');
console.log('✓ dist/index.cjs');
console.log('✓ dist/index.d.ts');
console.log('build complete.');
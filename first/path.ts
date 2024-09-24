import path from 'path';

console.log(path.join('first', 'second', 'third'));
// Output: first/second/third

console.log(path.resolve(__dirname, './path.ts'));

console.log(path.dirname(path.resolve(__dirname, './path.ts')));

console.log(path.basename(path.resolve(__dirname, './path.ts'))); // path.ts

console.log(path.extname(path.resolve(__dirname, './path.ts'))); // .ts

console.log(path.parse(path.resolve(__dirname, './path.ts'))); // { root: '', dir: '/Users/username/Projects/learn-typescript/node_modules/@types/node', base: 'path.ts', ext: '.ts', name: 'path' }

console.log(path.format(path.parse(path.resolve(__dirname, './path.ts')))); // /Users/username/Projects/learn-typescript/node_modules/@types/node/path.ts
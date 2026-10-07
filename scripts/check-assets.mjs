import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]));
  return nested.flat();
}

for (const path of await files('dist')) {
  assert(!/\.(jpe?g|png)$/i.test(path), `Unexpected image in the build: ${path}`);
  const content = await readFile(path, 'utf8');
  assert(!/reference\/|_4_5005_c|data:image\/jpeg/i.test(content), `Reference content in the build: ${path}`);
}
console.log('The application output contains no reference images.');

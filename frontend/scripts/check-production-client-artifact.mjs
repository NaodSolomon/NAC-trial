import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const clientDirectory = join(process.cwd(), '.next', 'static');
const forbiddenLocalUrl = /https?:\\?\/\\?\/(?:localhost|127\.0\.0\.1|\[?::1\]?)(?::\d+)?/i;
const textExtensions = new Set(['.js', '.json', '.map', '.txt', '.css', '.html']);
const violations = [];

await inspectDirectory(clientDirectory);

if (violations.length) {
  throw new Error(
    `Production client artifact contains localhost URLs in:\n${violations.join('\n')}`,
  );
}

async function inspectDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspectDirectory(path);
    } else if (textExtensions.has(extname(entry.name))) {
      const contents = await readFile(path, 'utf8');
      if (forbiddenLocalUrl.test(contents)) violations.push(path);
    }
  }
}

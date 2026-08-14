import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function assertLighthouseProductionBuild(root = process.cwd()) {
  const nextDirectory = resolve(root, '.next');
  const buildIdPath = resolve(nextDirectory, 'BUILD_ID');
  let buildId;

  try {
    buildId = (await readFile(buildIdPath, 'utf8')).trim();
    await Promise.all([
      stat(resolve(nextDirectory, 'required-server-files.json')),
      stat(resolve(nextDirectory, 'routes-manifest.json')),
    ]);
  } catch {
    throw new Error(
      'Lighthouse requires a complete Next.js production build. Run `pnpm build` immediately before `pnpm lighthouse:ci`.',
    );
  }

  if (!buildId) {
    throw new Error('Lighthouse cannot start because .next/BUILD_ID is empty. Rebuild the frontend.');
  }

  return buildId;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  const buildId = await assertLighthouseProductionBuild();
  console.log(`LIGHTHOUSE_PRODUCTION_BUILD_READY ${buildId}`);
}

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const chunksDirectory = path.join(root, '.next', 'static', 'chunks');
const lighthouseConfig = JSON.parse(
  await readFile(path.join(root, 'lighthouserc.json'), 'utf8'),
);
const minimumScores = ['performance', 'accessibility', 'best-practices', 'seo'];
for (const category of minimumScores) {
  const assertion = lighthouseConfig.ci?.assert?.assertions?.[`categories:${category}`];
  if (!Array.isArray(assertion) || assertion[0] !== 'error' || assertion[1]?.minScore < 0.9) {
    throw new Error(`Lighthouse ${category} must be enforced at a minimum score of 0.90.`);
  }
}

const files = await walk(chunksDirectory);
const assets = await Promise.all(
  files.filter((file) => /\.(?:js|css)$/.test(file)).map(async (file) => ({ file, bytes: (await stat(file)).size })),
);
const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
const largest = [...assets].sort((left, right) => right.bytes - left.bytes)[0];
const maxChunkBytes = Number(process.env.MAX_CHUNK_BYTES ?? 600_000);
const maxTotalBytes = Number(process.env.MAX_TOTAL_CHUNK_BYTES ?? 8_000_000);

console.log(`Analyzed ${assets.length} optimized JS/CSS chunks (${formatBytes(totalBytes)} total).`);
console.log(`Largest chunk: ${path.relative(root, largest.file)} (${formatBytes(largest.bytes)}).`);
if (largest.bytes > maxChunkBytes) {
  throw new Error(`Largest chunk exceeds ${formatBytes(maxChunkBytes)}.`);
}
if (totalBytes > maxTotalBytes) {
  throw new Error(`Total optimized chunks exceed ${formatBytes(maxTotalBytes)}.`);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const value = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(value) : [value];
      }),
    )
  ).flat();
}

function formatBytes(value) {
  return `${(value / 1024).toFixed(1)} KiB`;
}

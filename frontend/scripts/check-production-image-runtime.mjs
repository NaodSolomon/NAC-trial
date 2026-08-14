import { createRequire } from 'node:module';

const requireFromScript = createRequire(import.meta.url);
const requireFromNext = createRequire(requireFromScript.resolve('next/package.json'));
const sharp = requireFromNext('sharp');
const output = await sharp({
  create: {
    width: 8,
    height: 8,
    channels: 4,
    background: { r: 24, g: 120, b: 80, alpha: 1 },
  },
})
  .webp()
  .toBuffer();

if (output.length === 0) {
  throw new Error('The production image optimizer returned an empty image.');
}

console.log(`PRODUCTION_IMAGE_RUNTIME_READY sharp=${sharp.versions.sharp}`);

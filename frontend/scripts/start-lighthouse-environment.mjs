import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertLighthouseProductionBuild } from './assert-lighthouse-production-build.mjs';

await assertLighthouseProductionBuild();

const children = [];
let stopping = false;

const mockApi = start(process.execPath, ['tests/helpers/home-api-server.mjs']);
const nextCli = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const frontend = start(process.execPath, [nextCli, 'start']);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stop(signal));
}

await Promise.all([
  waitFor('http://127.0.0.1:4010/health'),
  waitFor('http://127.0.0.1:3000/?lang=en'),
]);
console.log('LIGHTHOUSE_ENVIRONMENT_READY');

await new Promise((resolve) => {
  for (const child of [mockApi, frontend]) {
    child.once('exit', (code) => {
      if (!stopping) process.exitCode = code || 1;
      resolve();
    });
  }
});

function start(command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      API_URL: 'http://127.0.0.1:4010/api/v1',
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:4010/api/v1',
    },
    stdio: 'inherit',
  });
  children.push(child);
  child.once('error', (error) => {
    console.error(error);
    stop('SIGTERM');
  });
  return child;
}

async function waitFor(url) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The processes are still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

function stop(signal) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

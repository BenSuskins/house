import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';

const directory = await mkdtemp(join(tmpdir(), 'house-server-'));
const portReservation = createServer();
await new Promise((resolve) => portReservation.listen(0, '127.0.0.1', resolve));
const port = portReservation.address().port;
await new Promise((resolve) => portReservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
let child;
let output = '';

async function start() {
  child = spawn(process.execPath, ['dist/server/main.js'], { env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), HOUSE_DB_PATH: join(directory, 'house.db') }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (data) => { output += data; });
  child.stderr.on('data', (data) => { output += data; });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { if ((await fetch(`${origin}/healthz`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`The server does not become healthy. ${output}`);
}

async function stop() {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, 'exit');
  child.kill('SIGTERM'); await exited;
}

async function request(path, method = 'GET', body) {
  const response = await fetch(`${origin}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert(response.ok, `${method} ${path} returns ${response.status}`);
  return response.json();
}

try {
  await start();
  const initial = await request('/api/designs');
  assert.equal(initial.length, 1);
  const created = await request('/api/designs', 'POST', { name: 'Before restart' });
  const content = { ...created, name: 'After restart', floorFinishes: { ...created.floorFinishes, 'first-bedroom-two': { material: 'wood', colour: '#93a99b' } } };
  const saved = await request(`/api/designs/${created.id}`, 'PUT', content);
  await stop(); await start();
  assert.deepEqual(await request(`/api/designs/${created.id}`), saved);
  assert.equal((await request('/api/designs')).length, 2);
  console.log('Health and saved designs pass after a Node server restart.');
} finally {
  await stop(); await rm(directory, { recursive: true, force: true });
}

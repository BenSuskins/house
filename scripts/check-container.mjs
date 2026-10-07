import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const image = process.argv[2] ?? 'house:local';
const suffix = `${process.pid}-${Date.now()}`;
const container = `house-check-${suffix}`;
const volume = `house-check-data-${suffix}`;
const docker = (...argumentsList) => execFileSync('docker', argumentsList, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

async function ready(origin) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { const response = await fetch(`${origin}/healthz`); if (response.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`The health check fails. ${docker('logs', container)}`);
}

async function request(origin, path, method = 'GET', body) {
  const response = await fetch(`${origin}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert(response.ok, `${method} ${path} returns ${response.status}`);
  return response.json();
}

try {
  docker('volume', 'create', volume);
  docker('run', '-d', '--name', container, '-p', '127.0.0.1::8080', '-v', `${volume}:/data`, image);
  const origin = `http://${docker('port', container, '8080/tcp').split('\n')[0]}`;
  await ready(origin);
  const created = await request(origin, '/api/designs', 'POST', { name: 'Container persistence check' });
  const changed = await request(origin, `/api/designs/${created.id}`, 'PUT', { ...created, name: 'Saved before restart' });
  docker('restart', container);
  await ready(origin);
  const restored = await request(origin, `/api/designs/${created.id}`);
  assert.equal(restored.name, changed.name);
  assert.equal(restored.revision, changed.revision);
  assert.equal(docker('exec', container, 'node', '-p', 'process.versions.node.split(".")[0]'), '24');
  const applicationFiles = docker('exec', container, 'find', '/app', '-path', '/app/node_modules', '-prune', '-o', '-type', 'f', '-print');
  assert(!/reference|\.(jpe?g|png)\b/i.test(applicationFiles), 'Reference images enter the image.');
  console.log('The Node 24 image passes health, restart, storage, and reference checks.');
} finally {
  try { docker('rm', '-f', container); } catch {}
  try { docker('volume', 'rm', volume); } catch {}
}

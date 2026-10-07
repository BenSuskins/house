import { describe, expect, it } from 'vitest';
import { buildApp } from '../server/app';
import { MemoryDesignStore } from '../server/store';

describe('the house API', () => {
  it('creates and duplicates designs and prevents stale updates from another device', async () => {
    const app = await buildApp(new MemoryDesignStore());
    const created = await app.inject({ method: 'POST', url: '/api/designs', payload: { name: 'Kitchen ideas' } });
    expect(created.statusCode).toBe(201);
    const design = created.json();
    const changed = { ...design, name: 'Kitchen green' };
    expect((await app.inject({ method: 'PUT', url: `/api/designs/${design.id}`, payload: changed })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PUT', url: `/api/designs/${design.id}`, payload: { ...design, name: 'Stale' } })).statusCode).toBe(409);
    const copied = await app.inject({ method: 'POST', url: '/api/designs', payload: { copyOf: design.id, name: 'Kitchen copy' } });
    expect(copied.statusCode).toBe(201);
    expect(copied.json().id).not.toBe(design.id);
    expect(copied.json().furniture).toEqual(design.furniture);
    expect((await app.inject({ method: 'GET', url: '/healthz' })).statusCode).toBe(200);
    await app.close();
  });
});

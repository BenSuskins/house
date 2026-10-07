import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDesign } from '../src/domain/editor';
import { MemoryDesignStore, SqliteDesignStore, type DesignStore } from '../server/store';

const folders: string[] = [];
const stores: DesignStore[] = [];
afterEach(() => { stores.splice(0).forEach((store) => store.close()); folders.splice(0).forEach((folder) => rmSync(folder, { recursive: true, force: true })); });
const sqliteStore = () => {
  const folder = mkdtempSync(join(tmpdir(), 'house-store-'));
  folders.push(folder);
  return new SqliteDesignStore(join(folder, 'house.db'));
};

for (const [name, factory] of [['memory fake', () => new MemoryDesignStore()], ['SQLite', sqliteStore]] as const) {
  describe(`design storage contract: ${name}`, () => {
    it('stores a named design without exposing a mutable copy', () => {
      const store = factory(); stores.push(store);
      const result = store.create(createDesign('Sunday ideas'));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(store.get(result.value.id)).toMatchObject({ ok: true, value: { name: 'Sunday ideas', revision: 1 } });
      result.value.furniture[0].colour = '#000000';
      const loaded = store.get(result.value.id);
      if (!loaded.ok) throw new Error('Load failed');
      expect(loaded.value.furniture[0].colour).not.toBe('#000000');
      expect(store.list()).toMatchObject({ ok: true, value: expect.arrayContaining([expect.objectContaining({ name: 'Sunday ideas' })]) });
    });
    it('rejects stale revisions, malformed designs, and stale deletes', () => {
      const store = factory(); stores.push(store);
      const created = store.create(createDesign('One'));
      if (!created.ok) throw new Error('Create failed');
      const first = store.update(created.value.id, 1, { ...created.value, name: 'Updated' });
      expect(first).toMatchObject({ ok: true, value: { name: 'Updated', revision: 2 } });
      expect(store.update(created.value.id, 1, { ...created.value, name: 'Stale' })).toMatchObject({ ok: false, error: { code: 'conflict' } });
      expect(store.remove(created.value.id, 1)).toMatchObject({ ok: false, error: { code: 'conflict' } });
      expect(store.create({ ...created.value, wallColours: {} })).toMatchObject({ ok: false, error: { code: 'invalid' } });
      expect(store.remove(created.value.id, 2)).toEqual({ ok: true, value: null });
      expect(store.get(created.value.id)).toMatchObject({ ok: false, error: { code: 'not-found' } });
    });
  });
}

it('keeps designs after a server restart and does not recreate a deleted starter design', () => {
  const folder = mkdtempSync(join(tmpdir(), 'house-restart-')); folders.push(folder);
  const path = join(folder, 'house.db');
  let store = new SqliteDesignStore(path);
  const created = store.create(createDesign('Keep me'));
  if (!created.ok) throw new Error('Create failed');
  store.close(); store = new SqliteDesignStore(path);
  expect(store.get(created.value.id)).toMatchObject({ ok: true, value: { name: 'Keep me' } });
  const listed = store.list(); if (!listed.ok) throw new Error('List failed');
  listed.value.forEach((design) => expect(store.remove(design.id, design.revision).ok).toBe(true));
  store.close(); store = new SqliteDesignStore(path); stores.push(store);
  expect(store.list()).toEqual({ ok: true, value: [] });
});

import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { expect, it } from 'vitest';
import { SqliteDesignStore } from '../server/store';
import { createDesign } from '../src/domain/editor';
import { house as previousHouse } from '../src/domain/house-version-one';
import { validateContent } from '../src/domain/validation';

it('migrates a saved design once and preserves its furniture and independent wall colours', () => {
  const directory = mkdtempSync(join(tmpdir(), 'house-migration-'));
  const path = join(directory, 'house.db');
  const design = createDesign('Existing design');
  const content = { ...design, houseVersion: 1, wallColours: Object.fromEntries(previousHouse.floors.flatMap((floor) => floor.walls.flatMap((wall) => wall.faces.map((face) => [face.id, '#f2f0e9'])))) };
  content.wallColours['first-bedrooms-divider-0'] = '#ccddee';
  content.wallColours['first-bedrooms-divider-1'] = '#aabbcc';
  const database = new Database(path);
  database.exec('CREATE TABLE designs (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, updated_at TEXT NOT NULL, content TEXT NOT NULL)');
  database.prepare('INSERT INTO designs VALUES (?, ?, ?, ?)').run(design.id, 3, design.updatedAt, JSON.stringify(content));
  database.close();
  let store = new SqliteDesignStore(path);
  try {
    const loaded = store.get(design.id);
    expect(loaded).toMatchObject({ ok: true, value: { houseVersion: 2, revision: 4, name: 'Existing design' } });
    if (!loaded.ok) return;
    expect(loaded.value.furniture).toEqual(content.furniture);
    expect(loaded.value.floorFinishes).toEqual(content.floorFinishes);
    expect(loaded.value.wallColours['first-bedrooms-divider-0']).toBe('#ccddee');
    expect(loaded.value.wallColours['first-bedrooms-divider-1']).toBe('#aabbcc');
    expect(validateContent(loaded.value).ok).toBe(true);
    store.close(); store = new SqliteDesignStore(path);
    expect(store.get(design.id)).toEqual(loaded);
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});

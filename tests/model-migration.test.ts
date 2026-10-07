import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { expect, it } from 'vitest';
import { SqliteDesignStore } from '../server/store';
import { createDesign } from '../src/domain/editor';
import { house as previousHouse } from '../src/domain/house-version-one';
import { house as versionTwoHouse } from '../src/domain/house-version-two';
import { migrateContent } from '../src/domain/migration';
import { validateContent } from '../src/domain/validation';

it.each([1, 2])('migrates a version %i design once and preserves its edited furniture and wall colours', (version) => {
  const directory = mkdtempSync(join(tmpdir(), 'house-migration-'));
  const path = join(directory, 'house.db');
  const design = createDesign('Existing design');
  const sourceHouse = version === 1 ? previousHouse : versionTwoHouse;
  const furniture = [{ ...design.furniture.find((item) => item.templateId === 'double-bed')!, position: { x: 1.6, z: 1.3 }, rotation: 0, colour: '#123456' }, { ...design.furniture.find((item) => item.templateId === 'computer-desk')!, position: { x: 5.86, z: 1.05 }, rotation: 270 }, { ...design.furniture.find((item) => item.templateId === 'bookcase')!, position: { x: 7.2, z: 2.87 }, rotation: 0 }];
  const content = { ...design, furniture, houseVersion: version, wallColours: Object.fromEntries(sourceHouse.floors.flatMap((floor) => floor.walls.flatMap((wall) => wall.faces.map((face) => [face.id, '#f2f0e9'])))) };
  content.wallColours['first-bedrooms-divider-0'] = '#ccddee';
  content.wallColours['first-bedrooms-divider-1'] = '#aabbcc';
  const database = new Database(path);
  database.exec('CREATE TABLE designs (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, updated_at TEXT NOT NULL, content TEXT NOT NULL)');
  database.prepare('INSERT INTO designs VALUES (?, ?, ?, ?)').run(design.id, 3, design.updatedAt, JSON.stringify(content));
  database.close();
  let store = new SqliteDesignStore(path);
  try {
    const loaded = store.get(design.id);
    expect(loaded).toMatchObject({ ok: true, value: { houseVersion: 4, revision: 4, name: 'Existing design' } });
    if (!loaded.ok) return;
    expect(loaded.value.furniture).toEqual([
      { ...furniture[0], position: { x: 8, z: 1.3 }, rotation: 0 },
      { ...furniture[1], position: { x: 3.1399999999999997, z: 4.19 }, rotation: 90 },
      { ...furniture[2], position: { x: 1.7999999999999998, z: 2.37 }, rotation: 180 },
    ]);
    expect(Object.keys(loaded.value.wallColours)).not.toContain('first-bedroom-one-wardrobe-0');
    expect(migrateContent(loaded.value)).toEqual({ ok: true, value: { name: loaded.value.name, houseVersion: loaded.value.houseVersion, wallColours: loaded.value.wallColours, floorFinishes: loaded.value.floorFinishes, furniture: loaded.value.furniture } });
    expect(loaded.value.floorFinishes).toEqual(content.floorFinishes);
    expect(loaded.value.wallColours['first-bedrooms-divider-0']).toBe('#ccddee');
    expect(loaded.value.wallColours['first-bedrooms-divider-1']).toBe('#aabbcc');
    expect(validateContent(loaded.value).ok).toBe(true);
    store.close(); store = new SqliteDesignStore(path);
    expect(store.get(design.id)).toEqual(loaded);
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});

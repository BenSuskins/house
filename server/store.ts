import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createDesign, failure, identifier } from '../src/domain/editor';
import { validateContent } from '../src/domain/validation';
import type { Design, DesignContent, DesignSummary, Result } from '../src/domain/types';

export interface DesignStore {
  list(): Result<DesignSummary[]>;
  get(id: string): Result<Design>;
  create(content: unknown): Result<Design>;
  update(id: string, revision: number, content: unknown): Result<Design>;
  remove(id: string, revision: number): Result<null>;
  healthy(): boolean;
  close(): void;
}
const storedDesign = (content: DesignContent): Design => ({ ...content, id: identifier(), revision: 1, updatedAt: new Date().toISOString() });
const summary = ({ id, name, revision, updatedAt }: Design): DesignSummary => ({ id, name, revision, updatedAt });

export class MemoryDesignStore implements DesignStore {
  private designs = new Map<string, Design>();
  constructor() { const initial = this.create(createDesign('Reference layout')); if (!initial.ok) throw new Error(initial.error.message); }
  list(): Result<DesignSummary[]> { return { ok: true, value: [...this.designs.values()].map(summary).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)) }; }
  get(id: string): Result<Design> { const design = this.designs.get(id); return design ? { ok: true, value: structuredClone(design) } : failure('not-found', 'The design does not exist.'); }
  create(value: unknown): Result<Design> {
    const validated = validateContent(value);
    if (!validated.ok) return validated;
    const design = storedDesign(validated.value);
    this.designs.set(design.id, structuredClone(design));
    return { ok: true, value: design };
  }
  update(id: string, revision: number, value: unknown): Result<Design> {
    const validated = validateContent(value);
    if (!validated.ok) return validated;
    const previous = this.designs.get(id);
    if (!previous) return failure('not-found', 'The design does not exist.');
    if (previous.revision !== revision) return failure('conflict', 'This design changed on another device.');
    const design = { ...validated.value, id, revision: revision + 1, updatedAt: new Date().toISOString() };
    this.designs.set(id, structuredClone(design));
    return { ok: true, value: design };
  }
  remove(id: string, revision: number): Result<null> {
    const previous = this.designs.get(id);
    if (!previous) return failure('not-found', 'The design does not exist.');
    if (previous.revision !== revision) return failure('conflict', 'This design changed on another device.');
    this.designs.delete(id); return { ok: true, value: null };
  }
  healthy() { return true; }
  close() {}
}

type DatabaseRow = { id: string; revision: number; updated_at: string; content: string };
const fromRow = (row: DatabaseRow): Design => ({ ...JSON.parse(row.content), id: row.id, revision: row.revision, updatedAt: row.updated_at });

export class SqliteDesignStore implements DesignStore {
  private database: Database.Database;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.database = new Database(path);
    this.database.pragma('journal_mode = WAL');
    this.database.pragma('busy_timeout = 5000');
    this.database.exec('CREATE TABLE IF NOT EXISTS designs (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, updated_at TEXT NOT NULL, content TEXT NOT NULL); CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);');
    this.database.transaction(() => {
      if (!this.database.prepare('SELECT value FROM metadata WHERE key = ?').get('seeded')) {
        if (!(this.database.prepare('SELECT id FROM designs LIMIT 1').get())) {
          const initial = this.create(createDesign('Reference layout'));
          if (!initial.ok) throw new Error(initial.error.message);
        }
        this.database.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('seeded', '1');
      }
    })();
  }
  private access<Value>(operation: () => Result<Value>): Result<Value> { try { return operation(); } catch { return failure('storage', 'The server cannot access the database.'); } }
  list(): Result<DesignSummary[]> { return this.access(() => ({ ok: true, value: (this.database.prepare('SELECT * FROM designs ORDER BY updated_at DESC, id').all() as DatabaseRow[]).map((row) => summary(fromRow(row))) })); }
  get(id: string): Result<Design> { return this.access(() => { const row = this.database.prepare('SELECT * FROM designs WHERE id = ?').get(id) as DatabaseRow | undefined; return row ? { ok: true, value: fromRow(row) } : failure('not-found', 'The design does not exist.'); }); }
  create(value: unknown): Result<Design> {
    const validated = validateContent(value);
    if (!validated.ok) return validated;
    return this.access(() => {
      const design = storedDesign(validated.value);
      this.database.prepare('INSERT INTO designs (id, revision, updated_at, content) VALUES (?, ?, ?, ?)').run(design.id, design.revision, design.updatedAt, JSON.stringify(validated.value));
      return { ok: true, value: design };
    });
  }
  update(id: string, revision: number, value: unknown): Result<Design> {
    const validated = validateContent(value);
    if (!validated.ok) return validated;
    return this.access(() => this.database.transaction((): Result<Design> => {
      const previous = this.get(id);
      if (!previous.ok) return previous;
      if (previous.value.revision !== revision) return failure('conflict', 'This design changed on another device.');
      const updatedAt = new Date().toISOString();
      this.database.prepare('UPDATE designs SET revision = ?, updated_at = ?, content = ? WHERE id = ? AND revision = ?').run(revision + 1, updatedAt, JSON.stringify(validated.value), id, revision);
      return { ok: true, value: { ...validated.value, id, revision: revision + 1, updatedAt } };
    })());
  }
  remove(id: string, revision: number): Result<null> {
    return this.access(() => this.database.transaction((): Result<null> => {
      const previous = this.get(id);
      if (!previous.ok) return previous;
      if (previous.value.revision !== revision) return failure('conflict', 'This design changed on another device.');
      this.database.prepare('DELETE FROM designs WHERE id = ? AND revision = ?').run(id, revision);
      return { ok: true, value: null };
    })());
  }
  healthy() { try { return !!this.database.prepare('SELECT 1').get(); } catch { return false; } }
  close() { this.database.close(); }
}

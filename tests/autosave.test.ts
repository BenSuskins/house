import { afterEach, expect, it, vi } from 'vitest';
import { createAutosave, type Draft, type DraftStorage } from '../src/saving/autosave';
import { createDesign } from '../src/domain/editor';
import type { Design, Result } from '../src/domain/types';
import { MemoryDesignStore } from '../server/store';

class Drafts implements DraftStorage {
  entries = new Map<string, Draft>();
  read(id: string) { return this.entries.get(id); }
  write(draft: Draft) { this.entries.set(draft.design.id, structuredClone(draft)); return true; }
  clear(id: string) { this.entries.delete(id); }
}
afterEach(() => vi.useRealTimers());

it('reports unavailable draft storage and still saves the current changes to the server', async () => {
  const initial = { ...createDesign('Initial'), revision: 1 };
  const unavailable: DraftStorage = { read: () => undefined, write: () => false, clear: () => {} };
  let received: Design | undefined;
  const saving = createAutosave(initial, async (design, revision) => {
    received = design;
    return { ok: true, value: { ...design, revision: revision + 1 } };
  }, unavailable);
  saving.edit({ ...initial, name: 'Keep the page open' });
  expect(saving.status()).toMatchObject({ phase: 'pending', draftAvailable: false });
  await saving.flush();
  expect(received?.name).toBe('Keep the page open');
  expect(saving.status().phase).toBe('saved');
  saving.dispose();
});

it('waits 750 ms, serializes writes, and retains newer edits until their own save completes', async () => {
  vi.useFakeTimers();
  const initial = { ...createDesign('Initial'), revision: 1 };
  const drafts = new Drafts();
  const requests: { design: Design; revision: number; resolve: (value: Result<Design>) => void }[] = [];
  const saving = createAutosave(initial, (design, revision) => new Promise((resolve) => requests.push({ design, revision, resolve })), drafts);
  saving.edit({ ...initial, name: 'First edit' });
  await vi.advanceTimersByTimeAsync(749);
  expect(requests).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(1);
  expect(requests).toHaveLength(1);
  saving.edit({ ...initial, name: 'Second edit' });
  await vi.advanceTimersByTimeAsync(750);
  expect(requests).toHaveLength(1);
  requests[0].resolve({ ok: true, value: { ...requests[0].design, revision: 2 } });
  await vi.advanceTimersByTimeAsync(0);
  expect(drafts.read(initial.id)?.design.name).toBe('Second edit');
  expect(requests).toHaveLength(2);
  expect(requests[1]).toMatchObject({ revision: 2, design: { name: 'Second edit' } });
  requests[1].resolve({ ok: true, value: { ...requests[1].design, revision: 3 } });
  await saving.flush();
  expect(saving.status().phase).toBe('saved');
  expect(drafts.read(initial.id)).toBeUndefined();
  saving.dispose();
});

it('retains a failed save and retries the same revision', async () => {
  vi.useFakeTimers();
  const initial = { ...createDesign('Initial'), revision: 1 };
  const drafts = new Drafts();
  const revisions: number[] = [];
  const saving = createAutosave(initial, async (design, revision) => {
    revisions.push(revision);
    return revisions.length === 1
      ? { ok: false, error: { code: 'network', message: 'Offline' } }
      : { ok: true, value: { ...design, revision: revision + 1 } };
  }, drafts);
  saving.edit({ ...initial, name: 'Keep this edit' });
  await vi.advanceTimersByTimeAsync(750);
  expect(saving.status().phase).toBe('error');
  expect(drafts.read(initial.id)?.design.name).toBe('Keep this edit');
  await vi.advanceTimersByTimeAsync(1000);
  expect(revisions).toEqual([1, 1]);
  expect(saving.status().phase).toBe('saved');
  expect(drafts.read(initial.id)).toBeUndefined();
  saving.dispose();
});

it('stops saves on a conflict and preserves later edits as a draft', async () => {
  vi.useFakeTimers();
  const initial = { ...createDesign('Initial'), revision: 1 };
  const drafts = new Drafts();
  let requestCount = 0;
  const saving = createAutosave(initial, async () => {
    requestCount += 1;
    return { ok: false, error: { code: 'conflict', message: 'Another device changes this design.' } };
  }, drafts);
  saving.edit({ ...initial, name: 'Local edit' });
  await vi.advanceTimersByTimeAsync(750);
  saving.edit({ ...initial, name: 'Another local edit' });
  saving.retry();
  await saving.flush();
  await vi.advanceTimersByTimeAsync(30000);
  expect(requestCount).toBe(1);
  expect(saving.status().phase).toBe('conflict');
  expect(drafts.read(initial.id)).toMatchObject({ baseRevision: 1, design: { name: 'Another local edit' } });
  saving.dispose();
});

it('saves an undo that occurs during an active request', async () => {
  vi.useFakeTimers();
  const initial = { ...createDesign('Initial'), revision: 1 };
  const drafts = new Drafts();
  const requests: { design: Design; revision: number; resolve: (value: Result<Design>) => void }[] = [];
  const saving = createAutosave(initial, (design, revision) => new Promise((resolve) => requests.push({ design, revision, resolve })), drafts);
  saving.edit({ ...initial, name: 'Temporary edit' });
  await vi.advanceTimersByTimeAsync(750);
  saving.edit(initial);
  expect(drafts.read(initial.id)?.design.name).toBe('Initial');
  requests[0].resolve({ ok: true, value: { ...requests[0].design, revision: 2 } });
  await vi.advanceTimersByTimeAsync(750);
  expect(requests[1]).toMatchObject({ revision: 2, design: { name: 'Initial' } });
  requests[1].resolve({ ok: true, value: { ...requests[1].design, revision: 3 } });
  await saving.flush();
  expect(drafts.read(initial.id)).toBeUndefined();
  saving.dispose();
});

it('keeps the draft after disposal and recovers it against the current revision', async () => {
  vi.useFakeTimers();
  const initial = { ...createDesign('Initial'), revision: 1 };
  const drafts = new Drafts();
  let saved: Design | undefined;
  const transport = async (design: Design, revision: number): Promise<Result<Design>> => {
    saved = { ...design, revision: revision + 1 };
    return { ok: true, value: saved };
  };
  const first = createAutosave(initial, transport, drafts);
  first.edit({ ...initial, name: 'Recovered edit' });
  first.dispose();
  await vi.advanceTimersByTimeAsync(750);
  expect(saved).toBeUndefined();
  const recovered = drafts.read(initial.id)!;
  expect(recovered.baseRevision).toBe(initial.revision);
  const second = createAutosave(initial, transport, drafts);
  second.edit(recovered.design);
  await second.flush();
  expect(saved).toMatchObject({ name: 'Recovered edit', revision: 2 });
  expect(drafts.read(initial.id)).toBeUndefined();
  second.dispose();
});

it('prevents two sessions from overwriting each other through the store contract', async () => {
  const store = new MemoryDesignStore();
  const created = store.create(createDesign('Shared'));
  if (!created.ok) throw new Error(created.error.message);
  const initial = created.value;
  const firstDrafts = new Drafts();
  const secondDrafts = new Drafts();
  const transport = async (design: Design, revision: number) => store.update(design.id, revision, design);
  const first = createAutosave(initial, transport, firstDrafts);
  const second = createAutosave(initial, transport, secondDrafts);
  first.edit({ ...initial, name: 'First device' });
  await first.flush();
  second.edit({ ...initial, name: 'Second device' });
  await second.flush();
  expect(second.status().phase).toBe('conflict');
  expect(store.get(initial.id)).toMatchObject({ ok: true, value: { name: 'First device', revision: 2 } });
  expect(secondDrafts.read(initial.id)?.design.name).toBe('Second device');
  first.dispose(); second.dispose(); store.close();
});

import type { Design, Result } from '../domain/types';

export type Draft = { design: Design; baseRevision: number };
export interface DraftStorage { read(id: string): Draft | undefined; write(draft: Draft): boolean; clear(id: string): void }
export type SaveStatus = { phase: 'saved' | 'pending' | 'saving' | 'error' | 'conflict'; message?: string; draftAvailable: boolean };
export type SaveTransport = (design: Design, revision: number) => Promise<Result<Design>>;
export const contentKey = ({ name, houseVersion, wallColours, floorFinishes, furniture }: Design) => JSON.stringify({ name, houseVersion, wallColours, floorFinishes, furniture });

export function createAutosave(initial: Design, transport: SaveTransport, drafts: DraftStorage, onStatus: (status: SaveStatus) => void = () => {}, onSaved: (design: Design) => void = () => {}) {
  let latest = initial;
  let revision = initial.revision;
  let savedKey = contentKey(initial);
  let state: SaveStatus = { phase: 'saved', draftAvailable: true };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> | undefined;
  let ready = false;
  let disposed = false;
  let retryDelay = 1000;
  const dirty = () => contentKey(latest) !== savedKey;
  const notify = (phase: SaveStatus['phase'], message?: string) => { state = { ...state, phase, message }; if (!disposed) onStatus(state); };
  const persistDraft = () => { state = { ...state, draftAvailable: drafts.write({ design: latest, baseRevision: revision }) }; };
  const cancelTimer = () => { clearTimeout(timer); timer = undefined; };
  const schedule = (delay: number) => { cancelTimer(); timer = setTimeout(() => { timer = undefined; ready = true; void send(); }, delay); };

  function send(): Promise<void> {
    if (disposed || state.phase === 'conflict') return Promise.resolve();
    if (running) return running;
    if (!dirty()) { notify('saved'); return Promise.resolve(); }
    cancelTimer(); ready = false;
    const submitted = structuredClone(latest);
    const submittedRevision = revision;
    notify('saving');
    running = (async () => {
      let result: Result<Design>;
      try { result = await transport(submitted, submittedRevision); }
      catch { result = { ok: false, error: { code: 'network', message: 'The server is unavailable. Keep this page open and retry.' } }; }
      running = undefined;
      if (disposed) return;
      if (!result.ok) {
        notify(['conflict', 'not-found'].includes(result.error.code) ? 'conflict' : 'error', result.error.message);
        if (state.phase === 'error' && ['network', 'storage'].includes(result.error.code)) { schedule(retryDelay); retryDelay = Math.min(retryDelay * 2, 30000); }
        return;
      }
      revision = result.value.revision; savedKey = contentKey(submitted); retryDelay = 1000;
      onSaved(result.value);
      if (dirty()) {
        persistDraft(); notify('pending');
        if (ready) void send(); else if (!timer) schedule(750);
      } else { cancelTimer(); drafts.clear(initial.id); notify('saved'); }
    })();
    return running;
  }

  return {
    edit(design: Design) {
      if (disposed || design.id !== initial.id) return;
      latest = design;
      if (dirty() || running) persistDraft();
      if (state.phase === 'conflict') return;
      if (!dirty() && !running) { cancelTimer(); drafts.clear(initial.id); notify('saved'); return; }
      notify(running ? 'saving' : 'pending'); schedule(750);
    },
    async flush() {
      cancelTimer(); ready = true;
      do { await send(); } while (!disposed && dirty() && state.phase !== 'error' && state.phase !== 'conflict');
      return state;
    },
    retry() { retryDelay = 1000; if (state.phase !== 'conflict') { ready = true; void send(); } },
    status: () => state,
    revision: () => revision,
    dispose() { disposed = true; cancelTimer(); },
  };
}

export const browserDrafts: DraftStorage = {
  read(id) { try { const value = localStorage.getItem(`house-draft-${id}`); return value ? JSON.parse(value) : undefined; } catch { return undefined; } },
  write(draft) { try { localStorage.setItem(`house-draft-${draft.design.id}`, JSON.stringify(draft)); return true; } catch { return false; } },
  clear(id) { try { localStorage.removeItem(`house-draft-${id}`); } catch { /* A failed cleanup must not interrupt a confirmed server save. */ } },
};

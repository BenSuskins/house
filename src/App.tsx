import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Home, Search, Plus, Armchair, Layers, FolderOpen, Undo2, Redo2, RotateCcw, ZoomIn, ZoomOut, Magnet, PanelLeftClose, Copy, Trash2, Check, CloudOff, LoaderCircle, X, ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import { api } from './api';
import { catalogue } from './domain/catalogue';
import { house } from './domain/house';
import { createHistory, editDesign, recordEdit, undo, redo, type Edit, type History } from './domain/editor';
import { migrateContent } from './domain/migration';
import { browserDrafts, contentKey, createAutosave, type Draft, type SaveStatus } from './saving/autosave';
import type { Design, DesignSummary, FloorId, HouseModel, Point, Selection } from './domain/types';
import { Inspector } from './components/Inspector';
import { FurnitureThumbnail } from './components/FurnitureThumbnail';

type Panel = 'furniture' | 'rooms' | 'designs';
const Scene = lazy(() => import('./components/Scene').then((module) => ({ default: module.Scene })));
const panelNames = { furniture: 'Furniture', rooms: 'Rooms', designs: 'Saved designs' };
const remember = (id: string) => { try { localStorage.setItem('house-last-design', id); } catch { /* The server remains the source of saved designs. */ } };
const remembered = () => { try { return localStorage.getItem('house-last-design'); } catch { return null; } };

export function App() {
  const [history, setHistory] = useState<History | null>(null);
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [floorId, setFloorId] = useState<FloorId>('ground');
  const [view, setView] = useState<'3d' | 'top'>('3d');
  const [walls, setWalls] = useState<'cutaway' | 'full' | 'hidden'>('cutaway');
  const [snap, setSnap] = useState(true);
  const [selection, setSelection] = useState<Selection>(null);
  const [preview, setPreview] = useState<Design | null>(null);
  const [tab, setTab] = useState<Panel>('furniture');
  const [sheet, setSheet] = useState<Panel | 'properties' | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All categories');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const [zoomToken, setZoomToken] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ phase: 'saved', draftAvailable: true });
  const [recovery, setRecovery] = useState<Draft | null>(null);
  const [name, setName] = useState('');
  const saving = useRef<ReturnType<typeof createAutosave> | null>(null);
  const floor = house.floors.find((floor) => floor.id === floorId)!;

  const install = useCallback((design: Design) => {
    saving.current?.dispose();
    saving.current = createAutosave(design, (content, revision) => api<Design>(`/api/designs/${content.id}`, 'PUT', { ...content, revision }), browserDrafts, setSaveStatus, (saved) => setDesigns((previous) => previous.map((summary) => summary.id === saved.id ? { id: saved.id, name: saved.name, revision: saved.revision, updatedAt: saved.updatedAt } : summary)));
    setSaveStatus({ phase: 'saved', draftAvailable: true });
    setHistory(createHistory(design)); setName(design.name); setSelection(null); setPreview(null); setSheet(null); remember(design.id);
    const draft = browserDrafts.read(design.id);
    const migrated = draft?.design ? migrateContent(draft.design) : undefined;
    const recoveredDesign = draft && migrated?.ok ? { ...draft.design, ...migrated.value } : undefined;
    if (draft?.design?.id === design.id && Number.isInteger(draft.baseRevision) && recoveredDesign && contentKey(recoveredDesign) !== contentKey(design)) setRecovery({ ...draft, design: recoveredDesign });
    else { setRecovery(null); browserDrafts.clear(design.id); }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [listed, model] = await Promise.all([api<DesignSummary[]>('/api/designs'), api<HouseModel>('/api/house')]);
      if (!active) return;
      if (!listed.ok || !model.ok) { setError(!listed.ok ? listed.error.message : 'The house model is unavailable.'); setLoading(false); return; }
      if (model.value.version !== house.version) { setError('Reload the app to use the current house model.'); setLoading(false); return; }
      setDesigns(listed.value);
      const first = listed.value.find((design) => design.id === remembered()) ?? listed.value[0];
      if (first) {
        const loaded = await api<Design>(`/api/designs/${first.id}`);
        if (!active) return;
        if (loaded.ok) install(loaded.value); else setError(loaded.error.message);
      }
      setLoading(false);
    })();
    return () => { active = false; saving.current?.dispose(); };
  }, [install]);
  useEffect(() => { if (history && !recovery) { saving.current?.edit(history.present); setName(history.present.name); } }, [history?.present, recovery]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (saving.current && (saving.current.status().phase !== 'saved' || recovery)) { event.preventDefault(); event.returnValue = ''; } };
    const online = () => saving.current?.retry();
    window.addEventListener('beforeunload', beforeUnload); window.addEventListener('online', online);
    return () => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('online', online); };
  }, [recovery]);

  const apply = useCallback((edit: Edit): Design | undefined => {
    if (!history) return;
    if (recovery) { setToast('Recover or discard the local draft before making changes.'); return; }
    const result = editDesign(history.present, edit);
    if (!result.ok) { setToast(result.error.message); return; }
    setHistory(recordEdit(history, result.value)); setPreview(null); return result.value;
  }, [history, recovery]);
  const select = useCallback((selected: Selection) => { setSelection(selected); setSheet(selected ? 'properties' : null); setPreview(null); }, []);
  const move = useCallback((id: string, position: Point, commit: boolean) => {
    if (!history || recovery) return;
    const result = editDesign(history.present, { type: 'update-furniture', itemId: id, patch: { position }, snap });
    if (commit) { setPreview(null); if (result.ok) setHistory(recordEdit(history, result.value)); else setToast(result.error.message); }
    else if (result.ok) setPreview(result.value);
  }, [history, snap, recovery]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable || !history || recovery || busy) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); setHistory(event.shiftKey ? redo(history) : undo(history)); setPreview(null); return; }
      if (event.key === 'Escape') { select(null); return; }
      if (selection?.type !== 'furniture') return;
      const item = history.present.furniture.find((item) => item.id === selection.id);
      if (!item) return;
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); apply({ type: 'delete-furniture', itemId: item.id }); select(null); }
      const movement: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const direction = movement[event.key];
      if (direction) { event.preventDefault(); const step = event.shiftKey ? 0.5 : 0.1; apply({ type: 'update-furniture', itemId: item.id, patch: { position: { x: item.position.x + direction[0] * step, z: item.position.z + direction[1] * step } } }); }
    };
    window.addEventListener('keydown', keyboard); return () => window.removeEventListener('keydown', keyboard);
  }, [history, selection, apply, select, recovery, busy]);

  const refreshDesigns = async () => { const listed = await api<DesignSummary[]>('/api/designs'); if (listed.ok) setDesigns(listed.value); else setToast(listed.error.message); return listed; };
  const openDesign = async (id: string) => {
    if (busy) return;
    setBusy(true); await saving.current?.flush();
    const loaded = await api<Design>(`/api/designs/${id}`);
    if (loaded.ok) { install(loaded.value); await refreshDesigns(); } else setToast(loaded.error.message);
    setBusy(false);
  };
  const newDesign = async () => {
    if (busy) return;
    setBusy(true); await saving.current?.flush();
    const created = await api<Design>('/api/designs', 'POST', { name: 'Untitled layout' });
    if (created.ok) { await refreshDesigns(); install(created.value); setError(''); } else setToast(created.error.message);
    setBusy(false);
  };
  const copyDesign = async (recovered = false) => {
    if (!history || busy) return;
    setBusy(true);
    if (!recovered) await saving.current?.flush();
    const source = recovered && recovery ? recovery.design : history.present;
    const created = await api<Design>('/api/designs', 'POST', { content: { ...source, name: `${source.name}${recovered ? ' recovered' : ' copy'}`.slice(0, 80) } });
    if (created.ok) { if (recovered || saveStatus.phase === 'conflict') browserDrafts.clear(source.id); await refreshDesigns(); install(created.value); setToast('A new design contains your changes.'); } else setToast(created.error.message);
    setBusy(false);
  };
  const deleteDesign = async (design: DesignSummary) => {
    if (busy || !window.confirm(`Delete “${design.name}”? This removes the saved design from the server.`)) return;
    setBusy(true);
    if (history?.present.id === design.id) await saving.current?.flush();
    const revision = history?.present.id === design.id ? saving.current?.revision() ?? design.revision : design.revision;
    const removed = await api<null>(`/api/designs/${design.id}?revision=${revision}`, 'DELETE');
    if (removed.ok) {
      browserDrafts.clear(design.id);
      const listed = await refreshDesigns();
      if (history?.present.id === design.id) {
        saving.current?.dispose(); saving.current = null;
        if (listed.ok && listed.value[0]) { const loaded = await api<Design>(`/api/designs/${listed.value[0].id}`); if (loaded.ok) install(loaded.value); else setError(loaded.error.message); }
        else { setHistory(null); setSelection(null); setSheet(null); }
      }
    } else setToast(removed.error.message);
    setBusy(false);
  };
  const discardRecovery = () => { if (history) browserDrafts.clear(history.present.id); setRecovery(null); };
  const recoverDraft = () => { if (!history || !recovery) return; setHistory(createHistory({ ...recovery.design, revision: history.present.revision })); setRecovery(null); };
  const loadServerVersion = async () => {
    if (!history) return;
    setBusy(true); const loaded = await api<Design>(`/api/designs/${history.present.id}`);
    if (loaded.ok) { browserDrafts.clear(loaded.value.id); install(loaded.value); } else setToast(loaded.error.message);
    setBusy(false);
  };

  const addFurniture = (templateId: string) => {
    const selectedRoom = selection?.type === 'room' ? floor.rooms.find((room) => room.id === selection.id) : undefined;
    const room = selectedRoom ?? floor.rooms.find((room) => room.id.includes(floorId === 'ground' ? 'lounge' : 'bedroom-one'))!;
    const x = room.polygon.reduce((sum, point) => sum + point.x, 0) / room.polygon.length;
    const z = room.polygon.reduce((sum, point) => sum + point.z, 0) / room.polygon.length;
    const design = apply({ type: 'add-furniture', templateId, floorId, position: { x, z } });
    if (design) select({ type: 'furniture', id: design.furniture.at(-1)!.id });
  };
  const changeFloor = (id: FloorId) => { setFloorId(id); setSelection(null); setSheet(null); setPreview(null); setResetToken((value) => value + 1); };
  const inspector = history && selection ? <Inspector key={`${selection.type}-${selection.id}`} design={history.present} selection={selection} floorId={floorId} apply={apply} select={select} close={() => select(null)} /> : null;
  const cataloguePanel = <>
    <div className="catalogue-filters"><label className="search-field"><Search size={16} /><input aria-label="Search furniture" placeholder="Search furniture…" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select aria-label="Furniture category" value={category} onChange={(event) => setCategory(event.target.value)}>{['All categories', ...new Set(catalogue.map((template) => template.category))].map((category) => <option key={category}>{category}</option>)}</select></div>
    <div className="catalogue-list">{catalogue.filter((template) => template.name.toLowerCase().includes(search.toLowerCase()) && (category === 'All categories' || template.category === category)).map((template) => <button className="catalogue-item" key={template.id} aria-label={`Add ${template.name}`} onClick={() => addFurniture(template.id)}><div className="thumbnail"><FurnitureThumbnail type={template.id} colour={template.colour} /></div><span className="furniture-info"><strong>{template.name}</strong><span>{template.dimensions.width.toFixed(2)} × {template.dimensions.depth.toFixed(2)} m</span></span><Plus className="add-icon" size={16} /></button>)}</div>
    {!catalogue.some((template) => template.name.toLowerCase().includes(search.toLowerCase()) && (category === 'All categories' || template.category === category)) && <p className="empty-list">No furniture matches your search.</p>}
  </>;
  const roomsPanel = <div className="rooms-panel"><p className="eyebrow">{floor.name}</p><h2>Room finishes</h2><p className="panel-description">Select a room to change its floor or paint a wall.</p><div className="room-list">{floor.rooms.map((room) => <button key={room.id} aria-label={`Select room ${room.name}`} className={selection?.type === 'room' && selection.id === room.id ? 'active' : ''} onClick={() => select({ type: 'room', id: room.id })}><Layers size={17} /><span><strong>{room.name}</strong><small>{room.dimensions ?? 'Estimated dimensions'}</small></span><ArrowUpRight size={15} /></button>)}</div>
    <label className="select-label all-wall-faces">Select any wall face<select aria-label="Select any wall face" value={selection?.type === 'wall' ? selection.id : ''} onChange={(event) => { if (event.target.value) select({ type: 'wall', id: event.target.value }); }}><option value="">Choose a wall face…</option>{floor.walls.flatMap((wall) => wall.faces.map((face) => <option key={face.id} value={face.id}>{wall.id.replace(`${floorId}-`, '').replaceAll('-', ' ')} · {face.roomId ? floor.rooms.find((room) => room.id === face.roomId)?.name : 'Outer side'}</option>))}</select></label>
    <h3 className="floor-furniture-title">Furniture on this floor</h3><div className="surface-list">{history?.present.furniture.filter((item) => item.floorId === floorId).map((item, index) => { const template = catalogue.find((template) => template.id === item.templateId)!; return <button key={item.id} aria-label={`Select ${template.name} ${index + 1}`} onClick={() => select({ type: 'furniture', id: item.id })}><span className="surface-dot" style={{ background: item.colour }} /><span>{template.name}</span><ArrowUpRight size={14} /></button>; })}</div>
  </div>;
  const designsPanel = <div className="designs-panel"><div className="panel-heading"><div><p className="eyebrow">On your home server</p><h2>Saved designs</h2></div><button className="icon-button" aria-label="Refresh saved designs" onClick={() => void refreshDesigns()}><RotateCcw size={16} /></button></div><p className="panel-description">Your collection is shared across devices.</p><button className="primary-button full-width" disabled={busy} onClick={() => void newDesign()}><Plus size={16} />New design</button><div className="design-list">{designs.map((design) => <div key={design.id} className={`design-card ${history?.present.id === design.id ? 'active' : ''}`}><button className="design-open" aria-label={`Open ${design.name}`} disabled={busy} onClick={() => void openDesign(design.id)}><div className="design-preview"><Layers size={28} strokeWidth={1.1} /></div><strong>{design.name}</strong><span>{history?.present.id === design.id ? 'Current design' : new Date(design.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></button><button className="icon-button design-delete" aria-label={`Delete design ${design.name}`} disabled={busy} onClick={() => void deleteDesign(design)}><Trash2 size={15} /></button></div>)}</div></div>;
  const panels = { furniture: cataloguePanel, rooms: roomsPanel, designs: designsPanel };
  const statusText = { saved: 'Saved', pending: 'Changes pending', saving: 'Saving…', error: 'Save failed', conflict: 'Design conflict' }[saveStatus.phase];

  if (loading) return <div className="loading-screen"><Home size={32} strokeWidth={1.25} /><h1>Opening your house</h1><LoaderCircle className="spin" size={21} /></div>;
  if (!history || error) return <div className="loading-screen"><Home size={32} strokeWidth={1.25} /><h1>{error ? 'Your house is unavailable' : 'A fresh start'}</h1><p>{error || 'Create a design to furnish your house.'}</p><button className="primary-button" onClick={() => error ? window.location.reload() : void newDesign()}>{error ? 'Try again' : 'Create a design'}</button>{toast && <p role="alert">{toast}</p>}</div>;
  return <div className="app">
    <header className="app-header"><a className="brand" href="/" aria-label="House home"><Home size={21} strokeWidth={1.6} /><span>House</span></a><span className="header-divider" /><div className="design-title"><input aria-label="Design name" disabled={busy || Boolean(recovery)} value={name} maxLength={80} onChange={(event) => setName(event.target.value)} onBlur={() => { if (!apply({ type: 'rename', name })) setName(history.present.name); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /><span className="title-note">House editor</span></div><div className={`save-status ${saveStatus.phase}`} role="status" aria-live="polite" data-testid="save-status">{saveStatus.phase === 'saved' ? <Check size={15} /> : ['pending', 'saving'].includes(saveStatus.phase) ? <LoaderCircle className="spin" size={15} /> : <CloudOff size={15} />}<span>{statusText}</span></div><button className="primary-button copy-design" aria-label="Save a copy" disabled={busy || Boolean(recovery)} onClick={() => void copyDesign()}><Copy size={15} /><span>Save a copy</span></button></header>
    <div className="toolbar"><button className="icon-button sidebar-toggle" aria-label="Toggle furniture panel" aria-pressed={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)}><PanelLeftClose size={18} /></button><div className="floor-switch" aria-label="House floor">{house.floors.map((floor) => <button key={floor.id} aria-pressed={floorId === floor.id} onClick={() => changeFloor(floor.id)}>{floor.name}</button>)}</div><div className="toolbar-divider" /><div className="view-switch"><button aria-pressed={view === '3d'} onClick={() => setView('3d')}>3D</button><button aria-pressed={view === 'top'} onClick={() => setView('top')}>Top</button></div><div className="history-controls"><button className="icon-button" aria-label="Undo" title="Undo · ⌘Z" disabled={busy || !history.past.length || Boolean(recovery)} onClick={() => { setHistory(undo(history)); setPreview(null); }}><Undo2 size={18} /></button><button className="icon-button" aria-label="Redo" title="Redo · ⌘⇧Z" disabled={busy || !history.future.length || Boolean(recovery)} onClick={() => { setHistory(redo(history)); setPreview(null); }}><Redo2 size={18} /></button></div><label className="wall-control">Walls<select aria-label="Wall visibility" value={walls} onChange={(event) => setWalls(event.target.value as typeof walls)}><option value="cutaway">Cutaway</option><option value="full">Full</option><option value="hidden">Hidden</option></select></label><button className={`tool-button snap-control ${snap ? 'active' : ''}`} aria-pressed={snap} onClick={() => setSnap(!snap)}><Magnet size={16} /><span>Snap</span></button><span className="toolbar-note">An approximate plan of your home</span></div>
    {(recovery || saveStatus.phase === 'conflict' || saveStatus.phase === 'error' || !saveStatus.draftAvailable && saveStatus.phase !== 'saved') && <div className="recovery-banner" role="alert">
      {!saveStatus.draftAvailable && <span>Browser draft storage is unavailable. Keep this page open until the save completes.</span>}
      {recovery ? <><span>An unsaved draft remains on this device.</span><button disabled={busy} onClick={() => recovery.baseRevision === history.present.revision ? recoverDraft() : void copyDesign(true)}>{recovery.baseRevision === history.present.revision ? 'Recover draft' : 'Recover as new design'}</button><button onClick={discardRecovery}>Discard draft</button></> : saveStatus.phase === 'conflict' ? <><span>{saveStatus.message}</span><button disabled={busy} onClick={() => void copyDesign()}>Save as new design</button><button disabled={busy} onClick={() => void loadServerVersion()}>Load server version</button></> : <>{saveStatus.message && <span>{saveStatus.message}</span>}{saveStatus.phase === 'error' && <button onClick={() => saving.current?.retry()}>Retry save</button>}</>}
    </div>}
    <main className={`workspace ${sheet ? 'sheet-open' : ''}`} inert={busy || Boolean(recovery)}>
      {sidebarOpen && <aside className="sidebar"><nav className="panel-tabs" aria-label="Editor panels">{(['furniture', 'rooms', 'designs'] as const).map((panel) => <button key={panel} aria-pressed={tab === panel} onClick={() => setTab(panel)}>{panel === 'designs' ? 'Designs' : panelNames[panel]}</button>)}</nav><div className="panel-scroll">{panels[tab]}</div><div className="sidebar-footer"><span className="local-indicator" />Private · saved at home</div></aside>}
      <section className="stage" aria-label={`${floor.name} ${view === '3d' ? '3D' : 'top'} view`}>
        <Suspense fallback={<div className="scene-error"><LoaderCircle className="spin" size={24} /><p>Load the house view.</p></div>}><Scene design={preview ?? history.present} floorId={floorId} view={view} walls={walls} selection={selection} resetToken={resetToken} zoomToken={zoomToken} select={select} move={move} cancelMove={() => setPreview(null)} /></Suspense>
        <div className="stage-caption"><span className="eyebrow">{floor.name}</span><h1>Plan your space.</h1><p>{view === '3d' ? 'Rotate the view. Select a wall, floor, or furniture item.' : 'Select a floor or furniture item to change it.'}</p></div>
        <div className="camera-tools"><button className="icon-button" aria-label="Zoom in" onClick={() => setZoomToken((value) => value + 1)}><ZoomIn size={18} /></button><button className="icon-button" aria-label="Zoom out" onClick={() => setZoomToken((value) => value - 1)}><ZoomOut size={18} /></button><span /><button className="icon-button" aria-label="Reset camera" onClick={() => setResetToken((value) => value + 1)}><RotateCcw size={17} /></button></div>
        <div className="stage-footer"><span>Approximate dimensions · metres</span><span className="gesture-hint">{view === '3d' ? 'Drag to rotate · pinch or scroll to zoom' : 'Drag to pan · pinch or scroll to zoom'}</span></div>
      </section>
      {inspector && <aside className="desktop-inspector">{inspector}</aside>}
      {sheet && <aside className="mobile-sheet"><div className="sheet-handle" /><div className="sheet-heading"><span>{sheet === 'properties' ? 'Properties' : panelNames[sheet]}</span><button className="icon-button" aria-label="Close mobile panel" onClick={() => setSheet(null)}><X size={17} /></button></div><div className="panel-scroll">{sheet === 'properties' ? inspector : panels[sheet]}</div></aside>}
    </main>
    <nav className="mobile-toolbar" aria-label="Mobile editor panels" inert={busy || Boolean(recovery)}>{[[Armchair, 'furniture', 'Furniture'], [Layers, 'rooms', 'Rooms'], [FolderOpen, 'designs', 'Designs']].map(([Icon, panel, label]) => { const Component = Icon as typeof Armchair; return <button key={String(panel)} aria-pressed={sheet === panel} onClick={() => { setSheet(sheet === panel ? null : panel as Panel); setTab(panel as Panel); }}><Component size={20} /><span>{String(label)}</span></button>; })}<button disabled={!selection} aria-pressed={sheet === 'properties'} onClick={() => setSheet(sheet === 'properties' ? null : 'properties')}><SlidersHorizontal size={20} /><span>Properties</span></button></nav>
    {toast && <div className="toast" role="alert">{toast}</div>}
  </div>;
}

import { Copy, Trash2, RotateCw, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, X, Paintbrush, Move } from 'lucide-react';
import { useEffect, useState } from 'react';
import { catalogue, paintColours } from '../domain/catalogue';
import { house, wallName } from '../domain/house';
import { wallOverlaps, type Edit } from '../domain/editor';
import type { Design, FloorId, Selection } from '../domain/types';

type InspectorProps = { design: Design; selection: Selection; floorId: FloorId; apply: (edit: Edit) => Design | undefined; select: (selection: Selection) => void; close: () => void };

export function ColourEditor({ colour, change, label = 'Colour' }: { colour: string; change: (colour: string) => void; label?: string }) {
  const [text, setText] = useState(colour);
  useEffect(() => setText(colour), [colour]);
  return <div className="colour-editor">
    <div className="swatches">{paintColours.map((paint) => <button key={paint} className={`swatch ${colour.toLowerCase() === paint ? 'active' : ''}`} style={{ backgroundColor: paint }} aria-label={`${label} ${paint}`} aria-pressed={colour.toLowerCase() === paint} onClick={() => change(paint)} />)}</div>
    <div className="colour-value"><input type="color" aria-label={label} value={colour} onChange={(event) => change(event.target.value)} /><input aria-label={`${label} hex`} value={text} maxLength={7} onChange={(event) => setText(event.target.value)} onBlur={() => { if (/^#[\da-f]{6}$/i.test(text)) change(text); else setText(colour); }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /></div>
  </div>;
}

function NumberControl({ label, value, change, step = 0.1, min }: { label: string; value: number; change: (value: number) => Design | undefined; step?: number; min?: number }) {
  const [text, setText] = useState(String(Math.round(value * 100) / 100));
  useEffect(() => setText(String(Math.round(value * 100) / 100)), [value]);
  const commit = () => { const number = Number(text); if (text.trim() === '' || !Number.isFinite(number) || !change(number)) setText(String(Math.round(value * 100) / 100)); };
  return <label className="number-control"><span>{label}</span><input type="number" aria-label={label} value={text} step={step} min={min} onChange={(event) => setText(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /></label>;
}

export function Inspector({ design, selection, floorId, apply, select, close }: InspectorProps) {
  const floor = house.floors.find((floor) => floor.id === floorId)!;
  const item = selection?.type === 'furniture' ? design.furniture.find((item) => item.id === selection.id) : undefined;
  const room = selection?.type === 'room' ? floor.rooms.find((room) => room.id === selection.id) : undefined;
  const face = selection?.type === 'wall' ? floor.walls.flatMap((wall) => wall.faces).find((face) => face.id === selection.id) : undefined;
  const template = catalogue.find((template) => template.id === item?.templateId);
  const title = template?.name ?? room?.name ?? (face?.roomId ? floor.rooms.find((room) => room.id === face.roomId)?.name : 'Wall face') ?? 'Wall face';
  const faces = floor.walls.flatMap((wall) => wall.faces.map((face) => ({ ...face, wallName: wallName(wall) })));
  return <div className="inspector-content" data-testid="inspector">
    <div className="panel-heading"><div><p className="eyebrow">{item ? 'Furniture' : face ? 'Wall finish' : 'Room finishes'}</p><h2>{title}</h2></div><button className="icon-button" aria-label="Close properties" onClick={close}><X size={18} /></button></div>
    {item && <>
      <p className="panel-description">Drag the selected item to move it. Use the fields below for precise changes.</p>
      {wallOverlaps(item).length > 0 && <p className="notice warning">This item overlaps a wall. You can keep this position.</p>}
      <section className="property-section"><h3><Move size={15} />Position <span>metres</span></h3><div className="fields two"><NumberControl label="Position X" value={item.position.x} change={(x) => apply({ type: 'update-furniture', itemId: item.id, patch: { position: { ...item.position, x } } })} /><NumberControl label="Position Z" value={item.position.z} change={(z) => apply({ type: 'update-furniture', itemId: item.id, patch: { position: { ...item.position, z } } })} /></div>
        <div className="nudge-controls">{[[ArrowLeft, -0.1, 0, 'Move left'], [ArrowUp, 0, -0.1, 'Move back'], [ArrowDown, 0, 0.1, 'Move forward'], [ArrowRight, 0.1, 0, 'Move right']].map(([Icon, x, z, label]) => { const Component = Icon as typeof ArrowLeft; return <button key={String(label)} className="icon-button" aria-label={String(label)} onClick={() => apply({ type: 'update-furniture', itemId: item.id, patch: { position: { x: item.position.x + Number(x), z: item.position.z + Number(z) } } })}><Component size={17} /></button>; })}</div>
      </section>
      <section className="property-section"><h3>Dimensions <span>metres</span></h3><div className="fields three">{(['width', 'depth', 'height'] as const).map((dimension) => <NumberControl key={dimension} label={dimension[0].toUpperCase() + dimension.slice(1)} value={item.dimensions[dimension]} min={0.01} step={0.05} change={(value) => apply({ type: 'update-furniture', itemId: item.id, patch: { dimensions: { ...item.dimensions, [dimension]: value } } })} />)}</div></section>
      <section className="property-section"><h3>Rotation <span>degrees</span></h3><div className="rotation-row"><NumberControl label="Rotation" value={item.rotation} step={15} change={(rotation) => apply({ type: 'update-furniture', itemId: item.id, patch: { rotation } })} /><button className="secondary-button" onClick={() => apply({ type: 'update-furniture', itemId: item.id, patch: { rotation: item.rotation + 90 } })}><RotateCw size={16} />Turn 90°</button></div></section>
      <section className="property-section"><h3><Paintbrush size={15} />Furniture colour</h3><ColourEditor colour={item.colour} label="Furniture colour" change={(colour) => apply({ type: 'update-furniture', itemId: item.id, patch: { colour } })} /></section>
      <div className="item-actions"><button className="secondary-button" onClick={() => apply({ type: 'duplicate-furniture', itemId: item.id })}><Copy size={16} />Duplicate item</button><button className="secondary-button destructive" onClick={() => { apply({ type: 'delete-furniture', itemId: item.id }); select(null); }}><Trash2 size={16} />Delete item</button></div>
    </>}
    {room && <>
      <p className="room-dimensions">{room.dimensions ?? 'Dimensions estimated from the reference plan'}{room.dimensions && room.estimated ? ' · estimated' : ''}</p>
      <section className="property-section"><h3>Floor finish</h3><div className="finish-options">{(['wood', 'carpet', 'tile'] as const).map((material) => <button key={material} className={design.floorFinishes[room.id].material === material ? 'active' : ''} aria-pressed={design.floorFinishes[room.id].material === material} onClick={() => apply({ type: 'finish-floor', roomId: room.id, finish: { ...design.floorFinishes[room.id], material } })}>{material[0].toUpperCase() + material.slice(1)}</button>)}</div><ColourEditor colour={design.floorFinishes[room.id].colour} label="Floor colour" change={(colour) => apply({ type: 'finish-floor', roomId: room.id, finish: { ...design.floorFinishes[room.id], colour } })} /></section>
      <section className="property-section"><h3>Paint a wall face</h3><p className="panel-description">Each side has its own colour.</p><div className="surface-list">{faces.filter((face) => face.roomId === room.id).map((face) => <button key={face.id} aria-label={`Paint ${face.wallName}`} onClick={() => select({ type: 'wall', id: face.id })}><span className="surface-dot" style={{ background: design.wallColours[face.id] }} /><span>{face.wallName}</span><span className="surface-arrow">→</span></button>)}</div></section>
    </>}
    {face && <>
      <p className="panel-description">{face.name}. The opposite side keeps its own colour.</p>
      <section className="property-section"><h3>Wall colour</h3><ColourEditor colour={design.wallColours[face.id]} label="Wall colour" change={(colour) => apply({ type: 'paint-wall', faceId: face.id, colour })} /></section>
      <label className="select-label">Wall face<select aria-label="Wall face" value={face.id} onChange={(event) => select({ type: 'wall', id: event.target.value })}>{faces.map((face) => <option key={face.id} value={face.id}>{face.wallName} · {face.roomId ? floor.rooms.find((room) => room.id === face.roomId)?.name : 'Outer side'}</option>)}</select></label>
      {face.roomId && <button className="secondary-button" onClick={() => select({ type: 'room', id: face.roomId! })}>Room finishes</button>}
    </>}
  </div>;
}

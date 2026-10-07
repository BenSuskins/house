import { describe, expect, it } from 'vitest';
import { createDesign, editDesign, createHistory, recordEdit, undo, redo, wallOverlaps } from '../src/domain/editor';
import { house } from '../src/domain/house';

describe('the house editor', () => {
  it('names wall faces for the room on their physical side', () => {
    const expected: Record<string, string[]> = {
      'ground-wc-front': ['ground-wc', 'ground-hall'],
      'first-ensuite-bedroom': ['first-ensuite', 'first-wardrobe'],
      'first-bedrooms-divider': ['first-bedroom-two', 'first-bedroom-three'],
      'first-bathroom-landing': ['first-bathroom', 'first-landing'],
      'first-cupboard-front': ['first-landing', 'first-cupboard'],
      'first-cupboard-back': ['first-cupboard', 'first-landing'],
    };
    for (const [id, roomIds] of Object.entries(expected)) {
      const wall = house.floors.flatMap((floor) => floor.walls).find((wall) => wall.id === id)!;
      expect(wall.faces.map((face) => face.roomId)).toEqual(roomIds);
    }
  });

  it('paints one wall face without changing its opposite face or another floor', () => {
    const original = createDesign('One');
    const wall = house.floors[0].walls.find((wall) => wall.faces.every((face) => face.roomId))!;
    const changed = editDesign(original, { type: 'paint-wall', faceId: wall.faces[0].id, colour: '#ccddee' });
    expect(changed.ok).toBe(true);
    if (!changed.ok) return;
    expect(changed.value.wallColours[wall.faces[0].id]).toBe('#ccddee');
    expect(changed.value.wallColours[wall.faces[1].id]).toBe(original.wallColours[wall.faces[1].id]);
    expect(original.wallColours[wall.faces[0].id]).not.toBe('#ccddee');
    expect(changed.value.floorFinishes).toEqual(original.floorFinishes);
  });

  it('moves and rotates furniture with grid snapping without moving furniture on another floor', () => {
    const original = createDesign('One');
    const chair = original.furniture.find((item) => item.templateId === 'armchair')!;
    const changed = editDesign(original, { type: 'update-furniture', itemId: chair.id, patch: { position: { x: 6.04, z: 2.06 }, rotation: 450 }, snap: true });
    expect(changed.ok).toBe(true);
    if (!changed.ok) return;
    expect(changed.value.furniture.find((item) => item.id === chair.id)).toMatchObject({ position: { x: 6, z: 2.1 }, rotation: 90 });
    expect(changed.value.furniture.filter((item) => item.floorId === 'first')).toEqual(original.furniture.filter((item) => item.floorId === 'first'));
  });

  it('allows a wall overlap with a warning, but rejects a rotated item outside the floor', () => {
    const original = createDesign('One');
    const chair = original.furniture.find((item) => item.templateId === 'armchair')!;
    const changed = editDesign(original, { type: 'update-furniture', itemId: chair.id, patch: { position: { x: 3.44, z: 1.6 } } });
    expect(changed.ok).toBe(true);
    if (!changed.ok) return;
    expect(wallOverlaps(changed.value.furniture.find((item) => item.id === chair.id)!)).toContain('ground-kitchen-hall');
    expect(editDesign(original, { type: 'update-furniture', itemId: chair.id, patch: { position: { x: 0.3, z: 2 }, rotation: 45 } })).toMatchObject({ ok: false, error: { code: 'boundary' } });
  });

  it('changes a room finish and restores both surface edits through undo and redo', () => {
    const original = createDesign('One');
    const painted = editDesign(original, { type: 'paint-wall', faceId: 'ground-kitchen-hall-0', colour: '#ccddee' });
    if (!painted.ok) throw new Error('Paint failed');
    const finished = editDesign(painted.value, { type: 'finish-floor', roomId: 'ground-kitchen', finish: { material: 'tile', colour: '#e1e2e3' } });
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    let history = recordEdit(recordEdit(createHistory(original), painted.value), finished.value);
    history = undo(history);
    expect(history.present.floorFinishes['ground-kitchen']).toEqual(original.floorFinishes['ground-kitchen']);
    expect(history.present.wallColours['ground-kitchen-hall-0']).toBe('#ccddee');
    history = undo(history);
    expect(history.present).toEqual(original);
    expect(redo(redo(history)).present.floorFinishes['ground-kitchen']).toEqual({ material: 'tile', colour: '#e1e2e3' });
    expect(finished.value.floorFinishes['first-bedroom-one']).toEqual(original.floorFinishes['first-bedroom-one']);
  });

  it('adds, resizes, duplicates and deletes furniture through editor actions', () => {
    let design = createDesign('One');
    const added = editDesign(design, { type: 'add-furniture', templateId: 'desk', floorId: 'first', position: { x: 1.5, z: 2 } });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    design = added.value;
    const desk = design.furniture.at(-1)!;
    const resized = editDesign(design, { type: 'update-furniture', itemId: desk.id, patch: { dimensions: { width: 1.4, depth: 0.6, height: 0.8 }, colour: '#aabbcc' } });
    if (!resized.ok) throw new Error('Resize failed');
    expect(resized.value.furniture.at(-1)).toMatchObject({ dimensions: { width: 1.4, depth: 0.6, height: 0.8 }, colour: '#aabbcc' });
    const duplicated = editDesign(resized.value, { type: 'duplicate-furniture', itemId: desk.id });
    if (!duplicated.ok) throw new Error('Duplicate failed');
    expect(duplicated.value.furniture.at(-1)?.id).not.toBe(desk.id);
    const removed = editDesign(duplicated.value, { type: 'delete-furniture', itemId: desk.id });
    if (!removed.ok) throw new Error('Delete failed');
    expect(removed.value.furniture.find((item) => item.id === desk.id)).toBeUndefined();
    expect(editDesign(design, { type: 'update-furniture', itemId: desk.id, patch: { dimensions: { width: -1, depth: 0.6, height: 0.8 } } })).toMatchObject({ ok: false });
  });
});

import type { Fitting, HouseFloor, Opening, Wall } from './types';

const fitting = (id: string, type: Fitting['type'], x: number, z: number, width: number, depth: number, height: number, rotation = 0, elevation = 0.02): Fitting => ({ id, type, position: { x, z }, dimensions: { width, depth, height }, rotation, elevation });

function segments(wall: Wall, openings: Opening[]): Opening[] {
  const horizontal = wall.start.z === wall.end.z;
  const origin = horizontal ? wall.start.x : wall.start.z;
  const length = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
  return openings.flatMap((opening) => {
    const start = Math.max(origin, opening.start);
    const end = Math.min(origin + length, opening.start + opening.width);
    return end > start ? [{ ...opening, start: start - origin, width: end - start, ...(opening.leaves === 2 ? { span: { start: opening.start - origin, width: opening.width } } : {}) }] : [];
  });
}

export function correctGroundFloor(floor: HouseFloor): HouseFloor {
  const rooms = floor.rooms.map((room) => room.id === 'ground-cupboard' ? { ...room, polygon: room.polygon.map((point) => ({ ...point, z: point.z > 1 ? 2.10 : point.z })) } : room.id === 'ground-hall' ? { ...room, polygon: [{ x: 4.14, z: 0.18 }, { x: 5.38, z: 0.18 }, { x: 5.38, z: 5.13 }, { x: 4.30, z: 5.13 }, { x: 4.30, z: 3.22 }, { x: 3.53, z: 3.22 }, { x: 3.53, z: 2.28 }, { x: 4.14, z: 2.28 }] } : room);
  const walls = floor.walls.map((wall) => {
    if (wall.id === 'ground-cupboard-side') return { ...wall, end: { ...wall.end, z: 2.19 }, heights: { start: 0.8, end: 2.05 } };
    if (wall.id === 'ground-cupboard-door') return { ...wall, start: { ...wall.start, z: 2.19 }, end: { ...wall.end, z: 2.19 }, heights: { start: 2.1, end: 2.1 } };
    if (wall.id.startsWith('ground-back-')) return { ...wall, openings: [] };
    if (wall.id === 'ground-hall-lounge') return { ...wall, openings: wall.openings.map((opening) => ({ ...opening, start: 3.5, swing: 1 as const })) };
    if (wall.id === 'ground-kitchen-hall') return { ...wall, openings: wall.openings.map((opening) => ({ ...opening, hinge: 'end' as const, swing: -1 as const })) };
    if (wall.id.startsWith('ground-right-')) return { ...wall, openings: segments(wall, [{ start: 2, width: 1.5, bottom: 0.85, height: 1.2, type: 'window' }]) };
    if (wall.id.startsWith('ground-left-')) return { ...wall, openings: segments(wall, [
      { start: 0.85, width: 1.35, bottom: 0.95, height: 1.15, type: 'window' },
      { start: 3.25, width: 1.6, bottom: 0, height: 2.1, type: 'door', leaves: 2 },
    ]) };
    return wall;
  });
  return { ...floor, rooms, walls, fittings: [
    fitting('ground-counter-back', 'counter', 1.46, 0.48, 2.56, 0.6, 0.9),
    fitting('ground-counter-left', 'counter', 0.48, 1.55, 1.54, 0.6, 0.9, 270),
    fitting('ground-sink', 'sink', 0.48, 1.45, 0.65, 0.48, 0.92, 270),
    fitting('ground-hob', 'hob', 1.65, 0.48, 0.6, 0.5, 0.92),
    fitting('ground-oven', 'oven', 1.65, 0.48, 0.6, 0.6, 0.75),
    fitting('ground-fridge', 'fridge', 3.05, 1.3, 0.68, 0.6, 2.1, 90),
    fitting('ground-tall-cabinet', 'cabinet', 3.05, 0.54, 0.72, 0.6, 2.1, 90),
    fitting('ground-wall-cabinet-back-left', 'wall-cabinet', 0.68, 0.35, 1, 0.34, 0.72, 0, 1.45),
    fitting('ground-wall-cabinet-back-right', 'wall-cabinet', 2.41, 0.35, 0.66, 0.34, 0.72, 0, 1.45),
    ...floor.fittings.filter((fitting) => ['ground-toilet', 'ground-wc-sink'].includes(fitting.id)),
  ] };
}

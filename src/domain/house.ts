import { correctGroundFloor } from './ground-floor';
import { containsPoint, houseWidth, widenPoint } from './geometry';
import { house as previousHouse } from './house-version-two';
import type { HouseFloor, HouseModel, Opening, Point, Wall } from './types';

const mirror = (point: Point): Point => ({ x: houseWidth - widenPoint(point).x, z: point.z });
const mirrorSide = (name: string) => name.replace(/\b(left|right)\b/g, (side) => side === 'left' ? 'right' : 'left');
export const wallName = (wall: Wall) => mirrorSide(wall.id.replace(/^(ground|first)-/, '').replaceAll('-', ' '));

function windowSegments(wall: Wall, windows: Opening[]): Opening[] {
  const horizontal = wall.start.z === wall.end.z;
  const origin = horizontal ? wall.start.x : wall.start.z;
  const length = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
  return windows.flatMap((opening) => {
    const start = Math.max(origin, opening.start);
    const end = Math.min(origin + length, opening.start + opening.width);
    return end > start ? [{ ...opening, start: start - origin, width: end - start }] : [];
  });
}

function correctFloor(previousFloor: HouseFloor): HouseFloor {
  const floor = previousFloor.id === 'ground' ? correctGroundFloor(previousFloor) : previousFloor;
  const rooms = floor.rooms.map((room) => {
    const polygon = room.id === 'first-bedroom-one' ? [{ x: 0.18, z: 0.18 }, { x: 3.39, z: 0.18 }, { x: 3.39, z: 3.76 }, { x: 2.88, z: 3.76 }, { x: 2.88, z: 3.20 }, { x: 0.18, z: 3.20 }]
      : room.id === 'first-wardrobe' ? [{ x: 0.18, z: 3.20 }, { x: 2.88, z: 3.20 }, { x: 2.88, z: 3.76 }, { x: 0.18, z: 3.76 }] : room.polygon;
    return { ...room, polygon: polygon.map(mirror).reverse() };
  });
  const walls = floor.walls.filter((wall) => !['first-bedroom-one-wardrobe', 'first-wardrobe-passage'].includes(wall.id)).map((wall) => {
    let openings = wall.openings;
    if (wall.id.startsWith('first-back-')) openings = [];
    if (wall.id.startsWith('first-right-')) openings = windowSegments(wall, [
      { start: 0.99, width: 1.1, bottom: 0.85, height: 1.2, type: 'window' },
      { start: 3.45, width: 1.1, bottom: 0.85, height: 1.2, type: 'window' },
    ]);
    if (wall.id.startsWith('first-front-')) openings = [...openings, ...windowSegments(wall, [{ start: 4.05, width: 0.6, bottom: 1.3, height: 0.6, type: 'window' }])];
    if (['first-bedroom-one-landing', 'first-bedroom-two-landing', 'first-bathroom-landing', 'first-ensuite-passage'].includes(wall.id)) openings = openings.map((opening) => ({ ...opening, swing: -1, ...(wall.id === 'first-bedroom-one-landing' ? { hinge: 'end' as const } : {}) }));
    if (wall.start.z === wall.end.z) openings = openings.map((opening) => { const start = widenPoint({ x: wall.start.x + opening.start, z: wall.start.z }).x; const end = widenPoint({ x: wall.start.x + opening.start + opening.width, z: wall.start.z }).x; return { ...opening, start: start - widenPoint(wall.start).x, width: end - start }; });
    const perimeter = /-(back|front|left|right)-\d+$/.test(wall.id);
    const faces = wall.faces.map((face, index) => {
      if (!perimeter) return { ...face, name: mirrorSide(face.name) };
      const horizontal = wall.start.z === wall.end.z;
      const side = index === 0 ? 1 : -1;
      const midpoint = { x: (wall.start.x + wall.end.x) / 2 + (horizontal ? 0 : -side * 0.101), z: (wall.start.z + wall.end.z) / 2 + (horizontal ? side * 0.101 : 0) };
      const room = floor.rooms.find((room) => containsPoint(room.polygon, midpoint));
      return { ...face, roomId: room?.id ?? null, name: `${mirrorSide(wall.id.split('-')[1])} wall · ${room?.name ?? 'outer side'}` };
    });
    return { ...wall, start: mirror(wall.start), end: mirror(wall.end), faces: faces.reverse(), openings };
  });
  return { ...floor, rooms, walls, fittings: floor.fittings.map((fitting) => ({ ...fitting, position: mirror(fitting.position), rotation: (360 - fitting.rotation) % 360 })), stairwell: floor.stairwell?.map(mirror).reverse() };
}

function turnPoint(angle: number): Point {
  const horizontal = Math.cos(angle);
  const vertical = Math.sin(angle);
  const distance = Math.min(1 / Math.abs(horizontal), 0.92 / Math.abs(vertical));
  return { x: 4.96 + horizontal * distance, z: 1.1 + vertical * distance };
}

export const house: HouseModel = { ...previousHouse, version: 4, width: houseWidth, floors: previousHouse.floors.map(correctFloor), stairs: {
  flights: [
    { start: { x: 4.35, z: 2.20 }, end: { x: 4.35, z: 1.24 }, width: 0.78, steps: 5, rise: 0.15, elevation: 0 },
    { start: { x: 5.50, z: 1.24 }, end: { x: 5.50, z: 2.00 }, width: 0.78, steps: 5, rise: 0.15, elevation: 1.65 },
  ],
  turns: Array.from({ length: 6 }, (_, index) => {
    const start = Math.PI + index * Math.PI / 6;
    const end = Math.PI + (index + 1) * Math.PI / 6;
    const corner = index === 1 ? [{ x: 3.96, z: 0.18 }] : index === 4 ? [{ x: 5.96, z: 0.18 }] : [];
    return { polygon: [{ x: 4.96, z: 1.1 }, turnPoint(start), ...corner, turnPoint(end)], elevation: 0.75 + index * 0.15, rise: 0.15 };
  }),
} };

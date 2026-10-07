import type { Fitting, HouseFloor, HouseModel, Opening, Point, Room, Wall } from './types';

const rectangle = (left: number, top: number, right: number, bottom: number): Point[] => [{ x: left, z: top }, { x: right, z: top }, { x: right, z: bottom }, { x: left, z: bottom }];
const room = (id: string, name: string, polygon: Point[], dimensions?: string, estimated = false): Room => ({ id, name, polygon, dimensions, estimated });
const door = (start: number, width = 0.8): Opening => ({ start, width, bottom: 0, height: 2.1, type: 'door' });
const windowOpening = (start: number, width = 1.2): Opening => ({ start, width, bottom: 0.85, height: 1.2, type: 'window' });
const wall = (id: string, start: Point, end: Point, sides: [string | null, string | null], openings: Opening[] = []): Wall => ({
  id, start, end, openings,
  faces: sides.map((roomId, index) => ({ id: `${id}-${index}`, roomId, name: `${id.split('-').slice(1).join(' ')} · ${index === 0 ? 'side A' : 'side B'}` })),
});
const fitting = (id: string, type: Fitting['type'], x: number, z: number, width: number, depth: number, height: number, rotation = 0): Fitting => ({ id, type, position: { x, z }, dimensions: { width, depth, height }, rotation });

const groundRooms: Room[] = [
  room('ground-kitchen', 'Kitchen / dining', rectangle(0.18, 0.18, 3.35, 5.13), '4.95 × approximately 3.17 m', true),
  room('ground-lounge', 'Lounge', rectangle(4.81, 0.18, 8.07, 5.13), '4.95 × 3.26 m'),
  room('ground-hall', 'Hall', [{ x: 3.53, z: 0.18 }, { x: 4.63, z: 0.18 }, { x: 4.63, z: 5.13 }, { x: 4.30, z: 5.13 }, { x: 4.30, z: 3.22 }, { x: 3.53, z: 3.22 }], undefined, true),
  room('ground-wc', 'WC', rectangle(3.53, 3.40, 4.12, 5.13), undefined, true),
  room('ground-cupboard', 'Cupboard', rectangle(3.53, 0.18, 3.96, 1.08), undefined, true),
];
const groundWalls: Wall[] = [
  wall('ground-back', { x: 0.09, z: 0.09 }, { x: 8.16, z: 0.09 }, ['ground-kitchen', null], [windowOpening(0.6, 1.7), windowOpening(5.25, 1.7)]),
  wall('ground-front', { x: 0.09, z: 5.22 }, { x: 8.16, z: 5.22 }, [null, 'ground-hall'], [windowOpening(0.5, 1.7), door(4.12, 0.48), windowOpening(5.4, 1.65)]),
  wall('ground-left', { x: 0.09, z: 0.09 }, { x: 0.09, z: 5.22 }, [null, 'ground-kitchen'], [windowOpening(2.4, 1.5)]),
  wall('ground-right', { x: 8.16, z: 0.09 }, { x: 8.16, z: 5.22 }, ['ground-lounge', null], [windowOpening(1.2, 1.6)]),
  wall('ground-kitchen-hall', { x: 3.44, z: 0.09 }, { x: 3.44, z: 3.31 }, ['ground-kitchen', 'ground-hall'], [door(2.10)]),
  wall('ground-kitchen-wc', { x: 3.44, z: 3.31 }, { x: 3.44, z: 5.22 }, ['ground-kitchen', 'ground-wc']),
  wall('ground-hall-lounge', { x: 4.72, z: 0.09 }, { x: 4.72, z: 5.22 }, ['ground-hall', 'ground-lounge'], [door(3.5)]),
  wall('ground-wc-front', { x: 3.44, z: 3.31 }, { x: 4.21, z: 3.31 }, ['ground-wc', 'ground-hall']),
  wall('ground-wc-hall', { x: 4.21, z: 3.31 }, { x: 4.21, z: 5.22 }, ['ground-wc', 'ground-hall'], [door(0.16, 0.65)]),
  wall('ground-cupboard-side', { x: 4.05, z: 0.09 }, { x: 4.05, z: 1.17 }, ['ground-cupboard', 'ground-hall']),
  wall('ground-cupboard-door', { x: 3.44, z: 1.17 }, { x: 4.05, z: 1.17 }, ['ground-cupboard', 'ground-hall'], [door(0.08, 0.44)]),
];
const firstRooms: Room[] = [
  room('first-bedroom-one', 'Bedroom one', rectangle(0.18, 0.18, 3.11, 3.39), '2.93 × 3.21 m'),
  room('first-wardrobe', 'Wardrobe area', rectangle(0.18, 3.48, 3.11, 3.94), undefined, true),
  room('first-ensuite', 'En suite', rectangle(0.18, 4.12, 3.11, 5.13), undefined, true),
  room('first-bedroom-three', 'Bedroom three', rectangle(4.74, 0.18, 8.07, 2.58), '2.40 × 3.33 m'),
  room('first-bedroom-two', 'Bedroom two', rectangle(4.83, 2.65, 8.07, 5.13), '2.48 × 3.24 m'),
  room('first-landing', 'Landing', [{ x: 3.29, z: 2.08 }, { x: 4.56, z: 2.08 }, { x: 4.56, z: 2.8 }, { x: 3.29, z: 2.8 }], undefined, true),
  room('first-bathroom', 'Bathroom', rectangle(3.29, 2.98, 4.65, 5.13), undefined, true),
  room('first-cupboard', 'Cupboard', rectangle(4.01, 0.90, 4.56, 1.90), undefined, true),
];
const firstWalls: Wall[] = [
  wall('first-back', { x: 0.09, z: 0.09 }, { x: 8.16, z: 0.09 }, ['first-bedroom-one', null], [windowOpening(0.7, 1.5), windowOpening(5.3, 1.5)]),
  wall('first-front', { x: 0.09, z: 5.22 }, { x: 8.16, z: 5.22 }, [null, 'first-bedroom-two'], [windowOpening(0.5, 1.4), windowOpening(5.55, 1.5)]),
  wall('first-left', { x: 0.09, z: 0.09 }, { x: 0.09, z: 5.22 }, [null, 'first-bedroom-one'], [windowOpening(1.25, 1.2)]),
  wall('first-right', { x: 8.16, z: 0.09 }, { x: 8.16, z: 5.22 }, ['first-bedroom-three', null], [windowOpening(0.9, 1.1), windowOpening(3.3, 1.1)]),
  wall('first-bedroom-one-landing', { x: 3.20, z: 0.09 }, { x: 3.20, z: 4.03 }, ['first-bedroom-one', 'first-landing'], [door(2.4, 0.72)]),
  wall('first-ensuite-landing', { x: 3.20, z: 4.03 }, { x: 3.20, z: 5.22 }, ['first-ensuite', 'first-bathroom']),
  wall('first-ensuite-bedroom', { x: 0.09, z: 4.03 }, { x: 3.20, z: 4.03 }, ['first-ensuite', 'first-wardrobe'], [door(1.8, 0.7)]),
  wall('first-bedroom-three-landing', { x: 4.65, z: 0.09 }, { x: 4.65, z: 2.59 }, ['first-landing', 'first-bedroom-three'], [door(1.65, 0.72)]),
  wall('first-bedroom-two-bathroom', { x: 4.74, z: 2.59 }, { x: 4.74, z: 5.22 }, ['first-bathroom', 'first-bedroom-two'], [door(0.1, 0.72)]),
  wall('first-bedrooms-divider', { x: 4.65, z: 2.62 }, { x: 8.16, z: 2.62 }, ['first-bedroom-two', 'first-bedroom-three']),
  wall('first-bathroom-landing', { x: 3.20, z: 2.89 }, { x: 4.74, z: 2.89 }, ['first-bathroom', 'first-landing'], [door(0.53, 0.72)]),
  wall('first-cupboard-left', { x: 3.92, z: 0.81 }, { x: 3.92, z: 1.99 }, ['first-landing', 'first-cupboard']),
  wall('first-cupboard-front', { x: 3.92, z: 1.99 }, { x: 4.65, z: 1.99 }, ['first-landing', 'first-cupboard'], [door(0.12, 0.49)]),
  wall('first-cupboard-back', { x: 3.92, z: 0.81 }, { x: 4.65, z: 0.81 }, ['first-cupboard', 'first-landing']),
];

const baseHouse: HouseModel = {
  version: 1, width: 8.25, depth: 5.31, wallHeight: 2.4, wallThickness: 0.18,
  floors: [
    { id: 'ground', name: 'Ground floor', rooms: groundRooms, walls: groundWalls, fittings: [
      fitting('ground-counter-back', 'counter', 1.6, 0.48, 2.7, 0.6, 0.9),
      fitting('ground-counter-left', 'counter', 0.48, 1.65, 0.6, 1.8, 0.9),
      fitting('ground-sink', 'sink', 1.25, 0.48, 0.6, 0.4, 0.92),
      fitting('ground-hob', 'hob', 0.48, 1.5, 0.5, 0.6, 0.92),
      fitting('ground-toilet', 'toilet', 3.82, 4.72, 0.43, 0.62, 0.65),
      fitting('ground-wc-sink', 'sink', 3.81, 3.7, 0.4, 0.3, 0.8),
    ] },
    { id: 'first', name: 'First floor', rooms: firstRooms, walls: firstWalls, fittings: [
      fitting('first-bath', 'bath', 3.67, 4, 0.7, 1.7, 0.5),
      fitting('first-bathroom-toilet', 'toilet', 4.30, 4.7, 0.42, 0.62, 0.65),
      fitting('first-bathroom-sink', 'sink', 4.28, 3.2, 0.55, 0.35, 0.82),
      fitting('first-shower', 'shower', 0.75, 4.65, 0.95, 0.86, 0.1),
      fitting('first-ensuite-toilet', 'toilet', 2.73, 4.68, 0.45, 0.62, 0.65),
      fitting('first-ensuite-sink', 'sink', 1.86, 4.82, 0.6, 0.35, 0.82),
    ] },
  ],
};

function containsPoint(polygon: Point[], point: Point): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const left = polygon[index]; const right = polygon[previous];
    if ((left.z > point.z) !== (right.z > point.z) && point.x < (right.x - left.x) * (point.z - left.z) / (right.z - left.z) + left.x) inside = !inside;
  }
  return inside;
}

const expandPoint = (point: Point): Point => ({ x: point.x >= 4.5 ? point.x + 0.75 : point.x, z: point.z });
function expandFloor(floor: HouseFloor): HouseFloor {
  const rooms = floor.rooms.map((room) => ({ ...room, polygon: room.polygon.map(expandPoint) }));
  const walls = floor.walls.flatMap((previous) => {
    const wall = { ...previous, start: expandPoint(previous.start), end: expandPoint(previous.end), openings: previous.openings.map((opening) => ({ ...opening, start: previous.start.z === previous.end.z && opening.start >= 4.5 ? opening.start + 0.75 : opening.start })) };
    if (!['back', 'front', 'left', 'right'].includes(wall.id.split('-')[1])) return [wall];
    const horizontal = wall.start.z === wall.end.z;
    const origin = horizontal ? wall.start.x : wall.start.z;
    const length = horizontal ? wall.end.x - wall.start.x : wall.end.z - wall.start.z;
    const boundaries = [...new Set([0, length, ...rooms.flatMap((room) => room.polygon.map((point) => (horizontal ? point.x : point.z) - origin)).filter((distance) => distance > 0 && distance < length)])].sort((left, right) => left - right);
    return boundaries.slice(0, -1).map((start, index) => {
      const end = boundaries[index + 1];
      const midpoint = horizontal ? { x: wall.start.x + (start + end) / 2, z: wall.start.z } : { x: wall.start.x, z: wall.start.z + (start + end) / 2 };
      const faces = [-1, 1].map((side, faceIndex) => {
        const point = horizontal ? { x: midpoint.x, z: midpoint.z - side * 0.101 } : { x: midpoint.x + side * 0.101, z: midpoint.z };
        const room = rooms.find((room) => containsPoint(room.polygon, point));
        return { id: `${wall.id}-${index}-${faceIndex}`, roomId: room?.id ?? null, name: `${wall.id.split('-')[1]} wall · ${room?.name ?? 'outer side'}` };
      });
      return { ...wall, id: `${wall.id}-${index}`, start: horizontal ? { x: wall.start.x + start, z: wall.start.z } : { x: wall.start.x, z: wall.start.z + start }, end: horizontal ? { x: wall.start.x + end, z: wall.start.z } : { x: wall.start.x, z: wall.start.z + end }, faces,
        openings: wall.openings.flatMap((opening) => { const left = Math.max(start, opening.start); const right = Math.min(end, opening.start + opening.width); return right > left ? [{ ...opening, start: left - start, width: right - left }] : []; }),
      };
    });
  });
  return { ...floor, rooms, walls, fittings: floor.fittings.map((fitting) => ({ ...fitting, position: expandPoint(fitting.position) })) };
}

export const house: HouseModel = { ...baseHouse, width: 9, floors: baseHouse.floors.map(expandFloor) };

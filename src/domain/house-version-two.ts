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
  room('first-bedroom-one', 'Bedroom one', [{ x: 0.18, z: 0.18 }, { x: 3.39, z: 0.18 }, { x: 3.39, z: 3.76 }, { x: 2.88, z: 3.76 }, { x: 2.88, z: 3.11 }, { x: 0.18, z: 3.11 }], '2.93 × 3.21 m'),
  room('first-wardrobe', 'Wardrobe area', rectangle(0.18, 3.29, 2.70, 3.76), undefined, true),
  room('first-ensuite', 'En suite', rectangle(0.18, 3.94, 3.39, 5.13), undefined, true),
  room('first-bedroom-three', 'Bedroom three', [{ x: 5.49, z: 0.18 }, { x: 8.82, z: 0.18 }, { x: 8.82, z: 2.53 }, { x: 6.33, z: 2.53 }, { x: 6.33, z: 2.02 }, { x: 5.49, z: 2.02 }], 'Listed: 2.40 × 3.33 m', true),
  room('first-bedroom-two', 'Bedroom two', [{ x: 6.33, z: 2.71 }, { x: 8.82, z: 2.71 }, { x: 8.82, z: 5.13 }, { x: 5.58, z: 5.13 }, { x: 5.58, z: 3.29 }, { x: 6.33, z: 3.29 }], 'Listed: 2.48 × 3.24 m', true),
  room('first-landing', 'Landing', [{ x: 3.57, z: 2.11 }, { x: 4.33, z: 2.11 }, { x: 4.33, z: 2.20 }, { x: 6.15, z: 2.20 }, { x: 6.15, z: 3.11 }, { x: 3.57, z: 3.11 }], undefined, true),
  room('first-bathroom', 'Bathroom', rectangle(3.57, 3.29, 5.31, 5.13), undefined, true),
  room('first-cupboard', 'Cupboard', rectangle(4.51, 0.90, 5.31, 2.02), undefined, true),
];
const firstWalls: Wall[] = [
  wall('first-back', { x: 0.09, z: 0.09 }, { x: 8.91, z: 0.09 }, ['first-bedroom-one', null], [windowOpening(6.05, 1.5)]),
  wall('first-front', { x: 0.09, z: 5.22 }, { x: 8.91, z: 5.22 }, [null, 'first-bedroom-two'], [windowOpening(1.5, 1.4), windowOpening(6.3, 1.5)]),
  wall('first-left', { x: 0.09, z: 0.09 }, { x: 0.09, z: 5.22 }, [null, 'first-bedroom-one'], [windowOpening(1.25, 1.2)]),
  wall('first-right', { x: 8.91, z: 0.09 }, { x: 8.91, z: 5.22 }, ['first-bedroom-three', null], [windowOpening(0.9, 1.1)]),
  wall('first-bedroom-one-stairs', { x: 3.48, z: 0.09 }, { x: 3.48, z: 2.11 }, ['first-bedroom-one', null]),
  wall('first-bedroom-one-landing', { x: 3.48, z: 2.11 }, { x: 3.48, z: 3.20 }, ['first-bedroom-one', 'first-landing'], [door(0.14, 0.72)]),
  wall('first-bedroom-one-bathroom', { x: 3.48, z: 3.20 }, { x: 3.48, z: 3.85 }, ['first-bedroom-one', 'first-bathroom']),
  wall('first-ensuite-landing', { x: 3.48, z: 3.85 }, { x: 3.48, z: 5.22 }, ['first-ensuite', 'first-bathroom']),
  wall('first-ensuite-bedroom', { x: 0.09, z: 3.85 }, { x: 2.79, z: 3.85 }, ['first-ensuite', 'first-wardrobe']),
  wall('first-ensuite-passage', { x: 2.79, z: 3.85 }, { x: 3.48, z: 3.85 }, ['first-ensuite', 'first-bedroom-one'], [door(0.04, 0.60)]),
  wall('first-bedroom-one-wardrobe', { x: 0.09, z: 3.20 }, { x: 2.79, z: 3.20 }, ['first-wardrobe', 'first-bedroom-one']),
  wall('first-wardrobe-passage', { x: 2.79, z: 3.20 }, { x: 2.79, z: 3.85 }, ['first-wardrobe', 'first-bedroom-one']),
  wall('first-bedroom-three-stairs', { x: 5.40, z: 0.09 }, { x: 5.40, z: 0.81 }, [null, 'first-bedroom-three']),
  wall('first-bedroom-three-cupboard', { x: 5.40, z: 0.81 }, { x: 5.40, z: 2.11 }, ['first-cupboard', 'first-bedroom-three']),
  wall('first-bedroom-three-landing', { x: 5.40, z: 2.11 }, { x: 6.24, z: 2.11 }, ['first-landing', 'first-bedroom-three'], [door(0.10, 0.65)]),
  wall('first-bedroom-three-return', { x: 6.24, z: 2.11 }, { x: 6.24, z: 2.62 }, ['first-landing', 'first-bedroom-three']),
  wall('first-bedroom-two-return', { x: 6.24, z: 2.62 }, { x: 6.24, z: 3.20 }, ['first-landing', 'first-bedroom-two']),
  wall('first-bedroom-two-landing', { x: 5.40, z: 3.20 }, { x: 6.24, z: 3.20 }, ['first-bedroom-two', 'first-landing'], [door(0.10, 0.65)]),
  wall('first-bedroom-two-bathroom', { x: 5.40, z: 3.20 }, { x: 5.40, z: 5.22 }, ['first-bathroom', 'first-bedroom-two']),
  wall('first-bedrooms-divider', { x: 6.24, z: 2.62 }, { x: 8.91, z: 2.62 }, ['first-bedroom-two', 'first-bedroom-three']),
  wall('first-bathroom-landing', { x: 3.48, z: 3.20 }, { x: 5.40, z: 3.20 }, ['first-bathroom', 'first-landing'], [door(0.50, 0.72)]),
  wall('first-cupboard-left', { x: 4.42, z: 0.81 }, { x: 4.42, z: 2.11 }, [null, 'first-cupboard']),
  wall('first-cupboard-front', { x: 4.42, z: 2.11 }, { x: 5.40, z: 2.11 }, ['first-landing', 'first-cupboard'], [door(0.17, 0.63)]),
  wall('first-cupboard-back', { x: 4.42, z: 0.81 }, { x: 5.40, z: 0.81 }, ['first-cupboard', null]),
];

const baseHouse: HouseModel = {
  version: 2, width: 8.25, depth: 5.31, wallHeight: 2.4, wallThickness: 0.18,
  floors: [
    { id: 'ground', name: 'Ground floor', rooms: groundRooms, walls: groundWalls, fittings: [
      fitting('ground-counter-back', 'counter', 1.6, 0.48, 2.7, 0.6, 0.9),
      fitting('ground-counter-left', 'counter', 0.48, 1.65, 0.6, 1.8, 0.9),
      fitting('ground-sink', 'sink', 1.25, 0.48, 0.6, 0.4, 0.92),
      fitting('ground-hob', 'hob', 0.48, 1.5, 0.5, 0.6, 0.92),
      fitting('ground-toilet', 'toilet', 3.82, 4.72, 0.43, 0.62, 0.65),
      fitting('ground-wc-sink', 'sink', 3.81, 3.7, 0.4, 0.3, 0.8),
    ] },
    { id: 'first', name: 'First floor', rooms: firstRooms, walls: firstWalls, stairwell: [{ x: 3.57, z: 0.18 }, { x: 5.31, z: 0.18 }, { x: 5.31, z: 0.72 }, { x: 4.33, z: 0.72 }, { x: 4.33, z: 2.11 }, { x: 3.57, z: 2.11 }], fittings: [
      fitting('first-bath', 'bath', 3.96, 4.21, 0.7, 1.7, 0.5),
      fitting('first-bathroom-toilet', 'toilet', 4.99, 4.72, 0.42, 0.62, 0.65, 90),
      fitting('first-bathroom-sink', 'sink', 5.05, 4.13, 0.55, 0.35, 0.82, 90),
      fitting('first-shower', 'shower', 0.75, 4.48, 0.95, 0.96, 0.1),
      fitting('first-ensuite-toilet', 'toilet', 2.48, 4.72, 0.45, 0.62, 0.65, 180),
      fitting('first-ensuite-sink', 'sink', 3.08, 4.79, 0.45, 0.35, 0.82, 90),
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
function expandFloor(floor: HouseFloor, expand = true): HouseFloor {
  const transformPoint = expand ? expandPoint : (point: Point) => point;
  const rooms = floor.rooms.map((room) => ({ ...room, polygon: room.polygon.map(transformPoint) }));
  const walls = floor.walls.flatMap((previous) => {
    const wall = { ...previous, start: transformPoint(previous.start), end: transformPoint(previous.end), openings: previous.openings.map((opening) => ({ ...opening, start: expand && previous.start.z === previous.end.z && opening.start >= 4.5 ? opening.start + 0.75 : opening.start })) };
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
  return { ...floor, rooms, walls, fittings: floor.fittings.map((fitting) => ({ ...fitting, position: transformPoint(fitting.position) })) };
}

export const house: HouseModel = { ...baseHouse, width: 9, floors: baseHouse.floors.map((floor) => expandFloor(floor, floor.id === 'ground')) };

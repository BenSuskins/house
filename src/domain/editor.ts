import { catalogue } from './catalogue';
import { house } from './house';
import type { Design, FloorFinish, FloorId, FurnitureItem, Point, Result, Wall } from './types';

export const identifier = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
export const failure = (code: string, message: string): Result<never> => ({ ok: false, error: { code, message } });

const starterFurniture = (): FurnitureItem[] => {
  const place = (templateId: string, floorId: FurnitureItem['floorId'], x: number, z: number, rotation = 0, properties: Partial<Pick<FurnitureItem, 'dimensions' | 'colour'>> = {}): FurnitureItem => {
    const template = catalogue.find((template) => template.id === templateId)!;
    return { id: identifier(), templateId, floorId, position: { x, z }, dimensions: { ...template.dimensions }, rotation, colour: template.colour, ...properties };
  };
  return [
    place('sofa', 'ground', 7.6, 2.6, 90, { dimensions: { width: 1.95, depth: 0.9, height: 0.85 }, colour: '#56433f' }),
    place('sofa', 'ground', 5.28, 2.4, 270, { dimensions: { width: 2.15, depth: 0.87, height: 0.85 }, colour: '#c2bcb4' }),
    place('ottoman', 'ground', 6.45, 3.15),
    place('coffee-table', 'ground', 6.45, 2.2, 0, { dimensions: { width: 0.75, depth: 0.55, height: 0.43 }, colour: '#ac784d' }),
    place('media-unit', 'ground', 6.45, 0.48),
    place('plant', 'ground', 7.77, 1), place('plant', 'ground', 6.35, 4.77),
    place('dining-table', 'ground', 1.62, 3.62),
    place('dining-chair', 'ground', 1.62, 2.86), place('dining-chair', 'ground', 1.62, 4.38, 180),
    place('dining-chair', 'ground', 0.61, 3.62, 270), place('dining-chair', 'ground', 2.63, 3.62, 90),
    place('plant', 'ground', 2.99, 4.77),
    place('stool', 'ground', 3.8, 4.11),
    place('double-bed', 'first', 1.78, 1.49, 0, { colour: '#b2a491' }),
    place('bedside-table', 'first', 0.6, 0.75, 0, { dimensions: { width: 0.45, depth: 0.4, height: 0.65 }, colour: '#958064' }),
    place('bedside-table', 'first', 2.88, 0.75, 0, { dimensions: { width: 0.45, depth: 0.4, height: 0.65 }, colour: '#958064' }),
    place('wardrobe', 'first', 1.45, 3.53, 180, { dimensions: { width: 2.36, depth: 0.44, height: 2.15 }, colour: '#eeeae3' }),
    place('desk', 'first', 0.48, 2.13, 90, { dimensions: { width: 1.05, depth: 0.4, height: 0.78 }, colour: '#958064' }),
    place('daybed', 'first', 6.19, 4.64, 180),
    place('desk', 'first', 7.69, 3.61, 270, { dimensions: { width: 1.45, depth: 0.6, height: 0.75 }, colour: '#ded8c9' }),
    place('desk-chair', 'first', 6.97, 3.65, 270, { colour: '#303c39' }),
    place('bookcase', 'first', 6.45, 2.87, 0, { colour: '#a68f6c' }),
    place('drawers', 'first', 7.72, 4.75, 270, { dimensions: { width: 0.5, depth: 0.35, height: 0.75 }, colour: '#ded8c9' }),
    place('sofa', 'first', 7.6, 1.2, 90, { dimensions: { width: 2, depth: 0.9, height: 0.78 }, colour: '#30383b' }),
    place('computer-desk', 'first', 5.11, 1.05, 270),
    place('desk-chair', 'first', 5.92, 1.05, 90, { colour: '#30383b' }),
    place('floor-lamp', 'first', 6.85, 0.38, 0, { dimensions: { width: 0.28, depth: 0.28, height: 1.4 }, colour: '#ebe1cf' }),
  ].map((item) => item.position.x >= 4.5 ? { ...item, position: { ...item.position, x: item.position.x + 0.75 } } : item);
};

export function createDesign(name: string): Design {
  return {
    id: identifier(), name, revision: 0, updatedAt: new Date().toISOString(), houseVersion: house.version,
    wallColours: Object.fromEntries(house.floors.flatMap((floor) => floor.walls.flatMap((wall) => wall.faces.map((face) => [face.id, '#f2f0e9'])))),
    floorFinishes: Object.fromEntries(house.floors.flatMap((floor) => floor.rooms.map((room) => [room.id, {
      material: /bathroom|ensuite|wc/.test(room.id) ? 'tile' : /bedroom/.test(room.id) ? 'carpet' : 'wood',
      colour: /bathroom|ensuite|wc/.test(room.id) ? '#e0dfd8' : /bedroom/.test(room.id) ? '#e6decd' : '#dfd0ae',
    }]))),
    furniture: starterFurniture(),
  };
}

export type Edit =
  | { type: 'paint-wall'; faceId: string; colour: string }
  | { type: 'finish-floor'; roomId: string; finish: FloorFinish }
  | { type: 'rename'; name: string }
  | { type: 'add-furniture'; templateId: string; floorId: FloorId; position: Point }
  | { type: 'delete-furniture'; itemId: string }
  | { type: 'duplicate-furniture'; itemId: string }
  | { type: 'update-furniture'; itemId: string; patch: Partial<Pick<FurnitureItem, 'position' | 'dimensions' | 'rotation' | 'colour'>>; snap?: boolean };

export function furnitureCorners(item: FurnitureItem): Point[] {
  const angle = item.rotation * Math.PI / 180;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([horizontal, vertical]) => {
    const x = horizontal * item.dimensions.width / 2;
    const z = vertical * item.dimensions.depth / 2;
    return { x: item.position.x + x * Math.cos(angle) - z * Math.sin(angle), z: item.position.z + x * Math.sin(angle) + z * Math.cos(angle) };
  });
}

export const insideFloor = (item: FurnitureItem) => furnitureCorners(item).every((point) => point.x >= 0.18 - 1e-8 && point.x <= house.width - 0.18 + 1e-8 && point.z >= 0.18 - 1e-8 && point.z <= house.depth - 0.18 + 1e-8);
const validColour = (colour: string) => /^#[\da-f]{6}$/i.test(colour);
const validItem = (item: FurnitureItem) => Object.values(item.dimensions).every((value) => Number.isFinite(value) && value > 0 && value <= 10) && Number.isFinite(item.rotation) && Number.isFinite(item.position.x) && Number.isFinite(item.position.z) && validColour(item.colour);

export function wallSpans(wall: Wall): [number, number][] {
  const length = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
  const doors = wall.openings.filter((opening) => opening.type === 'door').sort((left, right) => left.start - right.start);
  const spans: [number, number][] = [];
  let position = 0;
  for (const opening of doors) {
    if (opening.start > position) spans.push([position, opening.start]);
    position = Math.max(position, opening.start + opening.width);
  }
  if (position < length) spans.push([position, length]);
  return spans;
}

function polygonsOverlap(left: Point[], right: Point[]): boolean {
  return [left, right].every((polygon) => polygon.every((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    const axis = { x: -(next.z - point.z), z: next.x - point.x };
    const project = (points: Point[]) => points.map((point) => point.x * axis.x + point.z * axis.z);
    const first = project(left);
    const second = project(right);
    return Math.max(...first) > Math.min(...second) + 1e-8 && Math.max(...second) > Math.min(...first) + 1e-8;
  }));
}

export function wallOverlaps(item: FurnitureItem): string[] {
  const floor = house.floors.find((floor) => floor.id === item.floorId)!;
  return floor.walls.filter((wall) => {
    const length = Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z);
    const direction = { x: (wall.end.x - wall.start.x) / length, z: (wall.end.z - wall.start.z) / length };
    const normal = { x: -direction.z * house.wallThickness / 2, z: direction.x * house.wallThickness / 2 };
    return wallSpans(wall).some(([start, end]) => {
      const corner = (distance: number, side: number): Point => ({ x: wall.start.x + direction.x * distance + normal.x * side, z: wall.start.z + direction.z * distance + normal.z * side });
      return polygonsOverlap(furnitureCorners(item), [corner(start, -1), corner(end, -1), corner(end, 1), corner(start, 1)]);
    });
  }).map((wall) => wall.id);
}

export function editDesign(design: Design, edit: Edit): Result<Design> {
  if (edit.type === 'rename') {
    const name = edit.name.trim();
    return name.length > 0 && name.length <= 80 ? { ok: true, value: { ...design, name } } : failure('invalid', 'Use a design name between 1 and 80 characters.');
  }
  if (edit.type === 'paint-wall') {
    if (!Object.hasOwn(design.wallColours, edit.faceId)) return failure('invalid', 'Select a wall face.');
    if (!validColour(edit.colour)) return failure('invalid', 'Enter a six-digit colour.');
    return { ok: true, value: { ...design, wallColours: { ...design.wallColours, [edit.faceId]: edit.colour.toLowerCase() } } };
  }
  if (edit.type === 'finish-floor') {
    if (!Object.hasOwn(design.floorFinishes, edit.roomId) || !['wood', 'carpet', 'tile'].includes(edit.finish.material) || !validColour(edit.finish.colour)) return failure('invalid', 'Select a room and a valid floor finish.');
    return { ok: true, value: { ...design, floorFinishes: { ...design.floorFinishes, [edit.roomId]: { ...edit.finish } } } };
  }
  if (edit.type === 'add-furniture') {
    const template = catalogue.find((template) => template.id === edit.templateId);
    if (!template || !house.floors.some((floor) => floor.id === edit.floorId)) return failure('invalid', 'Select a furniture type and floor.');
    if (design.furniture.length >= 500) return failure('invalid', 'This design has reached the limit of 500 furniture items.');
    const item: FurnitureItem = { id: identifier(), templateId: template.id, floorId: edit.floorId, position: { ...edit.position }, dimensions: { ...template.dimensions }, rotation: 0, colour: template.colour };
    if (!validItem(item) || !insideFloor(item)) return failure('boundary', 'Keep the furniture inside the floor boundary.');
    return { ok: true, value: { ...design, furniture: [...design.furniture, item] } };
  }
  const previous = design.furniture.find((item) => item.id === edit.itemId);
  if (!previous) return failure('invalid', 'Select a furniture item.');
  if (edit.type === 'delete-furniture') return { ok: true, value: { ...design, furniture: design.furniture.filter((item) => item.id !== previous.id) } };
  if (edit.type === 'duplicate-furniture') {
    if (design.furniture.length >= 500) return failure('invalid', 'This design has reached the limit of 500 furniture items.');
    const candidate = { ...previous, id: identifier(), position: { x: previous.position.x + 0.2, z: previous.position.z + 0.2 } };
    const item = insideFloor(candidate) ? candidate : { ...candidate, position: { ...previous.position } };
    return { ok: true, value: { ...design, furniture: [...design.furniture, item] } };
  }
  const item = { ...previous, ...edit.patch };
  if (edit.snap && edit.patch.position) item.position = { x: Math.round(item.position.x * 10) / 10, z: Math.round(item.position.z * 10) / 10 };
  item.rotation = (item.rotation % 360 + 360) % 360;
  if (!validItem(item)) return failure('invalid', 'Use positive dimensions and a valid colour.');
  if (!insideFloor(item)) return failure('boundary', 'Keep the furniture inside the floor boundary.');
  return { ok: true, value: { ...design, furniture: design.furniture.map((previousItem) => previousItem.id === item.id ? item : previousItem) } };
}

export type History = { past: Design[]; present: Design; future: Design[] };
export const createHistory = (design: Design): History => ({ past: [], present: design, future: [] });
export const recordEdit = (history: History, design: Design): History => JSON.stringify(design) === JSON.stringify(history.present) ? history : ({ past: [...history.past.slice(-99), history.present], present: design, future: [] });
export const undo = (history: History): History => history.past.length === 0 ? history : ({ past: history.past.slice(0, -1), present: history.past[history.past.length - 1], future: [history.present, ...history.future] });
export const redo = (history: History): History => history.future.length === 0 ? history : ({ past: [...history.past, history.present], present: history.future[0], future: history.future.slice(1) });

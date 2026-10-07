import { catalogue } from './catalogue';
import { house } from './house';
import type { Design, FloorFinish, FloorId, FurnitureItem, Point, Result, Wall } from './types';

export const identifier = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
export const failure = (code: string, message: string): Result<never> => ({ ok: false, error: { code, message } });

const starterFurniture = (): FurnitureItem[] => {
  const place = (templateId: string, floorId: FurnitureItem['floorId'], x: number, z: number, rotation = 0): FurnitureItem => {
    const template = catalogue.find((template) => template.id === templateId)!;
    return { id: identifier(), templateId, floorId, position: { x, z }, dimensions: { ...template.dimensions }, rotation, colour: template.colour };
  };
  return [
    place('sofa', 'ground', 6.5, 4.42, 180), place('armchair', 'ground', 5.42, 2.5, 270),
    place('rug', 'ground', 6.55, 3.08), place('coffee-table', 'ground', 6.55, 3.08),
    place('tv-stand', 'ground', 6.5, 0.48), place('floor-lamp', 'ground', 7.73, 4.7),
    place('plant', 'ground', 7.7, 0.45), place('dining-table', 'ground', 1.62, 3.62),
    place('dining-chair', 'ground', 1.62, 2.86), place('dining-chair', 'ground', 1.62, 4.38, 180),
    place('dining-chair', 'ground', 0.61, 3.62, 270), place('dining-chair', 'ground', 2.63, 3.62, 90),
    place('plant', 'ground', 2.99, 4.77),
    place('double-bed', 'first', 1.64, 1.56), place('bedside-table', 'first', 0.55, 0.67),
    place('bedside-table', 'first', 2.73, 0.67), { ...place('wardrobe', 'first', 1.62, 3.7), dimensions: { width: 2.5, depth: 0.4, height: 1.9 } },
    place('single-bed', 'first', 6.76, 1.34), place('bedside-table', 'first', 5.71, 0.65),
    place('double-bed', 'first', 6.75, 3.87, 90), place('bedside-table', 'first', 7.45, 2.98),
    place('drawers', 'first', 5.26, 4.68, 90),
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

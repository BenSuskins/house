import { house as previousHouse } from './house-version-two';
import { containsPoint, houseWidth, widenPoint } from './geometry';
import type { FurnitureItem } from './types';

export function migrateFurniture(item: FurnitureItem): FurnitureItem {
  const bedrooms = previousHouse.floors[1].rooms.filter((room) => ['first-bedroom-two', 'first-bedroom-three'].includes(room.id));
  const swap = item.floorId === 'first' && bedrooms.some((room) => containsPoint(room.polygon, item.position));
  const rotation = swap ? (180 - item.rotation + 360) % 360 : item.rotation;
  const angle = rotation * Math.PI / 180;
  const halfDepth = (Math.abs(Math.sin(angle)) * item.dimensions.width + Math.abs(Math.cos(angle)) * item.dimensions.depth) / 2;
  const depth = swap ? Math.max(0.18 + halfDepth, Math.min(previousHouse.depth - 0.18 - halfDepth, 5.24 - item.position.z)) : item.position.z;
  return { ...item, position: { x: houseWidth - widenPoint(item.position).x, z: depth }, rotation: (360 - rotation) % 360 };
}

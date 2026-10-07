import type { Point } from './types';

export const houseWidth = 9.6;
export const widenPoint = (point: Point): Point => ({ x: point.x + (point.x <= 3.65 ? 0 : point.x < 4.63 ? 0.3 : 0.6), z: point.z });

export function containsPoint(polygon: Point[], point: Point): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const left = polygon[index]; const right = polygon[previous];
    if ((left.z > point.z) !== (right.z > point.z) && point.x < (right.x - left.x) * (point.z - left.z) / (right.z - left.z) + left.x) inside = !inside;
  }
  return inside;
}

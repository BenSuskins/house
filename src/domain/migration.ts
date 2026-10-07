import { house } from './house';
import { house as previousHouse } from './house-version-one';
import { failure } from './editor';
import { validateContent } from './validation';
import type { DesignContent, Result, Wall } from './types';

const previousWallIds: Record<string, string> = {
  'first-bedroom-one-stairs': 'first-bedroom-one-landing',
  'first-bedroom-one-bathroom': 'first-bedroom-one-landing',
  'first-ensuite-passage': 'first-ensuite-bedroom',
  'first-bedroom-three-stairs': 'first-bedroom-three-landing',
  'first-bedroom-three-cupboard': 'first-bedroom-three-landing',
  'first-bedroom-three-return': 'first-bedroom-three-landing',
  'first-bedroom-two-return': 'first-bedroom-two-bathroom',
  'first-bedroom-two-landing': 'first-bedroom-two-bathroom',
};
const perimeterId = (wall: Wall) => wall.id.replace(/-(\d+)$/, '');
const midpoint = (wall: Wall) => ({ x: (wall.start.x + wall.end.x) / 2, z: (wall.start.z + wall.end.z) / 2 });

export function migrateContent(design: DesignContent): Result<DesignContent> {
  if (design.houseVersion === house.version) return validateContent(design);
  if (design.houseVersion !== 1) return failure('invalid', 'This house model version cannot be migrated.');
  if (!design.wallColours || typeof design.wallColours !== 'object' || Array.isArray(design.wallColours)) return failure('invalid', 'The previous design must contain all wall faces.');
  const previousFaces = previousHouse.floors.flatMap((floor) => floor.walls.flatMap((wall) => wall.faces));
  if (Object.keys(design.wallColours).length !== previousFaces.length || previousFaces.some((face) => !Object.hasOwn(design.wallColours, face.id))) return failure('invalid', 'The previous design must contain all wall faces.');
  const wallColours = Object.fromEntries(house.floors.flatMap((floor) => {
    const previousWalls = previousHouse.floors.find((previous) => previous.id === floor.id)!.walls;
    return floor.walls.flatMap((wall) => wall.faces.map((face, faceIndex) => {
      const perimeter = /-(back|front|left|right)-\d+$/.test(wall.id);
      const candidates = previousWalls.filter((previous) => perimeter ? perimeterId(previous) === perimeterId(wall) : previous.id === (previousWallIds[wall.id] ?? wall.id))
        .flatMap((previous) => previous.faces.filter((candidate, index) => candidate.roomId === face.roomId && (!perimeter || index === faceIndex)).map((candidate) => ({ wall: previous, face: candidate })));
      candidates.sort((left, right) => {
        const point = midpoint(wall);
        const distance = (candidate: typeof left) => Math.hypot(midpoint(candidate.wall).x - point.x, midpoint(candidate.wall).z - point.z);
        return distance(left) - distance(right);
      });
      return [face.id, candidates[0] ? design.wallColours[candidates[0].face.id] : '#f2f0e9'];
    }));
  }));
  return validateContent({ ...design, houseVersion: house.version, wallColours });
}

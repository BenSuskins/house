import { describe, expect, it } from 'vitest';
import { house } from '../src/domain/house';

describe('the first floor reference plan', () => {
  it('has stepped bedrooms and a landing entrance for bedroom two', () => {
    const floor = house.floors[1];
    const bedroomTwo = floor.rooms.find((room) => room.id === 'first-bedroom-two')!;
    const bedroomThree = floor.rooms.find((room) => room.id === 'first-bedroom-three')!;
    const landing = floor.rooms.find((room) => room.id === 'first-landing')!;
    expect(bedroomTwo.polygon).toHaveLength(6);
    expect(bedroomThree.polygon).toHaveLength(6);
    expect(landing.polygon).toHaveLength(6);
    const entrance = floor.walls.find((wall) => wall.id === 'first-bedroom-two-landing')!;
    expect(entrance.faces.map((face) => face.roomId)).toEqual(['first-bedroom-two', 'first-landing']);
    expect(entrance.openings).toEqual([expect.objectContaining({ type: 'door' })]);
    expect(floor.walls.find((wall) => wall.id === 'first-bedroom-two-bathroom')!.openings).toEqual([]);
    const bedroomOne = floor.rooms.find((room) => room.id === 'first-bedroom-one')!;
    expect(Math.max(...bedroomOne.polygon.map((point) => point.x)) - Math.min(...bedroomOne.polygon.map((point) => point.x))).toBeCloseTo(3.21);
  });

  it('keeps stair faces separate from the cupboard and bedroom faces', () => {
    const floor = house.floors[1];
    expect(floor.walls.find((wall) => wall.id === 'first-cupboard-back')!.faces.map((face) => face.roomId)).toEqual(['first-cupboard', null]);
    expect(floor.walls.find((wall) => wall.id === 'first-bedroom-three-cupboard')!.faces.map((face) => face.roomId)).toEqual(['first-cupboard', 'first-bedroom-three']);
    expect(floor.stairwell).toHaveLength(6);
  });

  it('puts two windows in bedroom three and one window in bedroom two', () => {
    const windowWalls = (roomId: string) => [...new Set(house.floors[1].walls.filter((wall) => wall.faces.some((face) => face.roomId === roomId) && wall.openings.some((opening) => opening.type === 'window')).map((wall) => wall.id.replace(/-\d+$/, '')))].sort();
    expect(windowWalls('first-bedroom-three')).toEqual(['first-back', 'first-right']);
    expect(windowWalls('first-bedroom-two')).toEqual(['first-front']);
  });
});

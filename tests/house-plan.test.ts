import { describe, expect, it } from 'vitest';
import { house, wallName } from '../src/domain/house';

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
    expect(entrance.faces.map((face) => face.roomId)).toEqual(['first-landing', 'first-bedroom-two']);
    expect(entrance.openings).toEqual([expect.objectContaining({ type: 'door' })]);
    expect(floor.walls.find((wall) => wall.id === 'first-bedroom-two-bathroom')!.openings).toEqual([]);
    expect(entrance.openings[0]).toMatchObject({ swing: -1 });
    expect(floor.walls.find((wall) => wall.id === 'first-bathroom-landing')!.openings[0]).toMatchObject({ swing: -1 });
    const bedroomOne = floor.rooms.find((room) => room.id === 'first-bedroom-one')!;
    expect(Math.max(...bedroomOne.polygon.map((point) => point.x)) - Math.min(...bedroomOne.polygon.map((point) => point.x))).toBeCloseTo(3.21);
  });

  it('keeps stair faces separate from the cupboard and bedroom faces', () => {
    const floor = house.floors[1];
    expect(floor.walls.find((wall) => wall.id === 'first-cupboard-back')!.faces.map((face) => face.roomId)).toEqual([null, 'first-cupboard']);
    expect(floor.walls.find((wall) => wall.id === 'first-bedroom-three-cupboard')!.faces.map((face) => face.roomId)).toEqual(['first-bedroom-three', 'first-cupboard']);
    expect(floor.stairwell).toHaveLength(6);
  });

  it('puts front and side windows in bedroom two and a side window in bedroom three', () => {
    const windowWalls = (roomId: string) => [...new Set(house.floors[1].walls.filter((wall) => wall.faces.some((face) => face.roomId === roomId) && wall.openings.some((opening) => opening.type === 'window')).map((wall) => wall.id.replace(/-\d+$/, '')))].sort();
    expect(windowWalls('first-bedroom-three')).toEqual(['first-right']);
    expect(windowWalls('first-bedroom-two')).toEqual(['first-front', 'first-right']);
    expect(windowWalls('first-bathroom')).toEqual(['first-front']);
  });

  it('opens the wardrobe enclosure and mirrors both floors', () => {
    const first = house.floors[1];
    expect(first.walls.some((wall) => ['first-bedroom-one-wardrobe', 'first-wardrobe-passage'].includes(wall.id))).toBe(false);
    expect(first.walls.find((wall) => wall.id === 'first-ensuite-bedroom')).toBeDefined();
    const kitchen = house.floors[0].rooms.find((room) => room.id === 'ground-kitchen')!;
    const lounge = house.floors[0].rooms.find((room) => room.id === 'ground-lounge')!;
    expect(Math.min(...kitchen.polygon.map((point) => point.x))).toBeGreaterThan(Math.max(...lounge.polygon.map((point) => point.x)));
    expect(first.rooms.find((room) => room.id === 'first-bedroom-one')!.polygon.every((point) => point.x > house.width / 2)).toBe(true);
    const rightWall = first.walls.find((wall) => wall.id.startsWith('first-left-'))!;
    expect(rightWall.start.x).toBeCloseTo(9.51);
    expect(wallName(rightWall)).toMatch(/^right /);
    expect(rightWall.faces[0].name).toMatch(/^right wall/);
  });
});

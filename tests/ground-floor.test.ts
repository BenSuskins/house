import { describe, expect, it } from 'vitest';
import { house } from '../src/domain/house';
import { createDesign, furnitureCorners, wallOverlaps } from '../src/domain/editor';

const floor = house.floors[0];

describe('the confirmed ground floor', () => {
  it('has a sink window and garden doors on the same kitchen wall', () => {
    const sink = floor.fittings.find((fitting) => fitting.id === 'ground-sink')!;
    expect(sink.position.x).toBeCloseTo(9.12);
    const kitchenWindows = floor.walls.filter((wall) => wall.faces.some((face) => face.roomId === 'ground-kitchen') && wall.openings.some((opening) => opening.type === 'window'));
    expect(kitchenWindows.length).toBeGreaterThan(0);
    expect([...new Set(kitchenWindows.map((wall) => wall.id.replace(/-\d+$/, '')))].sort()).toEqual(['ground-front', 'ground-left']);
    const openings = floor.walls.filter((wall) => wall.start.x === wall.end.x && Math.abs(wall.start.x - 9.51) < 0.001).flatMap((wall) => wall.openings.map((opening) => ({ ...opening, start: wall.start.z + opening.start })));
    expect(openings.some((opening) => opening.type === 'window' && opening.start <= sink.position.z && opening.start + opening.width >= sink.position.z)).toBe(true);
    expect(openings.filter((opening) => opening.type === 'door').reduce((sum, opening) => sum + opening.width, 0)).toBeCloseTo(1.6);
  });

  it('puts the kitchen and lounge doors opposite each other across the hallway', () => {
    const kitchen = floor.walls.find((wall) => wall.id === 'ground-kitchen-hall')!;
    const lounge = floor.walls.find((wall) => wall.id === 'ground-hall-lounge')!;
    expect(lounge.start.z + lounge.openings[0].start).toBeCloseTo(kitchen.start.z + kitchen.openings[0].start);
    expect(kitchen.openings[0]).toMatchObject({ hinge: 'end', swing: -1 });
    expect(lounge.openings[0]).toMatchObject({ swing: 1 });
  });

  it('has kitchen cabinets and a fridge along the hallway wall', () => {
    const fridge = floor.fittings.find((fitting) => fitting.type === 'fridge');
    expect(fridge).toBeDefined();
    const cabinets = floor.fittings.filter((fitting) => fitting.type === 'cabinet' || fitting.type === 'wall-cabinet');
    expect(cabinets.length).toBeGreaterThanOrEqual(3);
    expect(cabinets.some((fitting) => fitting.position.x < 6.7)).toBe(true);
    expect(floor.fittings.filter((fitting) => ['counter', 'cabinet', 'wall-cabinet'].includes(fitting.type)).every((fitting) => fitting.position.z < 2.3)).toBe(true);
  });

  it('widens the toilet and understairs cupboard by 30 centimetres', () => {
    const width = (id: string) => { const room = floor.rooms.find((room) => room.id === id)!; return Math.max(...room.polygon.map((point) => point.x)) - Math.min(...room.polygon.map((point) => point.x)); };
    expect(width('ground-wc')).toBeCloseTo(0.89);
    expect(width('ground-cupboard')).toBeCloseTo(0.73);
    expect(house.width).toBe(9.6);
    const hall = floor.rooms.find((room) => room.id === 'ground-hall')!;
    const passage = hall.polygon.filter((point) => point.z === 5.13);
    expect(Math.abs(passage[0].x - passage[1].x)).toBeCloseTo(1.38);
    const cupboardDoor = floor.walls.find((wall) => wall.id === 'ground-cupboard-door')!;
    const kitchenDoorWall = floor.walls.find((wall) => wall.id === 'ground-kitchen-hall')!;
    expect(cupboardDoor.start.z).toBeCloseTo(kitchenDoorWall.start.z + kitchenDoorWall.openings[0].start);
  });

  it('starts the stairs in the hallway and connects both floors through the opening', () => {
    expect(house.stairs).toBeDefined();
    const stairs = house.stairs!;
    expect(stairs.turns).toHaveLength(6);
    expect(stairs.turns[0].elevation).toBeCloseTo(0.75);
    expect(stairs.turns.at(-1)!.elevation).toBeCloseTo(1.5);
    expect(floor.walls.find((wall) => wall.id === 'ground-cupboard-side')!.heights).toEqual({ start: 0.8, end: 2.05 });
    expect(stairs.flights[0].start.z).toBeGreaterThan(2.19);
    expect(stairs.flights[0].start.x).toBeLessThan(5.16);
    const last = stairs.flights.at(-1)!;
    expect(last.elevation + last.steps * last.rise).toBeCloseTo(house.wallHeight);
    expect(last.end.z).toBeCloseTo(2.0);
    expect(last.end.x).toBeGreaterThan(4.97);
    expect(last.end.x).toBeLessThan(6.03);
  });

  it('places the beige sofa opposite the TV with a corner cabinet and wall shelves', () => {
    const furniture = createDesign('Downstairs').furniture.filter((item) => item.floorId === 'ground');
    const sofa = furniture.find((item) => item.templateId === 'sofa' && item.colour === '#c2bcb4')!;
    const television = furniture.find((item) => item.templateId === 'media-unit')!;
    expect(sofa.position.x).toBeCloseTo(television.position.x);
    expect(sofa.position.z).toBeGreaterThan(4.5);
    expect(sofa.rotation).toBe(180);
    const sofaCorners = furnitureCorners(sofa);
    const bounds = { left: Math.min(...sofaCorners.map((point) => point.x)), right: Math.max(...sofaCorners.map((point) => point.x)), back: Math.min(...sofaCorners.map((point) => point.z)), front: Math.max(...sofaCorners.map((point) => point.z)) };
    expect(furniture.filter((item) => item.templateId === 'plant').every((item) => !furnitureCorners(item).some((point) => point.x > bounds.left && point.x < bounds.right && point.z > bounds.back && point.z < bounds.front))).toBe(true);
    expect(floor.walls.filter((wall) => wall.id.startsWith('ground-back-') && wall.faces.some((face) => face.roomId === 'ground-lounge')).flatMap((wall) => wall.openings)).toEqual([]);
    const cabinet = furniture.find((item) => item.templateId === 'cabinet');
    expect(cabinet).toMatchObject({ position: { z: 4.75 } });
    expect(furniture.some((item) => item.templateId === 'wall-shelves' && item.position.z < 0.5)).toBe(true);
    expect(furniture.flatMap(wallOverlaps)).toEqual([]);
    for (const item of furniture) expect(furnitureCorners(item).every((point) => point.x >= 0.18 - 1e-8 && point.x <= house.width - 0.18 + 1e-8 && point.z >= 0.18 - 1e-8 && point.z <= house.depth - 0.18 + 1e-8)).toBe(true);
  });
});

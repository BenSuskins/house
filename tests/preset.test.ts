import { describe, expect, it } from 'vitest';
import { createDesign, furnitureCorners, wallOverlaps } from '../src/domain/editor';
import { house } from '../src/domain/house';
import { validateContent } from '../src/domain/validation';

describe('the room photo furniture preset', () => {
  it('places two dining chairs on the kitchen side and two on the front window side', () => {
    const furniture = createDesign('My house').furniture;
    const table = furniture.find((item) => item.templateId === 'dining-table')!;
    const chairs = furniture.filter((item) => item.templateId === 'dining-chair');
    expect(chairs).toHaveLength(4);
    const kitchen = chairs.filter((item) => item.position.z < table.position.z);
    const window = chairs.filter((item) => item.position.z > table.position.z);
    expect(kitchen).toHaveLength(2);
    expect(window).toHaveLength(2);
    expect(kitchen.every((item) => item.rotation === 0)).toBe(true);
    expect(window.every((item) => item.rotation === 180)).toBe(true);
    expect(chairs.every((item) => Math.abs(item.position.x - table.position.x) < table.dimensions.width / 2)).toBe(true);
    expect(new Set(kitchen.map((item) => item.position.x)).size).toBe(2);
    expect(new Set(window.map((item) => item.position.x)).size).toBe(2);
  });

  it('starts the lounge with the two photographed sofas and ottoman inside the room', () => {
    const design = createDesign('My house');
    const sofas = design.furniture.filter((item) => item.floorId === 'ground' && item.templateId === 'sofa');
    expect(sofas).toHaveLength(2);
    expect(sofas.map((item) => item.colour).sort()).toEqual(['#56433f', '#c2bcb4']);
    const ottoman = design.furniture.find((item) => item.floorId === 'ground' && item.templateId === 'ottoman');
    expect(ottoman).toMatchObject({ colour: '#bdb7ad' });
    const lounge = house.floors[0].rooms.find((room) => room.id === 'ground-lounge')!;
    for (const item of [...sofas, ottoman!]) {
      for (const corner of furnitureCorners(item)) {
        expect(corner.x).toBeGreaterThanOrEqual(Math.min(...lounge.polygon.map((point) => point.x)));
        expect(corner.x).toBeLessThanOrEqual(Math.max(...lounge.polygon.map((point) => point.x)));
        expect(corner.z).toBeGreaterThanOrEqual(0.18);
        expect(corner.z).toBeLessThanOrEqual(5.13);
      }
    }
  });

  it('puts the brown sofa against the hallway wall clear of the lounge door and plants', () => {
    const furniture = createDesign('My house').furniture;
    const sofa = furniture.find((item) => item.floorId === 'ground' && item.templateId === 'sofa' && item.colour === '#56433f')!;
    const hallway = house.floors[0].walls.find((wall) => wall.id === 'ground-hall-lounge')!;
    expect(sofa.rotation).toBe(90);
    const corners = furnitureCorners(sofa);
    const left = Math.min(...corners.map((point) => point.x));
    const right = Math.max(...corners.map((point) => point.x));
    const back = Math.min(...corners.map((point) => point.z));
    const front = Math.max(...corners.map((point) => point.z));
    expect(right).toBeCloseTo(hallway.start.x - house.wallThickness / 2);
    expect(front).toBeLessThan(hallway.start.z + hallway.openings[0].start);
    const plants = furniture.filter((item) => item.floorId === 'ground' && item.templateId === 'plant');
    expect(plants.every((item) => !furnitureCorners(item).some((point) => point.x > left && point.x < right && point.z > back && point.z < front))).toBe(true);
  });

  it('uses the confirmed bedroom numbers for the daybed and triple-monitor desk', () => {
    const design = createDesign('My house');
    const bedroomTwo = design.furniture.filter((item) => item.floorId === 'first' && item.position.x < 3.6 && item.position.z > 2.62);
    const bedroomThree = design.furniture.filter((item) => item.floorId === 'first' && item.position.x < 3.6 && item.position.z < 2.62);
    expect(bedroomTwo.map((item) => item.templateId)).toEqual(expect.arrayContaining(['sofa', 'computer-desk', 'desk-chair']));
    expect(bedroomThree.map((item) => item.templateId)).toEqual(expect.arrayContaining(['daybed', 'desk', 'desk-chair', 'bookcase']));
    expect(bedroomTwo.some((item) => item.templateId === 'bookcase')).toBe(false);
    expect(bedroomThree.find((item) => item.templateId === 'bookcase')).toMatchObject({ position: { z: 2.37 }, rotation: 180 });
    expect(design.furniture.filter((item) => item.floorId === 'first' && ['double-bed', 'single-bed'].includes(item.templateId))).toHaveLength(1);
  });

  it('includes the TV unit and WC stool without wall overlaps or shared design data', () => {
    const design = createDesign('My house');
    expect(design.furniture.map((item) => item.templateId)).toEqual(expect.arrayContaining(['media-unit', 'stool']));
    expect(validateContent(design).ok).toBe(true);
    expect(design.furniture.flatMap(wallOverlaps)).toEqual([]);
    const other = createDesign('Another design');
    design.furniture[0].dimensions.width = 0.4;
    design.furniture[0].colour = '#000000';
    expect(other.furniture[0].dimensions.width).toBe(1.95);
    expect(other.furniture[0].colour).toBe('#56433f');
    expect(other.furniture[0].id).not.toBe(design.furniture[0].id);
  });
});

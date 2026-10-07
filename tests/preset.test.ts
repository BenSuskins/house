import { describe, expect, it } from 'vitest';
import { createDesign, furnitureCorners, wallOverlaps } from '../src/domain/editor';
import { house } from '../src/domain/house';
import { validateContent } from '../src/domain/validation';

describe('the room photo furniture preset', () => {
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

  it('uses the confirmed bedroom numbers for the daybed and triple-monitor desk', () => {
    const design = createDesign('My house');
    const bedroomTwo = design.furniture.filter((item) => item.floorId === 'first' && item.position.x > 5.4 && item.position.z > 2.62);
    const bedroomThree = design.furniture.filter((item) => item.floorId === 'first' && item.position.x > 5.4 && item.position.z < 2.62);
    expect(bedroomTwo.map((item) => item.templateId)).toEqual(expect.arrayContaining(['daybed', 'desk', 'desk-chair', 'bookcase']));
    expect(bedroomThree.map((item) => item.templateId)).toEqual(expect.arrayContaining(['sofa', 'computer-desk', 'desk-chair']));
    expect(bedroomThree.some((item) => item.templateId === 'bookcase')).toBe(false);
    expect(bedroomTwo.find((item) => item.templateId === 'bookcase')).toMatchObject({ position: { z: 2.87 }, rotation: 0 });
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

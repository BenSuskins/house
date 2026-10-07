import { z } from 'zod';
import { house } from './house';
import { catalogue } from './catalogue';
import { failure, insideFloor } from './editor';
import type { DesignContent, Result } from './types';

const colour = z.string().regex(/^#[\da-f]{6}$/i);
const dimension = z.number().finite().positive().max(10);
const furniture = z.object({
  id: z.string().min(1).max(100), templateId: z.string(), floorId: z.enum(['ground', 'first']),
  position: z.object({ x: z.number().finite(), z: z.number().finite() }),
  dimensions: z.object({ width: dimension, depth: dimension, height: dimension }),
  rotation: z.number().finite().min(0).lt(360), colour,
});
const content = z.object({
  name: z.string().trim().min(1).max(80), houseVersion: z.literal(house.version),
  wallColours: z.record(z.string(), colour),
  floorFinishes: z.record(z.string(), z.object({ material: z.enum(['wood', 'carpet', 'tile']), colour })),
  furniture: z.array(furniture).max(500),
});
const faceIds = house.floors.flatMap((floor) => floor.walls.flatMap((wall) => wall.faces.map((face) => face.id)));
const roomIds = house.floors.flatMap((floor) => floor.rooms.map((room) => room.id));
const sameKeys = (record: Record<string, unknown>, keys: string[]) => Object.keys(record).length === keys.length && keys.every((key) => Object.hasOwn(record, key));

export function validateContent(value: unknown): Result<DesignContent> {
  const parsed = content.safeParse(value);
  if (!parsed.success) return failure('invalid', 'Use a name, valid colours, and positive furniture dimensions for this house model.');
  const design = parsed.data;
  if (!sameKeys(design.wallColours, faceIds) || !sameKeys(design.floorFinishes, roomIds)) return failure('invalid', 'The design must contain all the wall faces and room finishes.');
  if (new Set(design.furniture.map((item) => item.id)).size !== design.furniture.length) return failure('invalid', 'Furniture identifiers must be unique.');
  if (design.furniture.some((item) => !catalogue.some((template) => template.id === item.templateId) || !insideFloor(item))) return failure('invalid', 'Use catalogue furniture within the floor boundary.');
  return { ok: true, value: design };
}

import type { FurnitureTemplate } from './types';

const furniture = (id: string, name: string, category: string, width: number, depth: number, height: number, colour: string): FurnitureTemplate => ({ id, name, category, dimensions: { width, depth, height }, colour });

export const catalogue: FurnitureTemplate[] = [
  furniture('sofa', 'Three-seat sofa', 'Seating', 2.1, 0.88, 0.8, '#91a4a9'),
  furniture('armchair', 'Lounge chair', 'Seating', 0.8, 0.82, 0.8, '#c4b5a0'),
  furniture('ottoman', 'Upholstered ottoman', 'Seating', 0.8, 0.76, 0.45, '#bdb7ad'),
  furniture('dining-chair', 'Dining chair', 'Seating', 0.46, 0.48, 0.83, '#ae9675'),
  furniture('desk-chair', 'Desk chair', 'Seating', 0.56, 0.56, 0.88, '#777e78'),
  furniture('bench', 'Wooden bench', 'Seating', 1.3, 0.4, 0.45, '#bda47e'),
  furniture('stool', 'Wooden stool', 'Seating', 0.28, 0.25, 0.25, '#ac784d'),
  furniture('coffee-table', 'Coffee table', 'Tables', 1.1, 0.6, 0.4, '#ad9575'),
  furniture('dining-table', 'Dining table', 'Tables', 1.3, 0.85, 0.75, '#beab8b'),
  furniture('desk', 'Writing desk', 'Tables', 1.2, 0.6, 0.75, '#c2ad8b'),
  furniture('double-bed', 'Double bed', 'Beds', 1.5, 2.05, 0.65, '#b8c0ad'),
  furniture('single-bed', 'Single bed', 'Beds', 0.95, 2.05, 0.65, '#b2bfbd'),
  furniture('daybed', 'Storage daybed', 'Beds', 2.05, 0.9, 0.85, '#4b5b43'),
  furniture('computer-desk', 'Triple-monitor desk', 'Tables', 1.7, 0.62, 1.18, '#bda984'),
  furniture('bedside-table', 'Bedside table', 'Storage', 0.45, 0.4, 0.5, '#c9b698'),
  furniture('wardrobe', 'Wardrobe', 'Storage', 1.2, 0.6, 2, '#d5c8b3'),
  furniture('drawers', 'Chest of drawers', 'Storage', 0.85, 0.45, 0.85, '#c9b89c'),
  furniture('bookcase', 'Bookcase', 'Storage', 0.85, 0.3, 1.65, '#c7b392'),
  furniture('tv-stand', 'TV stand', 'Storage', 1.4, 0.35, 0.5, '#a9977e'),
  furniture('media-unit', 'TV unit', 'Storage', 2.78, 0.4, 1.45, '#eeeae3'),
  furniture('rug', 'Woven rug', 'Decor', 2, 1.4, 0.015, '#e4d8c5'),
  furniture('floor-lamp', 'Floor lamp', 'Lighting', 0.4, 0.4, 1.55, '#b6aa94'),
  furniture('plant', 'Indoor plant', 'Decor', 0.45, 0.45, 0.85, '#6e886a'),
];

export const paintColours = ['#f2f0e9', '#e6dfd1', '#d8c9b6', '#c6cfbf', '#93a99b', '#93a6b2', '#c2b0b6', '#bd8270', '#696f69', '#3e4a50'];

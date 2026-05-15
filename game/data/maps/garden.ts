// Tile palette for the overworld. Keep IDs stable — map data references them.
export const TILE = {
  GRASS: 0,
  PATH: 1,
  TREE: 2,
  WATER: 3,
  FLOWER: 4,
} as const;

export type TileId = (typeof TILE)[keyof typeof TILE];

// Tiles the player cannot stand on.
export const SOLID_TILES: ReadonlySet<number> = new Set([TILE.TREE, TILE.WATER]);

export const TILE_SIZE = 16;

export type TileMap = {
  id: string;
  width: number;
  height: number;
  tiles: number[][];
  spawn: { x: number; y: number };
};

// 16 cols × 12 rows = 256×192, matches the game viewport exactly.
// 2 = trees (border), 1 = path, 0 = grass, 3 = water, 4 = flower.
export const gardenMap: TileMap = {
  id: "garden",
  width: 16,
  height: 12,
  spawn: { x: 7, y: 5 },
  tiles: [
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 0, 0, 4, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 2],
    [2, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 2],
    [2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 4, 2],
    [2, 0, 1, 0, 4, 0, 4, 0, 0, 4, 0, 0, 1, 0, 0, 2],
    [2, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2],
    [2, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 2],
    [2, 0, 4, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 2],
    [2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
    [2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  ],
};

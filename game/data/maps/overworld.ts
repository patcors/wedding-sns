// Map manifest — the single place that declares a Tiled map and the external
// tilesets it depends on. Adding a new map = add a MapManifest here and load it.
//
// Tilesets are kept EXTERNAL (.tsj) so they can be shared across maps and edited
// in one place. Phaser's Tiled loader can't follow the .tmj's "source" refs, so
// we resolve them in code (see game/systems/tilemap.ts). The `image` paths below
// are the *public* URLs to each tileset PNG (Tiled stores its own relative paths
// inside the .tsj, but we never use those — we load by the keys derived here).

export type TilesetRef = {
  /** Must match the tileset's "name" in both the .tsj and the .tmj reference. */
  name: string;
  /** Public URL to the external Tiled tileset JSON. */
  tsj: string;
  /** Public URL to the tileset's image. */
  image: string;
};

export type MapManifest = {
  /** Phaser tilemap cache key. */
  key: string;
  /** Public URL to the .tmj. */
  url: string;
  tilesets: TilesetRef[];
};

export const OVERWORLD: MapManifest = {
  key: "overworld",
  url: "/maps/overworld.tmj",
  tilesets: [
    {
      name: "Landscapes",
      tsj: "/tilesets/Landscapes.tsj",
      image: "/tilesets/tileset-outdoor.png",
    },
    {
      name: "Buildings",
      tsj: "/tilesets/Buildings.tsj",
      image: "/tilesets/Buildings.png",
    },
  ],
};

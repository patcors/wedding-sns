import Phaser from "phaser";
import type { MapManifest } from "../data/maps/overworld";

// Cache-key helpers — keep map/tileset-json/image keys derived in one place so
// the loader and the builder can't disagree.
const mapJsonKey = (m: MapManifest) => `map-json:${m.key}`;
const tsjKey = (name: string) => `tsj:${name}`;
const imageKey = (name: string) => `tiles:${name}`;

const basename = (path: string) => path.split("/").pop() ?? path;

/**
 * Queue every asset one or more maps need. Call from a scene's preload().
 * Tilesets shared between maps (keyed by name) are queued only once, so passing
 * the whole map list is safe and won't double-load the same image/json.
 */
export function loadMapAssets(
  scene: Phaser.Scene,
  maps: MapManifest | MapManifest[],
) {
  const list = Array.isArray(maps) ? maps : [maps];
  const seenTilesets = new Set<string>();
  for (const m of list) {
    scene.load.json(mapJsonKey(m), m.url);
    for (const ts of m.tilesets) {
      if (seenTilesets.has(ts.name)) continue;
      seenTilesets.add(ts.name);
      scene.load.json(tsjKey(ts.name), ts.tsj);
      scene.load.image(imageKey(ts.name), ts.image);
    }
  }
}

/**
 * Build a Phaser tilemap from a manifest whose tilesets live in external .tsj
 * files.
 *
 * Why this exists: Phaser's `load.tilemapTiledJSON` only reads tileset data that
 * is *embedded* in the .tmj. Our .tmj references tilesets by `"source":
 * "../tilesets/Foo.tsj"`, which Phaser can't follow — so here we splice each
 * external .tsj's JSON into the map (preserving the map's `firstgid`) and feed
 * the stitched result to Phaser via the tilemap cache.
 *
 * If this resolve step ever feels like more trouble than it's worth: open the
 * map in Tiled, right-click each tileset in the Tilesets panel -> "Embed
 * Tileset", save, and you can delete this function and just use
 * `this.load.tilemapTiledJSON(key, url)` in BootScene + `this.make.tilemap({ key })`.
 * Embedded tilesets are natively supported; the runtime cost difference is
 * negligible (a few KB of duplicated metadata per map).
 */
export function buildTilemap(
  scene: Phaser.Scene,
  m: MapManifest,
): Phaser.Tilemaps.Tilemap {
  if (!scene.cache.tilemap.exists(m.key)) {
    const raw = scene.cache.json.get(mapJsonKey(m));
    if (!raw) {
      throw new Error(`Map JSON not loaded for "${m.key}" — did preload run?`);
    }

    const tilesets = raw.tilesets.map((ts: { source?: string; firstgid: number }) => {
      if (!ts.source) return ts; // already embedded — leave it alone
      const ref = m.tilesets.find((r) => basename(r.tsj) === basename(ts.source!));
      if (!ref) {
        throw new Error(`No manifest entry for external tileset "${ts.source}"`);
      }
      const tsj = scene.cache.json.get(tsjKey(ref.name));
      if (!tsj) throw new Error(`Tileset JSON not loaded for "${ref.name}"`);
      // firstgid lives on the map's reference, not in the .tsj itself.
      return { ...tsj, firstgid: ts.firstgid };
    });

    scene.cache.tilemap.add(m.key, {
      format: Phaser.Tilemaps.Formats.TILED_JSON,
      data: { ...raw, tilesets },
    });
  }

  const map = scene.make.tilemap({ key: m.key });
  for (const ts of map.tilesets) {
    // Image key matches what loadMapAssets() registered for this tileset name.
    map.addTilesetImage(ts.name, imageKey(ts.name));
  }
  return map;
}

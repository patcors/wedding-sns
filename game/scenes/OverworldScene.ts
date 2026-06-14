import Phaser from "phaser";
import {
  animKey,
  BUSH_RUSTLE_ANIM,
  BUSH_SHEET,
  CHARACTER_SPRITES,
  CHARACTERS,
  CharacterId,
  CharacterSprite,
  Dir,
} from "../constants";
import { OVERWORLD } from "../data/maps/overworld";
import { buildTilemap } from "../systems/tilemap";
import { inputBus } from "../input/bus";
import { viewportZoom } from "../systems/viewport";

const STEP_MS = 200; // matches the 8fps walk anim — one full cycle per tile
const RUN_MS = 70; // hold Shift — ~3x walk speed; run anim keeps the legs in step

// Render the world this much bigger than its native 16px tiles, WITHOUT scaling
// the player — that's what "zoom the world, keep the character as is" means.
// Keep it an integer so pixel-art tiles stay crisp (1.5 would shimmer).
const WORLD_SCALE = 1;

// Depth bands. The player, bushes and other props are Y-SORTED: their depth IS
// their base (feet) world-Y, so whoever is further south draws on top — that's
// what lets the player pass behind a bush from the north and in front from the
// south. World-Y maxes out at the map height in pixels (a few hundred), so the
// always-on-top bands sit far above that, and ground layers far below it.
const ABOVE_PLAYER_DEPTH = 100_000; // roofs / treetops — always over everything
const LEAF_DEPTH = 90_000; // rustle particles — over props, under roofs
const HUD_DEPTH = 1_000_000; // screen-fixed name tag — over all of the above

export class OverworldScene extends Phaser.Scene {
  private tilemap!: Phaser.Tilemaps.Tilemap;
  private layers: Phaser.Tilemaps.TilemapLayer[] = [];
  private tileW = 16;
  private tileH = 16;

  private player!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  // Bush sprites converted from `bush=true` tiles, keyed by "x,y" tile coords so
  // a step can look up the bush it just walked into and rustle it.
  private bushes = new Map<string, Phaser.GameObjects.Sprite>();
  private leafEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private character: CharacterId = "sam";
  private sprite!: CharacterSprite;
  private tileX = 0;
  private tileY = 0;
  private moving = false;
  private facing: Dir = "down";

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<Dir, Phaser.Input.Keyboard.Key>;
  private pressed: Record<Dir, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false,
  };
  // True while the on-screen B button is held (see bindExternalInput); the
  // keyboard equivalent is Shift, checked separately in isRunning().
  private running = false;

  constructor() {
    super("Overworld");
  }

  // Bound field so on()/off() share one reference. Sets the camera zoom so a
  // fixed 240px-tall slice of world fills the (variable-size) canvas height.
  private applyViewportZoom = () => {
    this.cameras.main.setZoom(viewportZoom(this.scale));
  };

  create() {
    this.buildWorld();
    this.buildLeafEmitter();

    this.character =
      (this.registry.get("character") as CharacterId | undefined) ?? "sam";
    this.sprite = CHARACTER_SPRITES[this.character];

    const spawn = this.findSpawn();
    this.tileX = spawn.x;
    this.tileY = spawn.y;
    this.buildPlayer();
    this.placePlayer();

    // Camera follows the player around the larger world. No arcade physics —
    // movement is pure tweens, collision is the tile `collides` check in canEnter.
    this.cameras.main.setBounds(
      0,
      0,
      this.tilemap.widthInPixels * WORLD_SCALE,
      this.tilemap.heightInPixels * WORLD_SCALE,
    );
    // Lerp = 1 (locked follow), NOT eased. With roundPixels on, an eased
    // camera lags the tween and `round(player.x - scrollX)` wobbles ±1px —
    // visible as directional stutter (worse going right, since Math.round
    // biases toward +inf). Locking the camera keeps the player at a fixed
    // screen position, so it's smooth in every direction; the world still
    // scrolls smoothly because player.x itself is tweened per tile.
    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.cameras.main.setRoundPixels(true);

    // Scale.RESIZE keeps the camera viewport == the canvas == the GameBoy
    // screen, so we only set the zoom (how much world fills that screen) and let
    // bounds-clamping happen at the true visible edges. Re-apply on resize so an
    // orientation change keeps the same vertical slice of world.
    this.applyViewportZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.applyViewportZoom);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.applyViewportZoom);
    });

    this.bindKeys();
    this.bindExternalInput();
    this.bindTap();

    this.add
      .text(4, 4, CHARACTERS[this.character].name, {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#ffffff",
        backgroundColor: "#00000088",
        padding: { left: 3, right: 3, top: 1, bottom: 1 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH);

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  update() {
    // Y-sort the player against bushes every frame (even mid-step) so crossing a
    // bush's base line flips over/under at the right pixel. Player origin is its
    // feet, so player.y IS the sort key; the shadow rides just beneath it.
    this.player.setDepth(this.player.y);
    this.playerShadow.setDepth(this.player.y - 1);

    if (this.moving) return;

    // Hold-to-walk: isDown re-fires every frame while the key is held, so when
    // the previous step's tween completes (moving=false), the next update tick
    // immediately starts another step. Smooth tile-by-tile chain.
    let dir: Dir | null = null;
    if (this.cursors.up?.isDown || this.wasd.up.isDown || this.pressed.up) {
      dir = "up";
    } else if (
      this.cursors.down?.isDown ||
      this.wasd.down.isDown ||
      this.pressed.down
    ) {
      dir = "down";
    } else if (
      this.cursors.left?.isDown ||
      this.wasd.left.isDown ||
      this.pressed.left
    ) {
      dir = "left";
    } else if (
      this.cursors.right?.isDown ||
      this.wasd.right.isDown ||
      this.pressed.right
    ) {
      dir = "right";
    }

    if (dir) {
      this.step(dir);
    } else if (this.player.anims.isPlaying) {
      // No direction held and the step just finished — settle into idle.
      this.player.anims.stop();
      this.player.setFrame(this.sprite.idle[this.facing]);
    }
  }

  // --- world ---

  private buildWorld() {
    this.tilemap = buildTilemap(this, OVERWORLD);
    // tileW/tileH are the *rendered* tile size — the player is positioned on the
    // scaled grid. The player sprite itself stays native (see buildPlayer), so
    // the world zooms while the character keeps its size.
    this.tileW = this.tilemap.tileWidth * WORLD_SCALE;
    this.tileH = this.tilemap.tileHeight * WORLD_SCALE;

    // Render every tile layer in authoring order; mark collidable tiles via the
    // `collides` custom property set on tiles in the tileset (Tiled). Tagging is
    // done in Tiled — until tiles carry `collides=true`, only the map edge blocks.
    //
    // Layers flagged with the Tiled custom property `above-player` (bool) draw
    // OVER the character (treetops, roof eaves, archway tops) so the player can
    // walk behind them. The player is Y-sorted (depth = feet Y, a few hundred at
    // most), so these get pushed to ABOVE_PLAYER_DEPTH to clear it; everything
    // else stays beneath. Above-player layers are purely decorative overlap —
    // collision comes from the ground tiles below them, so we don't tag them
    // collidable or add them to the collision-checked `layers` list.
    this.layers = [];
    const allLayers: Phaser.Tilemaps.TilemapLayer[] = [];
    this.tilemap.layers.forEach((layerData, i) => {
      const layer = this.tilemap.createLayer(
        layerData.name,
        this.tilemap.tilesets,
        0,
        0,
      );
      if (!layer) return;
      layer.setScale(WORLD_SCALE);
      allLayers.push(layer);

      if (isAbovePlayerLayer(layerData)) {
        layer.setDepth(ABOVE_PLAYER_DEPTH + i);
        return;
      }

      layer.setDepth(i);
      layer.setCollisionByProperty({ collides: true });
      this.layers.push(layer);
    });

    // Convert `bush=true` tiles (wherever they're painted) into Y-sorted sprites
    // so the player can pass behind or in front of them and they can rustle.
    this.extractBushes(allLayers);
  }

  // Replace every tile carrying the Tiled custom property `bush=true` with an
  // animated bush sprite anchored at its base, then delete the marker tile so it
  // doesn't double-draw. The sprite's depth is its base Y (Y-sort), and the
  // ground layer beneath shows through the now-empty cell.
  private extractBushes(layers: Phaser.Tilemaps.TilemapLayer[]) {
    for (const layer of layers) {
      layer.forEachTile((tile) => {
        if (tile.properties?.bush !== true) return;
        const cx = tile.x * this.tileW + this.tileW / 2;
        const baseY = (tile.y + 1) * this.tileH;
        const bush = this.add
          .sprite(cx, baseY, BUSH_SHEET, 0)
          .setOrigin(0.5, 1)
          .setDepth(baseY);
        this.bushes.set(tileKey(tile.x, tile.y), bush);
        layer.removeTileAt(tile.x, tile.y);
      });
    }
  }

  // A pooled emitter reused for every rustle — a quick upward puff of leaf specks
  // that arc back down under gravity. The 2px "leaf" texture is generated once
  // and tinted green per particle, so no art asset is needed.
  private buildLeafEmitter() {
    if (!this.textures.exists("leaf")) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2);
      g.generateTexture("leaf", 2, 2);
      g.destroy();
    }
    this.leafEmitter = this.add
      .particles(0, 0, "leaf", {
        lifespan: 450,
        speed: { min: 18, max: 42 },
        angle: { min: 250, max: 290 }, // fan upward (270 = straight up)
        gravityY: 220,
        scale: { start: 1.4, end: 0 },
        alpha: { start: 1, end: 0 },
        rotate: { min: 0, max: 360 },
        tint: [0x2e7d32, 0x3f7d3a, 0x4caf50, 0x6ab04c],
        emitting: false,
      })
      .setDepth(LEAF_DEPTH);
  }

  // Shake a bush's leaves and spit a few specks — fired when the player walks in.
  private rustle(bush: Phaser.GameObjects.Sprite) {
    bush.play(BUSH_RUSTLE_ANIM, true);
    this.leafEmitter.emitParticleAt(bush.x, bush.y - this.tileH * 0.6, 5);
  }

  // Spawn from an object-layer Point named "spawn"; fall back to map center so
  // the scene never breaks while the map is still being authored.
  private findSpawn(): { x: number; y: number } {
    for (const objectLayer of this.tilemap.objects) {
      const spawn = objectLayer.objects.find((o) => o.name === "spawn");
      if (spawn && spawn.x != null && spawn.y != null) {
        // Object coords are in the map's native (unscaled) pixels.
        return {
          x: Math.floor(spawn.x / this.tilemap.tileWidth),
          y: Math.floor(spawn.y / this.tilemap.tileHeight),
        };
      }
    }
    return {
      x: Math.floor(this.tilemap.width / 2),
      y: Math.floor(this.tilemap.height / 2),
    };
  }

  // --- input ---

  private bindKeys() {
    const kb = this.input.keyboard;
    if (!kb) return;
    this.cursors = kb.createCursorKeys();
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.wasd = {
      up: kb.addKey(K.W),
      down: kb.addKey(K.S),
      left: kb.addKey(K.A),
      right: kb.addKey(K.D),
    };
  }

  private bindExternalInput() {
    // React-rendered D-pad on the DS shell talks to us via the input bus.
    const offPress = inputBus.onPress((dir) => {
      this.pressed[dir] = true;
    });
    const offRelease = inputBus.onRelease((dir) => {
      this.pressed[dir] = false;
    });
    // Hold B to run (mirrors holding Shift on the keyboard).
    const offActionPress = inputBus.onActionPress((action) => {
      if (action === "b") this.running = true;
    });
    const offActionRelease = inputBus.onActionRelease((action) => {
      if (action === "b") this.running = false;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offPress();
      offRelease();
      offActionPress();
      offActionRelease();
    });
  }

  private bindTap() {
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      const px = this.tileX * this.tileW + this.tileW / 2;
      const py = this.tileY * this.tileH + this.tileH / 2;
      const dx = world.x - px;
      const dy = world.y - py;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      const dir: Dir =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
            ? "down"
            : "up";
      this.pressed[dir] = true;
    });
    this.input.on("pointerup", () => {
      this.pressed.up = false;
      this.pressed.down = false;
      this.pressed.left = false;
      this.pressed.right = false;
    });
  }

  // --- movement ---

  private step(dir: Dir) {
    this.facing = dir;
    const [dx, dy] = dirToDelta(dir);
    const nx = this.tileX + dx;
    const ny = this.tileY + dy;
    if (!this.canEnter(nx, ny)) {
      this.bump(dir);
      return;
    }
    this.moving = true;
    this.tileX = nx;
    this.tileY = ny;

    // Walking into a bush tile rustles it (and pops a few leaves).
    const bush = this.bushes.get(tileKey(nx, ny));
    if (bush) this.rustle(bush);

    const running = this.isRunning();
    const duration = running ? RUN_MS : STEP_MS;

    // Use the dedicated run cycle when the sheet has one; otherwise reuse the
    // walk anim sped up so the legs keep pace with the faster tile step.
    const useRunAnim = running && !!this.sprite.run;
    this.player.anims.play(
      animKey(this.character, useRunAnim ? "run" : "walk", dir),
      true,
    );
    this.player.anims.timeScale = running && !useRunAnim ? STEP_MS / RUN_MS : 1;

    const targetX = nx * this.tileW + this.tileW / 2;
    const targetY = ny * this.tileH + this.tileH / 2;

    this.tweens.add({
      targets: [this.player, this.playerShadow],
      x: targetX,
      duration,
    });
    this.tweens.add({
      targets: this.player,
      // Sprite anchors at feet (origin 0.5, 1) — keep that math centralised.
      y: targetY + this.playerYOffset(),
      duration,
    });
    this.tweens.add({
      targets: this.playerShadow,
      y: targetY + 6,
      duration,
      onComplete: () => {
        // Leave the walk anim running — update() decides whether to stop it
        // based on whether a direction is still held. That keeps the cycle
        // smooth across consecutive same-direction steps.
        this.moving = false;
      },
    });
  }

  private bump(dir: Dir) {
    if (this.moving) return;
    this.moving = true;
    this.facing = dir;
    this.player.anims.stop();
    this.player.setFrame(this.sprite.idle[dir]);
    const [dx, dy] = dirToDelta(dir);
    const baseX = this.tileX * this.tileW + this.tileW / 2;
    const baseY = this.tileY * this.tileH + this.tileH / 2;
    const feetY = baseY + this.playerYOffset();
    this.tweens.add({
      targets: this.player,
      x: baseX + dx * 3,
      y: feetY + dy * 3,
      duration: 80,
      yoyo: true,
      onComplete: () => {
        this.player.setPosition(baseX, feetY);
        this.playerShadow.setPosition(baseX, baseY + 6);
        this.moving = false;
      },
    });
    this.tweens.add({
      targets: this.playerShadow,
      x: baseX + dx * 3,
      y: baseY + 6 + dy * 3,
      duration: 80,
      yoyo: true,
    });
  }

  // Hold Shift (keyboard) or the B button (touch) to run. createCursorKeys()
  // exposes the Shift key for us; `running` tracks the B button via the bus.
  private isRunning() {
    return !!this.cursors.shift?.isDown || this.running;
  }

  private canEnter(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.tilemap.width || y >= this.tilemap.height) {
      return false;
    }
    // Blocked if any layer has a `collides`-tagged tile at this cell.
    for (const layer of this.layers) {
      const tile = layer.getTileAt(x, y);
      if (tile && tile.collides) return false;
    }
    return true;
  }

  // --- player ---

  private placePlayer() {
    const cx = this.tileX * this.tileW + this.tileW / 2;
    const cy = this.tileY * this.tileH + this.tileH / 2;
    this.player.setPosition(cx, cy + this.playerYOffset());
    this.playerShadow.setPosition(cx, cy + 6);
    // Seed the Y-sort depth so the first rendered frame is already correct;
    // update() keeps it in step thereafter.
    this.player.setDepth(this.player.y);
    this.playerShadow.setDepth(this.player.y - 1);
  }

  private buildPlayer() {
    // Anchor at the sprite's feet so y maps onto the tile regardless of the
    // sheet's frame height (Sam is 32x48, Sarah 32x32).
    this.playerShadow = this.add.ellipse(0, 0, 14, 5, 0x000000, 0.35);
    this.player = this.add.sprite(
      0,
      0,
      this.sprite.sheetKey,
      this.sprite.idle.down,
    );
    this.player.setOrigin(0.5, 1);
    // Depth is Y-sorted (see update/placePlayer) so the player interleaves with
    // bushes; no fixed depth here.
  }

  // Sprite is anchored at its feet; nudge them just below the tile center so the
  // character visually stands on the tile.
  private playerYOffset() {
    return this.tileH / 2 + 2;
  }
}

// True when a Tiled tile layer carries the custom property `above-player` set to
// true. Tiled exports layer properties as an array of {name, type, value}; some
// Phaser paths normalise them to a plain object, so handle both shapes.
function isAbovePlayerLayer(layerData: Phaser.Tilemaps.LayerData): boolean {
  const props = (layerData as { properties?: unknown }).properties;
  if (Array.isArray(props)) {
    return props.some(
      (p: { name?: string; value?: unknown }) =>
        p?.name === "above-player" && p.value === true,
    );
  }
  if (props && typeof props === "object") {
    return (props as Record<string, unknown>)["above-player"] === true;
  }
  return false;
}

const tileKey = (x: number, y: number) => `${x},${y}`;

function dirToDelta(dir: Dir): [number, number] {
  switch (dir) {
    case "up":
      return [0, -1];
    case "down":
      return [0, 1];
    case "left":
      return [-1, 0];
    case "right":
      return [1, 0];
  }
}

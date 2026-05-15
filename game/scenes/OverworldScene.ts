import Phaser from "phaser";
import { ASSETS, CHARACTERS, CharacterId, PLAYER_ANIM } from "../constants";
import {
  gardenMap,
  SOLID_TILES,
  TILE,
  TILE_SIZE,
  TileMap,
} from "../data/maps/garden";

type Dir = "up" | "down" | "left" | "right";

const STEP_MS = 200; // matches the 8fps walk anim — one full cycle per tile

// Mobile controls (or any external UI) fire these events on the scene.
// Pattern from ../pokemon-phaser — a React-rendered d-pad can emit these.
export const INPUT_EVENT: Record<Dir, string> = {
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
};

export class OverworldScene extends Phaser.Scene {
  private map!: TileMap;
  private player!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
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

  constructor() {
    super("Overworld");
  }

  create() {
    this.map = gardenMap;
    this.ensureTileTextures();
    this.drawMap();

    const character =
      (this.registry.get("character") as CharacterId | undefined) ?? "sam";

    this.tileX = this.map.spawn.x;
    this.tileY = this.map.spawn.y;
    this.buildPlayer(character);
    this.placePlayer();

    // Camera follows the player around the larger world. No arcade physics —
    // movement is pure tweens, collision is the SOLID_TILES check in canEnter.
    const worldW = this.map.width * TILE_SIZE;
    const worldH = this.map.height * TILE_SIZE;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setRoundPixels(true);

    this.bindKeys();
    this.bindExternalInput();
    this.bindTap();

    this.add
      .text(4, 4, CHARACTERS[character].name, {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#ffffff",
        backgroundColor: "#00000088",
        padding: { left: 3, right: 3, top: 1, bottom: 1 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  update() {
    if (this.moving) return;

    let dir: Dir | null = null;
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.up!) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.up) ||
      this.pressed.up
    ) dir = "up";
    else if (
      Phaser.Input.Keyboard.JustDown(this.cursors.down!) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.down) ||
      this.pressed.down
    ) dir = "down";
    else if (
      Phaser.Input.Keyboard.JustDown(this.cursors.left!) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.left) ||
      this.pressed.left
    ) dir = "left";
    else if (
      Phaser.Input.Keyboard.JustDown(this.cursors.right!) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.right) ||
      this.pressed.right
    ) dir = "right";

    if (dir) this.step(dir);
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
    (Object.entries(INPUT_EVENT) as [Dir, string][]).forEach(([dir, evt]) => {
      this.events.on(evt, () => {
        this.pressed[dir] = true;
      });
      this.events.on(`${evt}Up`, () => {
        this.pressed[dir] = false;
      });
    });
  }

  private bindTap() {
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      const px = this.tileX * TILE_SIZE + TILE_SIZE / 2;
      const py = this.tileY * TILE_SIZE + TILE_SIZE / 2;
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

    this.player.anims.play(walkAnimFor(dir), true);

    const targetX = nx * TILE_SIZE + TILE_SIZE / 2;
    const targetY = ny * TILE_SIZE + TILE_SIZE / 2;

    this.tweens.add({
      targets: [this.player, this.playerShadow],
      x: targetX,
      duration: STEP_MS,
    });
    this.tweens.add({
      targets: this.player,
      // Sprite anchors at feet (origin 0.5, 1) — keep that math centralised.
      y: targetY + this.playerYOffset(),
      duration: STEP_MS,
    });
    this.tweens.add({
      targets: this.playerShadow,
      y: targetY + 6,
      duration: STEP_MS,
      onComplete: () => {
        this.moving = false;
        this.player.anims.stop();
        this.player.setFrame(idleFrameFor(this.facing));
      },
    });
  }

  private bump(dir: Dir) {
    if (this.moving) return;
    this.moving = true;
    this.facing = dir;
    this.player.setFrame(idleFrameFor(dir));
    const [dx, dy] = dirToDelta(dir);
    const baseX = this.tileX * TILE_SIZE + TILE_SIZE / 2;
    const baseY = this.tileY * TILE_SIZE + TILE_SIZE / 2;
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

  private canEnter(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) {
      return false;
    }
    return !SOLID_TILES.has(this.map.tiles[y][x]);
  }

  // --- rendering ---

  private drawMap() {
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.map.tiles[y][x];
        // Vary grass tiles so the world doesn't read as a uniform graph-paper grid.
        const key =
          tile === TILE.GRASS
            ? grassVariantKey((x * 31 + y * 17) % 3)
            : tileKey(tile);
        this.add.image(x * TILE_SIZE, y * TILE_SIZE, key).setOrigin(0, 0);

        // Tall grass = FRLG grass clump on top of a grass base.
        if (tile === TILE.TALL_GRASS) {
          this.add
            .image(x * TILE_SIZE, y * TILE_SIZE, ASSETS.GRASS_CLUMP)
            .setOrigin(0, 0)
            .setDepth(5);
        }
      }
    }
  }

  private placePlayer() {
    const cx = this.tileX * TILE_SIZE + TILE_SIZE / 2;
    const cy = this.tileY * TILE_SIZE + TILE_SIZE / 2;
    this.player.setPosition(cx, cy + this.playerYOffset());
    this.playerShadow.setPosition(cx, cy + 6);
  }

  private buildPlayer(id: CharacterId) {
    // The Brendan sheet is 32x48; we anchor at its feet so y maps to the tile.
    // TODO: source a May/Leaf sheet for Sarah — for now Sarah is tinted Brendan.
    this.playerShadow = this.add.ellipse(0, 0, 14, 5, 0x000000, 0.35);
    this.playerShadow.setDepth(9);
    this.player = this.add.sprite(0, 0, ASSETS.PLAYER_SHEET, 0);
    this.player.setOrigin(0.5, 1);
    this.player.setDepth(10);
    if (id === "sarah") this.player.setTint(CHARACTERS.sarah.accent);
  }

  // Player sprite is 48px tall and anchored at feet. Feet should sit slightly
  // below the tile center so it visually stands on the tile.
  private playerYOffset() {
    return TILE_SIZE / 2 + 2;
  }

  // --- generated tile textures (placeholders until a real tileset lands) ---

  private ensureTileTextures() {
    const t = TILE_SIZE;
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    const make = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return;
      g.clear();
      draw(g);
      g.generateTexture(key, t, t);
    };

    // Three grass variants — picked deterministically per (x,y) so it looks
    // organic but doesn't shimmer.
    const baseGrass = (g: Phaser.GameObjects.Graphics) => {
      g.fillStyle(0x5ea744).fillRect(0, 0, t, t);
      g.fillStyle(0x6fbd55, 0.9).fillRect(0, 0, t, 6);
      g.fillStyle(0x4d8a37, 0.5).fillRect(0, t - 3, t, 3);
    };
    make(grassVariantKey(0), (g) => {
      baseGrass(g);
      g.fillStyle(0x3e7032).fillRect(3, 11, 1, 1);
      g.fillRect(10, 6, 1, 1);
      g.fillRect(6, 2, 1, 1);
    });
    make(grassVariantKey(1), (g) => {
      baseGrass(g);
      g.fillStyle(0x3e7032).fillRect(12, 12, 1, 1);
      g.fillRect(2, 7, 1, 1);
      g.fillStyle(0x6fbd55).fillRect(8, 9, 1, 1);
    });
    make(grassVariantKey(2), (g) => {
      baseGrass(g);
      g.fillStyle(0x3e7032).fillRect(5, 5, 1, 1);
      g.fillRect(13, 3, 1, 1);
      g.fillRect(9, 13, 1, 1);
    });

    make(tileKey(TILE.PATH), (g) => {
      g.fillStyle(0xd6b884).fillRect(0, 0, t, t);
      g.fillStyle(0xc5a570).fillRect(0, 0, t, 2);
      g.fillStyle(0xe4cca0, 0.5).fillRect(0, t - 2, t, 2);
      g.fillStyle(0xa88a55, 0.7).fillRect(3, 5, 1, 1);
      g.fillRect(11, 9, 1, 1);
      g.fillRect(7, 13, 1, 1);
      g.fillRect(13, 3, 1, 1);
    });

    make(tileKey(TILE.TREE), (g) => {
      // Dark canopy with leaf bumps + trunk hint.
      g.fillStyle(0x1f3a1f).fillRect(0, 0, t, t);
      g.fillStyle(0x2d5a2d).fillRect(1, 1, t - 2, t - 2);
      g.fillStyle(0x3d7a3d).fillRect(2, 2, 4, 3);
      g.fillRect(9, 4, 4, 3);
      g.fillRect(4, 9, 4, 3);
      g.fillRect(10, 10, 3, 3);
      g.fillStyle(0x4f9a4f).fillRect(3, 3, 1, 1);
      g.fillRect(11, 11, 1, 1);
      g.lineStyle(1, 0x0a1a0a, 1).strokeRect(0, 0, t, t);
    });

    make(tileKey(TILE.WATER), (g) => {
      g.fillStyle(0x2e5b9b).fillRect(0, 0, t, t);
      g.fillStyle(0x4079c0).fillRect(0, 0, t, 5);
      g.fillStyle(0x6aa0d8, 0.8).fillRect(2, 3, 5, 1);
      g.fillRect(9, 9, 5, 1);
      g.fillRect(4, 13, 3, 1);
      g.fillStyle(0x9ec4e8, 0.7).fillRect(3, 2, 2, 1);
      g.fillRect(10, 8, 2, 1);
    });

    make(tileKey(TILE.FLOWER), (g) => {
      // Grass base + a flower cluster.
      g.fillStyle(0x5ea744).fillRect(0, 0, t, t);
      g.fillStyle(0x6fbd55, 0.9).fillRect(0, 0, t, 6);
      g.fillStyle(0xfde68a).fillRect(7, 5, 2, 2);
      g.fillStyle(0xf9a8d4).fillRect(6, 7, 2, 2);
      g.fillRect(9, 7, 2, 2);
      g.fillRect(7, 9, 2, 2);
      g.fillStyle(0xc04080).fillRect(7, 8, 1, 1);
    });

    // Tall-grass base (a grass tile; the FRLG_Grass clump is layered on top).
    make(tileKey(TILE.TALL_GRASS), baseGrass);

    g.destroy();
  }
}

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

function walkAnimFor(dir: Dir) {
  return {
    up: PLAYER_ANIM.walkUp,
    down: PLAYER_ANIM.walkDown,
    left: PLAYER_ANIM.walkLeft,
    right: PLAYER_ANIM.walkRight,
  }[dir];
}

// First frame of each row is the standing pose.
function idleFrameFor(dir: Dir) {
  return { down: 0, left: 4, right: 8, up: 12 }[dir];
}

function tileKey(tile: number) {
  return `tile-${tile}`;
}

function grassVariantKey(i: number) {
  return `tile-grass-${i}`;
}

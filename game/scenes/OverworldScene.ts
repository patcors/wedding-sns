import Phaser from "phaser";
import { CHARACTERS, CharacterId } from "../constants";
import {
  gardenMap,
  SOLID_TILES,
  TILE,
  TILE_SIZE,
  TileMap,
} from "../data/maps/garden";

type Dir = "up" | "down" | "left" | "right";

const STEP_MS = 140;

// Mobile controls (or any external UI) fire these events on the scene.
// Pattern lifted from ../pokemon-phaser — keep names stable; a future
// React-rendered d-pad will emit the same strings into the active scene.
export const INPUT_EVENT: Record<Dir, string> = {
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
};

export class OverworldScene extends Phaser.Scene {
  private map!: TileMap;
  private player!: Phaser.GameObjects.Container;
  private tileX = 0;
  private tileY = 0;
  private moving = false;

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
    this.ensurePlayerTexture(character);

    this.tileX = this.map.spawn.x;
    this.tileY = this.map.spawn.y;
    this.player = this.buildPlayer(character);
    this.placePlayer();

    this.bindKeys();
    this.bindExternalInput();
    this.bindTap();

    this.add
      .text(4, 4, CHARACTERS[character].name, {
        fontFamily: "monospace",
        fontSize: "7px",
        color: "#ffffff",
        backgroundColor: "#00000080",
        padding: { left: 2, right: 2, top: 1, bottom: 1 },
      })
      .setScrollFactor(0);

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  update() {
    if (this.moving) return;

    // Keyboard: JustDown for one-tile-per-press (Pokémon-style).
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.up!) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.up) ||
      this.pressed.up
    ) {
      this.step("up");
    } else if (
      Phaser.Input.Keyboard.JustDown(this.cursors.down!) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.down) ||
      this.pressed.down
    ) {
      this.step("down");
    } else if (
      Phaser.Input.Keyboard.JustDown(this.cursors.left!) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.left) ||
      this.pressed.left
    ) {
      this.step("left");
    } else if (
      Phaser.Input.Keyboard.JustDown(this.cursors.right!) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.right) ||
      this.pressed.right
    ) {
      this.step("right");
    }
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
    // Named events for non-keyboard input (mobile d-pad, etc.).
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
    // Tap: move one step in the dominant direction toward the tap point.
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      const px = this.tileX * TILE_SIZE + TILE_SIZE / 2;
      const py = this.tileY * TILE_SIZE + TILE_SIZE / 2;
      const dx = world.x - px;
      const dy = world.y - py;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
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
    this.tweens.add({
      targets: this.player,
      x: nx * TILE_SIZE + TILE_SIZE / 2,
      y: ny * TILE_SIZE + TILE_SIZE / 2,
      duration: STEP_MS,
      onComplete: () => {
        this.moving = false;
      },
    });
  }

  private bump(dir: Dir) {
    if (this.moving) return;
    this.moving = true;
    const [dx, dy] = dirToDelta(dir);
    const baseX = this.tileX * TILE_SIZE + TILE_SIZE / 2;
    const baseY = this.tileY * TILE_SIZE + TILE_SIZE / 2;
    this.tweens.add({
      targets: this.player,
      x: baseX + dx * 3,
      y: baseY + dy * 3,
      duration: 80,
      yoyo: true,
      onComplete: () => {
        this.player.setPosition(baseX, baseY);
        this.moving = false;
      },
    });
  }

  private canEnter(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) {
      return false;
    }
    const tile = this.map.tiles[y][x];
    return !SOLID_TILES.has(tile);
  }

  // --- rendering ---

  private drawMap() {
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.map.tiles[y][x];
        this.add.image(x * TILE_SIZE, y * TILE_SIZE, tileKey(tile)).setOrigin(0, 0);
      }
    }
  }

  private placePlayer() {
    this.player.setPosition(
      this.tileX * TILE_SIZE + TILE_SIZE / 2,
      this.tileY * TILE_SIZE + TILE_SIZE / 2,
    );
  }

  private buildPlayer(id: CharacterId) {
    const c = this.add.container(0, 0);
    const shadow = this.add.ellipse(0, 5, 12, 4, 0x000000, 0.35);
    const sprite = this.add.image(0, -2, playerTextureKey(id));
    c.add([shadow, sprite]);
    c.setDepth(10);
    return c;
  }

  // --- generated textures (placeholder until real tile/character art lands) ---

  private ensureTileTextures() {
    const t = TILE_SIZE;
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    const make = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return;
      g.clear();
      draw(g);
      g.generateTexture(key, t, t);
    };

    make(tileKey(TILE.GRASS), (g) => {
      g.fillStyle(0x4f8c3f).fillRect(0, 0, t, t);
      g.fillStyle(0x6aa84f).fillRect(0, 0, t, t / 2);
      g.fillStyle(0x3e7032, 0.6).fillRect(3, 11, 2, 1);
      g.fillRect(10, 6, 2, 1);
    });

    make(tileKey(TILE.PATH), (g) => {
      g.fillStyle(0xc9a877).fillRect(0, 0, t, t);
      g.fillStyle(0xb59560, 0.6).fillRect(2, 2, 1, 1);
      g.fillRect(11, 5, 1, 1);
      g.fillRect(6, 12, 1, 1);
    });

    make(tileKey(TILE.TREE), (g) => {
      g.fillStyle(0x2d5a2d).fillRect(0, 0, t, t);
      g.fillStyle(0x1e3f1e).fillRect(0, 0, t, 4);
      g.fillStyle(0x3a7a3a).fillRect(2, 6, 3, 2);
      g.fillRect(9, 9, 3, 2);
      g.lineStyle(1, 0x0e2210, 1).strokeRect(0, 0, t, t);
    });

    make(tileKey(TILE.WATER), (g) => {
      g.fillStyle(0x3a6fb0).fillRect(0, 0, t, t);
      g.fillStyle(0x6aa0d8, 0.7).fillRect(2, 3, 4, 1);
      g.fillRect(9, 8, 4, 1);
      g.fillRect(4, 12, 3, 1);
    });

    make(tileKey(TILE.FLOWER), (g) => {
      g.fillStyle(0x6aa84f).fillRect(0, 0, t, t);
      g.fillStyle(0xfde68a).fillRect(7, 6, 2, 2);
      g.fillStyle(0xf9a8d4).fillRect(6, 8, 2, 2);
      g.fillRect(9, 8, 2, 2);
      g.fillRect(7, 10, 2, 2);
    });

    g.destroy();
  }

  private ensurePlayerTexture(id: CharacterId) {
    const key = playerTextureKey(id);
    if (this.textures.exists(key)) return;
    const accent = CHARACTERS[id].accent;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xf5d0b0).fillRect(3, 1, 6, 5);
    g.fillStyle(0x1c1c24).fillRect(3, 1, 6, 1);
    g.fillStyle(accent).fillRect(2, 6, 8, 6);
    g.fillStyle(0x2a2a32).fillRect(3, 12, 2, 2);
    g.fillRect(7, 12, 2, 2);
    g.generateTexture(key, 12, 14);
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

function tileKey(tile: number) {
  return `tile-${tile}`;
}

function playerTextureKey(id: CharacterId) {
  return `player-${id}`;
}

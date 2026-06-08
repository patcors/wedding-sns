import Phaser from "phaser";
import { ASSETS, CHARACTERS, CharacterId, PLAYER_ANIM } from "../constants";
import { OVERWORLD } from "../data/maps/overworld";
import { buildTilemap } from "../systems/tilemap";
import { inputBus } from "../input/bus";

type Dir = "up" | "down" | "left" | "right";

const STEP_MS = 200; // matches the 8fps walk anim — one full cycle per tile
const RUN_MS = 100; // hold Shift — 2x faster per tile

// Render the world this much bigger than its native 16px tiles, WITHOUT scaling
// the player — that's what "zoom the world, keep the character as is" means.
// Keep it an integer so pixel-art tiles stay crisp (1.5 would shimmer).
const WORLD_SCALE = 2;

export class OverworldScene extends Phaser.Scene {
  private tilemap!: Phaser.Tilemaps.Tilemap;
  private layers: Phaser.Tilemaps.TilemapLayer[] = [];
  private tileW = 16;
  private tileH = 16;

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
    this.buildWorld();

    const character =
      (this.registry.get("character") as CharacterId | undefined) ?? "sam";

    const spawn = this.findSpawn();
    this.tileX = spawn.x;
    this.tileY = spawn.y;
    this.buildPlayer(character);
    this.placePlayer();

    // Camera follows the player around the larger world. No arcade physics —
    // movement is pure tweens, collision is the tile `collides` check in canEnter.
    this.cameras.main.setBounds(
      0,
      0,
      this.tilemap.widthInPixels * WORLD_SCALE,
      this.tilemap.heightInPixels * WORLD_SCALE,
    );
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
      this.player.setFrame(idleFrameFor(this.facing));
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
    this.layers = [];
    this.tilemap.layers.forEach((layerData, i) => {
      const layer = this.tilemap.createLayer(
        layerData.name,
        this.tilemap.tilesets,
        0,
        0,
      );
      if (!layer) return;
      layer.setScale(WORLD_SCALE);
      layer.setDepth(i);
      layer.setCollisionByProperty({ collides: true });
      this.layers.push(layer);
    });
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offPress();
      offRelease();
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

    const running = this.isRunning();
    const duration = running ? RUN_MS : STEP_MS;

    this.player.anims.play(walkAnimFor(dir), true);
    // Speed the leg cycle to match the faster tile step so it doesn't moonwalk.
    this.player.anims.timeScale = running ? STEP_MS / RUN_MS : 1;

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
    this.player.setFrame(idleFrameFor(dir));
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

  // Hold Shift to run. createCursorKeys() exposes the Shift key for us.
  private isRunning() {
    return !!this.cursors.shift?.isDown;
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
    return this.tileH / 2 + 2;
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

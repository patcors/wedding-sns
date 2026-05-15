import Phaser from "phaser";
import { ASSETS, PLAYER_ANIM } from "../constants";

// Preloads assets and hands off to the title screen.
// Sprite layout for player.png (ripped FRLG Brendan): 128x192, 4 cols x 4 rows,
// each frame 32x48. Row order: down, left, right, up (4 walk frames each).
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    this.load.spritesheet(ASSETS.PLAYER_SHEET, "/pokemon-phaser/player.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.image(ASSETS.GRASS_CLUMP, "/pokemon-phaser/grass-clump.png");
  }

  create() {
    this.createPlayerAnims();
    this.scene.start("Title");
  }

  private createPlayerAnims() {
    const sheet = ASSETS.PLAYER_SHEET;
    const rate = 8;
    this.anims.create({
      key: PLAYER_ANIM.walkDown,
      frames: this.anims.generateFrameNumbers(sheet, { start: 0, end: 3 }),
      frameRate: rate,
      repeat: -1,
    });
    this.anims.create({
      key: PLAYER_ANIM.walkLeft,
      frames: this.anims.generateFrameNumbers(sheet, { start: 4, end: 7 }),
      frameRate: rate,
      repeat: -1,
    });
    this.anims.create({
      key: PLAYER_ANIM.walkRight,
      frames: this.anims.generateFrameNumbers(sheet, { start: 8, end: 11 }),
      frameRate: rate,
      repeat: -1,
    });
    this.anims.create({
      key: PLAYER_ANIM.walkUp,
      frames: this.anims.generateFrameNumbers(sheet, { start: 12, end: 15 }),
      frameRate: rate,
      repeat: -1,
    });
  }
}

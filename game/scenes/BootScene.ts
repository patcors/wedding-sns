import Phaser from "phaser";
import {
  animKey,
  BUSH_FRAME_SIZE,
  BUSH_RUSTLE_ANIM,
  BUSH_SHEET,
  BUSH_TEXTURE_PATH,
  CHARACTER_SPRITES,
  CharacterSprite,
  DEV_DEFAULT_CHARACTER,
  DEV_SKIP_INTRO,
  Dir,
  TRACKS,
} from "../constants";
import { OVERWORLD } from "../data/maps/overworld";
import { loadMapAssets } from "../systems/tilemap";

const DIRS: Dir[] = ["down", "left", "right", "up"];

// Preloads assets and hands off to the title screen. Each playable character
// gets its own spritesheet + walk/run anims, all driven by CHARACTER_SPRITES.
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    for (const sprite of Object.values(CHARACTER_SPRITES)) {
      this.load.spritesheet(sprite.sheetKey, sprite.texturePath, {
        frameWidth: sprite.frameWidth,
        frameHeight: sprite.frameHeight,
      });
      // Character-select portrait — a single image, not a spritesheet.
      this.load.image(sprite.selectKey, sprite.selectPath);
    }
    this.load.spritesheet(BUSH_SHEET, BUSH_TEXTURE_PATH, {
      frameWidth: BUSH_FRAME_SIZE,
      frameHeight: BUSH_FRAME_SIZE,
    });
    loadMapAssets(this, OVERWORLD);
    for (const track of Object.values(TRACKS)) {
      this.load.audio(track.key, track.path);
    }
  }

  create() {
    for (const [id, sprite] of Object.entries(CHARACTER_SPRITES)) {
      this.createCharacterAnims(id as keyof typeof CHARACTER_SPRITES, sprite);
    }

    // Walk-through rustle: snap to the displaced frame and shake back to rest.
    // Plays once (no repeat) — re-triggered each time the player enters a bush.
    this.anims.create({
      key: BUSH_RUSTLE_ANIM,
      frames: this.anims.generateFrameNumbers(BUSH_SHEET, {
        frames: [1, 0, 1, 0],
      }),
      frameRate: 16,
      repeat: 0,
    });

    if (this.shouldSkipIntro()) {
      this.registry.set("character", DEV_DEFAULT_CHARACTER);
      this.scene.start("Overworld");
      return;
    }
    this.scene.start("Title");
  }

  // Dev shortcut: jump straight into the overworld. ?intro forces the real
  // Title -> CharacterSelect opening even in development.
  private shouldSkipIntro() {
    if (!DEV_SKIP_INTRO) return false;
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("intro")
    ) {
      return false;
    }
    return true;
  }

  private createCharacterAnims(
    id: keyof typeof CHARACTER_SPRITES,
    sprite: CharacterSprite,
  ) {
    for (const dir of DIRS) {
      this.anims.create({
        key: animKey(id, "walk", dir),
        frames: this.anims.generateFrameNumbers(sprite.sheetKey, {
          frames: sprite.walk[dir],
        }),
        frameRate: sprite.frameRate,
        repeat: -1,
      });
      if (sprite.run) {
        this.anims.create({
          key: animKey(id, "run", dir),
          frames: this.anims.generateFrameNumbers(sprite.sheetKey, {
            frames: sprite.run[dir],
          }),
          // Legs cycle ~2.5x walk so they keep pace with the faster run step
          // (RUN_MS ≈ STEP_MS/2.9) instead of moonwalking.
          frameRate: sprite.frameRate * 2.5,
          repeat: -1,
        });
      }
    }
  }
}

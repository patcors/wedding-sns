import Phaser from "phaser";
import {
  animKey,
  CHARACTER_SPRITES,
  CharacterSprite,
  DEV_DEFAULT_CHARACTER,
  DEV_SKIP_INTRO,
  Dir,
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
    }
    loadMapAssets(this, OVERWORLD);
  }

  create() {
    for (const [id, sprite] of Object.entries(CHARACTER_SPRITES)) {
      this.createCharacterAnims(id as keyof typeof CHARACTER_SPRITES, sprite);
    }

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
          // Run a touch faster than walk so the legs keep up with the 2x step.
          frameRate: sprite.frameRate * 1.6,
          repeat: -1,
        });
      }
    }
  }
}

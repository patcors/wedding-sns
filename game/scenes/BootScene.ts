import Phaser from "phaser";

// Preloads assets and hands off to the title screen.
// Real sprite atlases go in public/sprites/ and get loaded here.
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    // TODO: this.load.atlas("sam", "/sprites/sam.png", "/sprites/sam.json");
    // TODO: this.load.atlas("sarah", "/sprites/sarah.png", "/sprites/sarah.json");
  }

  create() {
    this.scene.start("Title");
  }
}

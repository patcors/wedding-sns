import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { DESIGN_CENTER, viewportZoom } from "../systems/viewport";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  // Content is laid out around the fixed design centre; the camera zooms to the
  // canvas and centres on that point, so it stays centred at any aspect ratio.
  private reflow = () => {
    this.cameras.main.setZoom(viewportZoom(this.scale));
    this.cameras.main.centerOn(...DESIGN_CENTER);
  };

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.reflow();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.reflow);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.reflow);
    });

    this.add
      .text(cx, cy - 24, "SAM & SARAH", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#fde68a",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 4, "a wedding adventure", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#f9a8d4",
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, cy + 40, "press to start", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0.2,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    const advance = () => this.scene.start("CharacterSelect");
    this.input.once("pointerdown", advance);
    this.input.keyboard?.once("keydown", advance);
  }
}

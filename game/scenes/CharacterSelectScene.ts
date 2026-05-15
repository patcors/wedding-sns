import Phaser from "phaser";
import { CHARACTERS, CharacterId, GAME_HEIGHT, GAME_WIDTH } from "../constants";

type Slot = {
  id: CharacterId;
  container: Phaser.GameObjects.Container;
  frame: Phaser.GameObjects.Rectangle;
};

export class CharacterSelectScene extends Phaser.Scene {
  private slots: Slot[] = [];
  private cursor = 0;

  constructor() {
    super("CharacterSelect");
  }

  create() {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 20, "CHOOSE YOUR HERO", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const ids: CharacterId[] = ["sam", "sarah"];
    const spacing = 80;
    ids.forEach((id, i) => {
      const x = cx + (i - (ids.length - 1) / 2) * spacing;
      this.slots.push(this.buildSlot(id, x, GAME_HEIGHT / 2));
    });

    this.highlight(0);

    this.input.keyboard?.on("keydown-LEFT", () => this.move(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.move(1));
    this.input.keyboard?.on("keydown-ENTER", () => this.confirm());
    this.input.keyboard?.on("keydown-SPACE", () => this.confirm());

    this.slots.forEach((slot, i) => {
      slot.container
        .setSize(48, 64)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => this.highlight(i))
        .on("pointerdown", () => {
          this.highlight(i);
          this.confirm();
        });
    });

    this.add
      .text(cx, GAME_HEIGHT - 14, "← → to choose · tap to confirm", {
        fontFamily: "monospace",
        fontSize: "7px",
        color: "#a1a1aa",
      })
      .setOrigin(0.5);
  }

  private buildSlot(id: CharacterId, x: number, y: number): Slot {
    const char = CHARACTERS[id];
    const container = this.add.container(x, y);

    const frame = this.add
      .rectangle(0, 0, 44, 60, 0x1c1c24)
      .setStrokeStyle(1, 0x2e2e3a);

    // Placeholder body until real sprites land in public/sprites/.
    const body = this.add.rectangle(0, 4, 22, 30, char.accent);
    const head = this.add.rectangle(0, -16, 18, 18, 0xf5d0b0);

    const label = this.add
      .text(0, 22, char.name.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    container.add([frame, body, head, label]);
    return { id, container, frame };
  }

  private move(delta: number) {
    const next = Phaser.Math.Wrap(this.cursor + delta, 0, this.slots.length);
    this.highlight(next);
  }

  private highlight(i: number) {
    this.cursor = i;
    this.slots.forEach((slot, idx) => {
      const selected = idx === i;
      slot.frame.setStrokeStyle(selected ? 2 : 1, selected ? 0xfde68a : 0x2e2e3a);
      this.tweens.add({
        targets: slot.container,
        scale: selected ? 1.1 : 1,
        duration: 120,
      });
    });
  }

  private confirm() {
    const chosen = this.slots[this.cursor].id;
    this.registry.set("character", chosen);
    // TODO: this.scene.start("Overworld") once that scene exists.
    this.cameras.main.flash(200, 255, 255, 255);
    this.cameras.main.fade(400, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `you chose ${CHARACTERS[chosen].name}`, {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#ffffff",
        })
        .setOrigin(0.5);
      this.cameras.main.fadeIn(400, 0, 0, 0);
    });
  }
}

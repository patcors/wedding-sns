import Phaser from "phaser";
import {
  CHARACTER_SPRITES,
  CHARACTERS,
  CharacterId,
  DEFAULT_TRACK_ID,
  GAME_HEIGHT,
  GAME_WIDTH,
  TRACK_IDS,
  TRACKS,
} from "../constants";
import { inputBus } from "../input/bus";
import { DESIGN_CENTER, viewportZoom } from "../systems/viewport";

type Slot = {
  id: CharacterId;
  container: Phaser.GameObjects.Container;
  frame: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};

export class CharacterSelectScene extends Phaser.Scene {
  private slots: Slot[] = [];
  private cursor = 0;
  private trackIndex = Math.max(0, TRACK_IDS.indexOf(DEFAULT_TRACK_ID));
  private trackLabel!: Phaser.GameObjects.Text;

  constructor() {
    super("CharacterSelect");
  }

  // Content is laid out around the fixed design centre; the camera zooms to the
  // canvas and centres on that point, so it stays centred at any aspect ratio.
  private reflow = () => {
    this.cameras.main.setZoom(viewportZoom(this.scale));
    this.cameras.main.centerOn(...DESIGN_CENTER);
  };

  create() {
    const cx = GAME_WIDTH / 2;

    this.reflow();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.reflow);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.reflow);
    });

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
    this.input.keyboard?.on("keydown-A", () => this.move(-1));
    this.input.keyboard?.on("keydown-D", () => this.move(1));
    this.input.keyboard?.on("keydown-UP", () => this.cycleTrack(-1));
    this.input.keyboard?.on("keydown-DOWN", () => this.cycleTrack(1));
    this.input.keyboard?.on("keydown-W", () => this.cycleTrack(-1));
    this.input.keyboard?.on("keydown-S", () => this.cycleTrack(1));
    this.input.keyboard?.on("keydown-ENTER", () => this.confirm());
    this.input.keyboard?.on("keydown-SPACE", () => this.confirm());

    // On-screen D-pad / buttons routed through the input bus: left/right move
    // the hero cursor, up/down change the music track, A confirms. Released on
    // shutdown.
    const unsubs = [
      inputBus.onPress((dir) => {
        if (dir === "left") this.move(-1);
        else if (dir === "right") this.move(1);
        else if (dir === "up") this.cycleTrack(-1);
        else if (dir === "down") this.cycleTrack(1);
      }),
      inputBus.onAction((action) => {
        if (action === "a" || action === "start") this.confirm();
      }),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubs.forEach((off) => off());
    });

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

    this.buildTrackSelector(cx, GAME_HEIGHT / 2 + 64);

    this.add
      .text(cx, GAME_HEIGHT - 14, "← → hero · ↑ ↓ music · tap to confirm", {
        fontFamily: "monospace",
        fontSize: "7px",
        color: "#a1a1aa",
      })
      .setOrigin(0.5);
  }

  // A simple "◄ Track Name ►" picker. Chevrons and the name are all tappable
  // (cycle back / forward); keyboard ↑↓ and the D-pad up/down do the same.
  private buildTrackSelector(cx: number, y: number) {
    this.add
      .text(cx, y - 14, "MUSIC", {
        fontFamily: "monospace",
        fontSize: "7px",
        color: "#a1a1aa",
      })
      .setOrigin(0.5);

    const chevron = (dx: number, glyph: string, delta: number) =>
      this.add
        .text(cx + dx, y, glyph, {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.cycleTrack(delta));

    chevron(-52, "◄", -1);
    chevron(52, "►", 1);

    this.trackLabel = this.add
      .text(cx, y, "", {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#fde68a",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.cycleTrack(1));

    this.renderTrack();
  }

  private cycleTrack(delta: number) {
    this.trackIndex = Phaser.Math.Wrap(
      this.trackIndex + delta,
      0,
      TRACK_IDS.length,
    );
    this.renderTrack();
  }

  private renderTrack() {
    this.trackLabel.setText(TRACKS[TRACK_IDS[this.trackIndex]].name);
  }

  private buildSlot(id: CharacterId, x: number, y: number): Slot {
    const char = CHARACTERS[id];
    const container = this.add.container(x, y);

    const frame = this.add
      .rectangle(0, 0, 48, 72, 0x1c1c24)
      .setStrokeStyle(1, 0x2e2e3a);

    // Each character's dedicated character-select portrait.
    const cfg = CHARACTER_SPRITES[id];
    const sprite = this.add
      .image(0, -2, cfg.selectKey)
      .setOrigin(0.5, 0.5);

    // Name sits above the portrait and grows when the slot is hovered/selected.
    const label = this.add
      .text(0, -46, char.name.toUpperCase(), {
        fontFamily: "monospace",
        fontSize: "9px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    container.add([frame, sprite, label]);
    return { id, container, frame, label };
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
      slot.label.setColor(selected ? "#fde68a" : "#ffffff");
      this.tweens.add({
        targets: slot.container,
        scale: selected ? 1.1 : 1,
        duration: 120,
      });
      this.tweens.add({
        targets: slot.label,
        scale: selected ? 1.5 : 1,
        duration: 120,
      });
    });
  }

  private confirm() {
    const chosen = this.slots[this.cursor].id;
    this.registry.set("character", chosen);
    this.registry.set("track", TRACK_IDS[this.trackIndex]);
    this.cameras.main.flash(200, 255, 255, 255);
    this.cameras.main.fade(400, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("Overworld");
    });
  }
}

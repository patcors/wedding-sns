import Phaser from "phaser";
import {
  CHARACTER_IDS,
  CHARACTERS,
  CharacterId,
  DEFAULT_TRACK_ID,
  GAME_HEIGHT,
  GAME_WIDTH,
  TRACK_IDS,
  TRACKS,
  TrackId,
} from "../constants";
import { inputBus } from "../input/bus";
import { DESIGN_CENTER, viewportZoom } from "../systems/viewport";
import type { OverworldScene } from "./OverworldScene";

// In-game pause / start menu, rendered as its own Phaser scene (a "game screen",
// not a React popup). Launched as an overlay over a PAUSED Overworld when START
// is pressed; the dimmed world stays visible behind it, so live edits (swap
// hero / song) are seen immediately. Navigated with the d-pad / keyboard like
// the rest of the game.
//
// The item list is DATA — add a row by pushing to buildItems(). Two shapes:
//   - cycle:  has `value/left/right`. ←/→ change it; A advances; live-applied.
//   - action: has `confirm`. A / tap runs it (e.g. Exit Game).

type MenuItem = {
  label: string;
  /** Present => a cycle row: returns the current value to display. */
  value?: () => string;
  left?: () => void;
  right?: () => void;
  /** Present => an action row: run on A / tap. */
  confirm?: () => void;
};

type Row = {
  item: MenuItem;
  label: Phaser.GameObjects.Text;
  value?: Phaser.GameObjects.Text;
};

const ACCENT = "#fde68a";
const DIM = "#a1a1aa";
const ROW_SPACING = 26;

export class StartMenuScene extends Phaser.Scene {
  private items: MenuItem[] = [];
  private rows: Row[] = [];
  private cursor = 0;
  private cursorMark!: Phaser.GameObjects.Text;
  private backdrop!: Phaser.GameObjects.Rectangle;

  constructor() {
    super("StartMenu");
  }

  // Same fixed-centre strategy as Title / CharacterSelect: lay out around the
  // design centre, zoom the camera to the canvas and centre on that point so the
  // menu stays framed at any aspect ratio.
  private reflow = () => {
    this.cameras.main.setZoom(viewportZoom(this.scale));
    this.cameras.main.centerOn(...DESIGN_CENTER);
  };

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Phaser reuses this scene instance across stop/start, so any state held on
    // `this` survives a close. The Text objects from the previous open were
    // destroyed on shutdown — clear the stale references or highlight() will
    // iterate over dead objects (this.data is null) and crash / freeze mobile.
    this.items = [];
    this.rows = [];
    this.cursor = 0;

    this.reflow();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.reflow);

    // This scene renders ON TOP of the paused Overworld, so its own camera must
    // be transparent — otherwise it'd paint over the world we want to dim.
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");

    // Dim the world behind the menu. Oversized so it covers the full visible
    // width at any aspect ratio; doubles as the fade-to-black layer on exit.
    this.backdrop = this.add
      .rectangle(cx, cy, 1200, 1200, 0x05050a, 0.6)
      .setInteractive(); // also swallows taps from reaching the world beneath

    this.items = this.buildItems();
    const n = this.items.length;

    const PANEL_W = 210;
    const PANEL_H = 78 + n * 28;
    const top = cy - PANEL_H / 2;
    const bottom = cy + PANEL_H / 2;

    this.add
      .rectangle(cx, cy, PANEL_W, PANEL_H, 0x1c1c24, 0.96)
      .setStrokeStyle(2, 0xfde68a);

    this.add
      .text(cx, top + 16, "MENU", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: ACCENT,
      })
      .setOrigin(0.5);

    const startY = top + 42;
    const labelX = cx - PANEL_W / 2 + 30;
    const valueX = cx + PANEL_W / 2 - 16;

    this.items.forEach((item, i) => {
      const y = startY + i * ROW_SPACING;

      const label = this.add
        .text(labelX, y, item.label, {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#ffffff",
        })
        .setOrigin(0, 0.5);

      let value: Phaser.GameObjects.Text | undefined;
      if (item.value) {
        value = this.add
          .text(valueX, y, "", {
            fontFamily: "monospace",
            fontSize: "10px",
            color: ACCENT,
          })
          .setOrigin(1, 0.5);
      }

      // Whole-row tap target: select on hover, activate on tap.
      this.add
        .rectangle(cx, y, PANEL_W - 24, ROW_SPACING - 4, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => this.highlight(i))
        .on("pointerdown", () => {
          this.highlight(i);
          this.activate();
        });

      this.rows.push({ item, label, value });
    });

    this.cursorMark = this.add
      .text(cx - PANEL_W / 2 + 14, startY, "▶", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: ACCENT,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, bottom - 13, "↑↓ move  ←→ change  Ⓐ ok  START close", {
        fontFamily: "monospace",
        fontSize: "6px",
        color: DIM,
      })
      .setOrigin(0.5);

    this.highlight(0);
    this.renderValues();
    this.bindInput();

    this.cameras.main.fadeIn(120, 0, 0, 0);
  }

  // --- menu items (data) ---

  private buildItems(): MenuItem[] {
    const world = this.scene.get("Overworld") as OverworldScene;
    return [
      {
        label: "SONG",
        value: () => TRACKS[this.trackId()].name,
        left: () => this.cycleTrack(world, -1),
        right: () => this.cycleTrack(world, 1),
      },
      {
        label: "HERO",
        value: () => CHARACTERS[this.charId()].name,
        left: () => this.cycleChar(world, -1),
        right: () => this.cycleChar(world, 1),
      },
      {
        label: "EXIT GAME",
        confirm: () => this.exitGame(),
      },
    ];
  }

  private trackId(): TrackId {
    return (
      (this.registry.get("track") as TrackId | undefined) ?? DEFAULT_TRACK_ID
    );
  }

  private charId(): CharacterId {
    return (this.registry.get("character") as CharacterId | undefined) ?? "sam";
  }

  private cycleTrack(world: OverworldScene, delta: number) {
    const i = Math.max(0, TRACK_IDS.indexOf(this.trackId()));
    const next = TRACK_IDS[Phaser.Math.Wrap(i + delta, 0, TRACK_IDS.length)];
    world.changeTrack(next);
    this.renderValues();
  }

  private cycleChar(world: OverworldScene, delta: number) {
    const i = Math.max(0, CHARACTER_IDS.indexOf(this.charId()));
    const next =
      CHARACTER_IDS[Phaser.Math.Wrap(i + delta, 0, CHARACTER_IDS.length)];
    world.setCharacter(next);
    this.renderValues();
  }

  // Fade the whole screen to black (the backdrop sits above the world) and do a
  // full browser navigation back to the site root, tearing down the game
  // entirely (and its music) rather than returning to the in-game title.
  private exitGame() {
    // Lift the dim layer above the panel so the fade blacks out everything.
    this.children.bringToTop(this.backdrop);
    this.tweens.add({
      targets: this.backdrop,
      fillAlpha: 1,
      duration: 300,
      onComplete: () => {
        window.location.href = "/";
      },
    });
  }

  // --- input ---

  private bindInput() {
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.move(-1));
    kb?.on("keydown-DOWN", () => this.move(1));
    kb?.on("keydown-W", () => this.move(-1));
    kb?.on("keydown-S", () => this.move(1));
    kb?.on("keydown-LEFT", () => this.adjust(-1));
    kb?.on("keydown-RIGHT", () => this.adjust(1));
    kb?.on("keydown-A", () => this.adjust(-1));
    kb?.on("keydown-D", () => this.adjust(1));
    kb?.on("keydown-ENTER", () => this.activate());
    kb?.on("keydown-SPACE", () => this.activate());
    kb?.on("keydown-ESC", () => this.close());

    const unsubs = [
      inputBus.onPress((dir) => {
        if (dir === "up") this.move(-1);
        else if (dir === "down") this.move(1);
        else if (dir === "left") this.adjust(-1);
        else if (dir === "right") this.adjust(1);
      }),
      inputBus.onAction((action) => {
        if (action === "a") this.activate();
        else if (action === "b" || action === "start") this.close();
      }),
    ];

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubs.forEach((off) => off());
      this.scale.off(Phaser.Scale.Events.RESIZE, this.reflow);
    });
  }

  private move(delta: number) {
    this.highlight(Phaser.Math.Wrap(this.cursor + delta, 0, this.rows.length));
  }

  // ←/→ on a cycle row.
  private adjust(delta: number) {
    const item = this.items[this.cursor];
    if (delta < 0) item.left?.();
    else item.right?.();
  }

  // A / tap: run an action row, or advance a cycle row.
  private activate() {
    const item = this.items[this.cursor];
    if (item.confirm) item.confirm();
    else item.right?.();
  }

  private close() {
    this.scene.stop();
    this.scene.resume("Overworld");
  }

  // --- render ---

  private highlight(i: number) {
    this.cursor = i;
    this.rows.forEach((row, idx) => {
      row.label.setColor(idx === i ? ACCENT : "#ffffff");
    });
    this.cursorMark.setY(this.rows[i].label.y);
  }

  private renderValues() {
    for (const row of this.rows) {
      if (row.value && row.item.value) {
        row.value.setText(`◄ ${row.item.value()} ►`);
      }
    }
  }
}

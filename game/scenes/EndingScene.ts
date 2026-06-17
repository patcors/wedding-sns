import Phaser from "phaser";
import {
  animKey,
  CHARACTER_SPRITES,
  CharacterId,
  DEFAULT_TRACK_ID,
  GAME_HEIGHT,
  GAME_WIDTH,
  MUSIC_VOLUME,
  TRACKS,
  TrackId,
} from "../constants";
import { DESIGN_CENTER, viewportZoom } from "../systems/viewport";

// Scripted ending "movie" — the player has NO control here. Both heroes walk up
// the aisle together, turn to face each other, and a celebratory beat plays. It
// is a static, fixed-camera scene (same viewport pattern as Title /
// CharacterSelect): lay content out around DESIGN_CENTER, zoom the camera to the
// canvas, centre on that point so it stays framed at any aspect ratio.
//
// The set (aisle runner + arch) is drawn from primitives as a PLACEHOLDER. When
// the real aisle Tiled map exists it should replace `buildSet()` — load it as a
// collision-free MapManifest and render its layers here; everything else (the
// hero walk, the turn, the celebration) stays the same.

// Feet-Y the heroes walk up to (just under the arch), and where they start
// (off the bottom edge). Sprites are anchored at their feet (origin 0.5, 1).
const ALTAR_Y = GAME_HEIGHT / 2 + 6;
const START_Y = GAME_HEIGHT + 24;
// Side-by-side offset from centre as they walk; they're shoulder to shoulder.
const PAIR_DX = 13;

const WALK_MS = 4200; // slow, ceremonial pace up the aisle
const BEAT_MS = 900; // pause before they turn / the celebration lands

type Hero = {
  id: CharacterId;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
};

export class EndingScene extends Phaser.Scene {
  private heroes: Hero[] = [];

  private music?: Phaser.Sound.BaseSound;

  constructor() {
    super("Ending");
  }

  private reflow = () => {
    this.cameras.main.setZoom(viewportZoom(this.scale));
    this.cameras.main.centerOn(...DESIGN_CENTER);
  };

  create() {
    this.heroes = [];

    this.reflow();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.reflow);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.reflow);
    });

    this.buildSet();

    // Whoever you played as walks on the left; their partner on the right. It's
    // their wedding, so both always appear regardless of the character pick.
    const chosen =
      (this.registry.get("character") as CharacterId | undefined) ?? "sam";
    const partner: CharacterId = chosen === "sam" ? "sarah" : "sam";
    this.heroes.push(this.buildHero(chosen, GAME_WIDTH / 2 - PAIR_DX));
    this.heroes.push(this.buildHero(partner, GAME_WIDTH / 2 + PAIR_DX));

    this.startMusic();

    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.runSequence();

    // Dev affordance: tap / any key replays the cutscene from the top so it's
    // easy to rewatch via ?ending-scene. Harmless in the real flow (the player
    // has nothing else to do here yet).
    this.input.once("pointerdown", () => this.scene.restart());
    this.input.keyboard?.once("keydown", () => this.scene.restart());
  }

  // The non-interactive timeline. Heroes are already placed off the bottom edge;
  // walk them up in step, settle to idle facing each other, then celebrate.
  private runSequence() {
    for (const hero of this.heroes) {
      hero.sprite.play(animKey(hero.id, "walk", "up"), true);
    }

    this.tweens.add({
      targets: this.heroes.map((h) => h.sprite),
      y: ALTAR_Y,
      duration: WALK_MS,
      ease: "Linear",
    });
    this.tweens.add({
      targets: this.heroes.map((h) => h.shadow),
      y: ALTAR_Y + 5,
      duration: WALK_MS,
      ease: "Linear",
      onComplete: () => this.arriveAtAltar(),
    });
  }

  // Stop walking and turn the pair inward to face each other, then celebrate.
  private arriveAtAltar() {
    const [left, right] = this.heroes;
    left.sprite.anims.stop();
    left.sprite.setFrame(CHARACTER_SPRITES[left.id].idle.right);
    right.sprite.anims.stop();
    right.sprite.setFrame(CHARACTER_SPRITES[right.id].idle.left);

    this.time.delayedCall(BEAT_MS, () => this.celebrate());
  }

  private celebrate() {
    const cx = GAME_WIDTH / 2;

    const title = this.add
      .text(cx, ALTAR_Y - 56, "JUST MARRIED", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#fde68a",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      y: title.y - 6,
      duration: 600,
      ease: "Sine.Out",
    });

    // A steady drift of hearts rising between the couple.
    this.time.addEvent({
      delay: 280,
      repeat: 14,
      callback: () => this.floatHeart(cx),
    });
  }

  // A single "♥" that rises from the couple and fades — a cheap, art-free
  // celebration flourish. Jittered x/scale so the stream doesn't look uniform.
  private floatHeart(cx: number) {
    const x = cx + Phaser.Math.Between(-18, 18);
    const heart = this.add
      .text(x, ALTAR_Y - 8, "♥", {
        fontFamily: "monospace",
        fontSize: `${Phaser.Math.Between(8, 13)}px`,
        color: Phaser.Math.RND.pick(["#f9a8d4", "#fb7185", "#fda4af"]),
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: heart,
      y: heart.y - Phaser.Math.Between(40, 64),
      x: x + Phaser.Math.Between(-10, 10),
      alpha: 0,
      duration: Phaser.Math.Between(1400, 2000),
      ease: "Sine.In",
      onComplete: () => heart.destroy(),
    });
  }

  // --- set & actors ---

  // PLACEHOLDER aisle: a runner down the centre and a simple arch at the altar.
  // Replace with the real Tiled aisle map when it exists (see file header).
  private buildSet() {
    const cx = GAME_WIDTH / 2;

    // Aisle runner — a vertical carpet the couple walks up.
    this.add
      .rectangle(cx, GAME_HEIGHT / 2, 56, GAME_HEIGHT, 0x6b1f2a)
      .setStrokeStyle(1, 0x8a2c39);

    // Arch: two posts + a top beam, sitting at the altar end.
    const archTop = ALTAR_Y - 40;
    const post = (dx: number) =>
      this.add.rectangle(cx + dx, archTop + 18, 6, 44, 0x3b2a1a);
    post(-26);
    post(26);
    this.add.rectangle(cx, archTop, 64, 8, 0x4a3522);
    // A few floral dabs on the beam.
    for (let i = -2; i <= 2; i++) {
      this.add.circle(cx + i * 12, archTop, 3, 0xf9a8d4);
    }
  }

  private buildHero(id: CharacterId, x: number): Hero {
    const cfg = CHARACTER_SPRITES[id];
    const shadow = this.add.ellipse(x, START_Y + 5, 14, 5, 0x000000, 0.35);
    const sprite = this.add
      .sprite(x, START_Y, cfg.sheetKey, cfg.idle.up)
      .setOrigin(0.5, 1)
      .setDepth(START_Y);
    // Keep each hero drawn above its own shadow; both walk straight up so a
    // static depth (their start Y) is enough — no per-frame Y-sort needed here.
    shadow.setDepth(START_Y - 1);
    return { id, sprite, shadow };
  }

  // Mirror the overworld's music handling so the chosen track carries into the
  // ending. Guarded against a missing/locked audio context so the scene never
  // crashes if the track failed to load.
  private startMusic() {
    const trackId =
      (this.registry.get("track") as TrackId | undefined) ?? DEFAULT_TRACK_ID;
    const track = TRACKS[trackId] ?? TRACKS[DEFAULT_TRACK_ID];
    if (!this.cache.audio.exists(track.key)) return;

    this.music = this.sound.add(track.key, { loop: true, volume: MUSIC_VOLUME });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.music?.stop();
      this.music?.destroy();
      this.music = undefined;
    });

    if (this.sound.locked) {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.music?.play());
    } else {
      this.music.play();
    }
  }
}

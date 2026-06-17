import type PhaserNS from "phaser";
import {
  GAME_HEIGHT as INITIAL_GAME_HEIGHT,
  GAME_WIDTH as INITIAL_GAME_WIDTH,
} from "./constants";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { CharacterSelectScene } from "./scenes/CharacterSelectScene";
import { OverworldScene } from "./scenes/OverworldScene";
import { EndingScene } from "./scenes/EndingScene";

export function createGame(Phaser: typeof PhaserNS, parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: INITIAL_GAME_WIDTH,
    height: INITIAL_GAME_HEIGHT,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: "#101015",
    scale: {
      // HYBRID scaling (see game/systems/viewport.ts). GameCanvas drives the
      // canvas RESOLUTION via setGameSize so it is exactly phaserZoom *
      // VISIBLE_HEIGHT tall, and each scene renders the world at that INTEGER
      // camera zoom — whole-pixel tiles, no seams. FIT then CSS-scales that
      // finished canvas (one flat bitmap) by the leftover fractional factor to
      // fill the screen; scaling a single composited image can't reintroduce the
      // inter-tile seams that a fractional *camera* zoom does. FIT also keeps the
      // pointer-coordinate mapping correct, which a manual CSS transform wouldn't.
      // width/height below are just the initial size before GameCanvas sizes it.
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    fps: { target: 60, forceSetTimeOut: false },
    input: { activePointers: 3 },
    scene: [
      BootScene,
      TitleScene,
      CharacterSelectScene,
      OverworldScene,
      EndingScene,
    ],
  });
}

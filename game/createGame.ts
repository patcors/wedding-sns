import type PhaserNS from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { CharacterSelectScene } from "./scenes/CharacterSelectScene";
import { OverworldScene } from "./scenes/OverworldScene";

export function createGame(Phaser: typeof PhaserNS, parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: "#101015",
    scale: {
      // ENVELOP = "cover", not "contain": scale 320x240 up until it FILLS the
      // window on both axes, letting the longer axis overflow. The screen div
      // (overflow-hidden) clips the spill, so we never get letterbox bars —
      // landscape crops top/bottom, portrait crops left/right. Same design
      // resolution on every device, just a different slice of it is visible.
      mode: Phaser.Scale.ENVELOP,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    fps: { target: 60, forceSetTimeOut: false },
    input: { activePointers: 3 },
    scene: [BootScene, TitleScene, CharacterSelectScene, OverworldScene],
  });
}

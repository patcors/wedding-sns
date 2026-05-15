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
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    fps: { target: 60, forceSetTimeOut: false },
    input: { activePointers: 3 },
    scene: [BootScene, TitleScene, CharacterSelectScene, OverworldScene],
  });
}

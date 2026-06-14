// Module-level event bus that lets React UI (the DS shell's D-pad + buttons)
// talk to the running Phaser scene without coupling the two.
//
// React side: import { inputBus } and call .press("up") on pointerdown,
//             .release("up") on pointerup.
// Phaser side: subscribe in scene.create(), unsubscribe in scene.shutdown.

export type InputDir = "up" | "down" | "left" | "right";
export type InputAction = "a" | "b" | "start" | "select";

type DirListener = (dir: InputDir) => void;
type ActionListener = (action: InputAction) => void;

const pressDirListeners = new Set<DirListener>();
const releaseDirListeners = new Set<DirListener>();
const actionListeners = new Set<ActionListener>();
const pressActionListeners = new Set<ActionListener>();
const releaseActionListeners = new Set<ActionListener>();

export const inputBus = {
  press(dir: InputDir) {
    pressDirListeners.forEach((fn) => fn(dir));
  },
  release(dir: InputDir) {
    releaseDirListeners.forEach((fn) => fn(dir));
  },
  action(action: InputAction) {
    actionListeners.forEach((fn) => fn(action));
  },
  // Hold-state for action buttons (e.g. hold B to run). `pressAction` fires on
  // pointerdown, `releaseAction` on pointerup. Separate from the one-shot
  // `action` above so a button can drive both (tap = confirm, hold = run).
  pressAction(action: InputAction) {
    pressActionListeners.forEach((fn) => fn(action));
  },
  releaseAction(action: InputAction) {
    releaseActionListeners.forEach((fn) => fn(action));
  },
  onPress(fn: DirListener) {
    pressDirListeners.add(fn);
    return () => {
      pressDirListeners.delete(fn);
    };
  },
  onRelease(fn: DirListener) {
    releaseDirListeners.add(fn);
    return () => {
      releaseDirListeners.delete(fn);
    };
  },
  onAction(fn: ActionListener) {
    actionListeners.add(fn);
    return () => {
      actionListeners.delete(fn);
    };
  },
  onActionPress(fn: ActionListener) {
    pressActionListeners.add(fn);
    return () => {
      pressActionListeners.delete(fn);
    };
  },
  onActionRelease(fn: ActionListener) {
    releaseActionListeners.add(fn);
    return () => {
      releaseActionListeners.delete(fn);
    };
  },
};

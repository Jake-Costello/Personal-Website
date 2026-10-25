export type ArcadeAction = 'left' | 'right' | 'up' | 'down' | 'action' | 'secondary' | 'reset';

export type ArcadeInput = {
  pressed: Set<string>;
  subscribe: (listener: () => void) => () => void;
  set: (action: string, pressed: boolean) => void;
  pulse: (action: string) => void;
  clear: () => void;
};

export function createArcadeInput(): ArcadeInput {
  const pressed = new Set<string>();
  const listeners = new Set<() => void>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const notify = () => listeners.forEach((listener) => listener());
  const set = (action: string, down: boolean) => {
    if (pressed.has(action) === down) return;
    if (down) pressed.add(action);
    else pressed.delete(action);
    notify();
  };
  return {
    pressed,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set,
    pulse(action) {
      clearTimeout(timers.get(action));
      set(action, false);
      set(action, true);
      timers.set(
        action,
        setTimeout(() => {
          set(action, false);
          timers.delete(action);
        }, 120),
      );
    },
    clear() {
      timers.forEach(clearTimeout);
      timers.clear();
      if (pressed.size) {
        pressed.clear();
        notify();
      }
    },
  };
}

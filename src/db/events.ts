/** Tiny pub/sub so every mounted query re-runs after a write anywhere in the app. */

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyChange() {
  listeners.forEach((l) => l());
}

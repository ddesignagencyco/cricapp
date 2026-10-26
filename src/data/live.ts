import { AppState } from 'react-native';

/*
 * Live refresh. While any screen showing live data is mounted, listeners
 * are pinged every POLL_MS so their queries re-fetch silently. The API also
 * offers SSE (/matches/live/stream), but React Native's fetch can't read a
 * streaming body without an extra native module, so polling keeps the app
 * light. Polling pauses while the app is in the background.
 */

const POLL_MS = 20_000;

type Listener = () => void;
const listeners = new Set<Listener>();
let timer: ReturnType<typeof setInterval> | null = null;

const tick = () => listeners.forEach(l => l());

function start() {
  if (!timer && listeners.size && AppState.currentState === 'active') timer = setInterval(tick, POLL_MS);
}
function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

AppState.addEventListener('change', s => {
  if (s === 'active') {
    // Catch up straight away after coming back to the app.
    if (listeners.size) tick();
    start();
  } else {
    stop();
  }
});

export const liveState = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    start();
    return () => {
      listeners.delete(listener);
      if (!listeners.size) stop();
    };
  },
};

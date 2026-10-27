import { AppState } from 'react-native';
import { onLiveEvent } from './socket';

/*
 * Live refresh. While any screen showing live data is mounted, the app
 * holds the API's socket open: each ball's update pings listeners (at most
 * every REFRESH_MS) so their queries re-fetch silently, and cards apply
 * score snapshots straight from the socket (data/socket.ts). A slow poll
 * stays on as a fallback in case the socket drops. Everything pauses while
 * the app is in the background.
 */

const POLL_MS = 60_000;
const REFRESH_MS = 3_000;

type Listener = () => void;
const listeners = new Set<Listener>();
let timer: ReturnType<typeof setInterval> | null = null;
let releaseSocket: (() => void) | null = null;
let last = 0;
let pending: ReturnType<typeof setTimeout> | null = null;

const tick = () => {
  last = Date.now();
  listeners.forEach(l => l());
};

/** A burst of balls becomes one refresh per window. */
function soon() {
  if (pending) return;
  const wait = Math.max(0, REFRESH_MS - (Date.now() - last));
  pending = setTimeout(() => {
    pending = null;
    tick();
  }, wait);
}

function start() {
  if (!listeners.size || AppState.currentState !== 'active') return;
  if (!timer) timer = setInterval(tick, POLL_MS);
  if (!releaseSocket) releaseSocket = onLiveEvent(soon);
}
function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  releaseSocket?.();
  releaseSocket = null;
  if (pending) clearTimeout(pending);
  pending = null;
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

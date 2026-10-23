import type { Comment } from '../types';

const now = Date.now();
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

const c = (id: string, author: string, body: string, mins: number, likes: number, extra: Partial<Comment> = {}): Comment => ({
  id,
  author,
  body,
  at: ago(mins),
  likes,
  replies: [],
  ...extra,
});

const matchThread: Comment[] = [
  c('c1', 'PAK CRICZONE', 'Welcome to the live thread for the 2nd T20I. Keep it civil — reports are reviewed by our moderators.', 120, 64, { pinned: true, staff: true }),
  c('c2', 'Ali Raza', 'Fakhar needs to stay till the 19th over. If he’s there, we win this.', 6, 212, {
    teamId: 'pak',
    replies: [
      c('c2a', 'Sana K', 'Agreed, but Salman has to rotate strike. Too many dots.', 4, 41, { teamId: 'pak' }),
      c('c2b', 'Bilal', 'Rabada still has an over left, that’s the danger.', 3, 18),
    ],
  }),
  c('c3', 'Thabo M', 'Brevis innings was something else. 4 sixes in 22 balls 🔥', 70, 133, { teamId: 'sa' }),
  c('c4', 'Hira', 'That six off Ngidi went into the second tier 😮', 9, 98, { teamId: 'pak' }),
  c('c5', 'Usman', 'Win probability chart is a great touch. Watching it swing every over.', 15, 57),
];

const articleThread: Comment[] = [
  c('a1', 'Faisal', 'Great piece. The powerplay numbers explain a lot of the recent wins.', 30, 44, {
    teamId: 'pak',
    replies: [c('a1a', 'Hamza Qureshi', 'Thanks Faisal — more on the death overs next week.', 22, 19, { staff: true })],
  }),
  c('a2', 'Mehwish', 'Would love the same analysis for the bowling side.', 55, 21),
  c('a3', 'Zain', 'Selection makes sense, finally some reward for domestic form.', 90, 12, { teamId: 'pak' }),
];

export const comments: Record<string, Comment[]> = {
  'match:m1': matchThread,
};

/** Threads without bespoke sample data get the generic article set. */
export const fallbackThread = (thread: string) => (thread.startsWith('match:') ? matchThread.slice(0, 3) : articleThread);

export const reactions: Record<string, Record<string, number>> = {
  'match:m1': { '👏': 1240, '🔥': 986, '😮': 412, '😢': 133 },
};

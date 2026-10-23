import type { Banner, Short, Video } from '../types';

const now = Date.now();
const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

export const shorts: Short[] = [
  {
    id: 's1',
    kind: 'short',
    title: 'Fakhar 92m six',
    teamIds: ['pak'],
    live: true,
    matchId: 'm1',
    views: 48200,
    publishedAt: ago(4),
    slides: [
      { headline: 'SIX!', stat: '92 metres · 14.6 ov', caption: 'Fakhar picks Ngidi’s slower ball and launches it into the second tier at long-on.', teamIds: ['pak', 'sa'] },
      { headline: '27* (18)', stat: 'Fakhar Zaman', caption: 'Three fours and a six — Pakistan’s chase is alive in Rawalpindi.', teamIds: ['pak'], photo: 'stadium' },
      { headline: '42 off 21', stat: 'Required', caption: 'Win probability swings to 41% after the six. Follow it live in the match centre.', teamIds: ['pak', 'sa'] },
    ],
  },
  {
    id: 's2',
    kind: 'short',
    title: 'Brevis blitz',
    teamIds: ['sa'],
    matchId: 'm1',
    views: 31900,
    publishedAt: ago(75),
    slides: [
      { headline: '47 (22)', stat: 'Dewald Brevis', caption: 'Four sixes in 22 balls lift South Africa to 186.', teamIds: ['sa'] },
      { headline: '213.6', stat: 'Strike rate', caption: 'Sixes over midwicket, long-on and twice over cover.', teamIds: ['sa', 'pak'], photo: 'pitch' },
    ],
  },
  {
    id: 's3',
    kind: 'short',
    title: 'Shaheen double',
    teamIds: ['pak'],
    matchId: 'm1',
    views: 27400,
    publishedAt: ago(110),
    slides: [
      { headline: '2/34', stat: 'Shaheen Shah Afridi', caption: 'de Kock caught behind, Stubbs trapped in front — both with the new-ball inswinger.', teamIds: ['pak'] },
      { headline: '112', stat: 'T20I wickets', caption: 'Shaheen’s career tally in the format.', teamIds: ['pak'], photo: 'stadium' },
    ],
  },
  {
    id: 'g1',
    kind: 'gallery',
    title: 'Pindi in photos',
    teamIds: ['pak', 'sa'],
    photo: 'stadium',
    views: 12800,
    publishedAt: ago(140),
    slides: [
      { headline: 'Floodlights on', caption: 'A full house in Rawalpindi for the second T20I.', teamIds: ['pak'], photo: 'stadium' },
      { headline: 'The surface', caption: 'Hard, true and quick — the groundsman promised runs.', teamIds: ['pak'], photo: 'pitch' },
      { headline: 'Anthem', caption: 'Both sides line up before the first ball.', teamIds: ['pak', 'sa'] },
    ],
  },
  {
    id: 's4',
    kind: 'short',
    title: 'PSL 12 draft',
    teamIds: ['lq', 'iu'],
    views: 22100,
    publishedAt: ago(300),
    slides: [
      { headline: '8', stat: 'Retentions per side', caption: 'Franchises must submit their lists by 20 November.', teamIds: ['lq', 'iu'] },
      { headline: 'December', stat: 'Player draft', caption: 'Champions Qalandars keep their title-winning core.', teamIds: ['lq'] },
    ],
  },
  {
    id: 'g2',
    kind: 'gallery',
    title: 'Abrar’s mystery',
    teamIds: ['pak'],
    photo: 'pitch',
    views: 9400,
    publishedAt: ago(900),
    slides: [
      { headline: 'The grip', caption: 'How Abrar holds the carrom ball that fooled the world’s best.', teamIds: ['pak'], photo: 'pitch' },
      { headline: '6.4', stat: 'T20I economy', caption: 'Runs per over across his T20I career.', teamIds: ['pak'] },
    ],
  },
  {
    id: 's5',
    kind: 'short',
    title: 'Brook in control',
    teamIds: ['eng'],
    matchId: 'm2',
    live: true,
    views: 15300,
    publishedAt: ago(30),
    slides: [{ headline: '24 off 52', stat: 'England need', caption: 'Brook steers the chase in Wellington.', teamIds: ['eng', 'nz'] }],
  },
];

export const banners: Banner[] = [
  {
    id: 'b1',
    overline: 'LIVE NOW · 2ND T20I',
    title: 'Pakistan chase 187 in Rawalpindi',
    cta: 'Open match centre',
    photo: 'stadium',
    teamIds: ['pak', 'sa'],
    route: { name: 'Match', id: 'm1' },
  },
  {
    id: 'b2',
    overline: 'AI PREVIEW · SATURDAY',
    title: 'Who wins the decider in Lahore?',
    cta: 'See the prediction',
    teamIds: ['pak', 'sa'],
    route: { name: 'Prediction', id: 'm5' },
  },
  {
    id: 'b3',
    overline: 'PSL 12',
    title: 'Retentions, draft and every franchise',
    cta: 'Go to the PSL hub',
    photo: 'pitch',
    teamIds: ['lq', 'iu'],
    route: { name: 'Psl' },
  },
];

export const videos: Video[] = [
  { id: 'v1', title: 'Highlights: Pakistan v South Africa, 1st T20I', duration: '8:42', teamIds: ['pak', 'sa'], photo: 'stadium', views: 182000, publishedAt: ago(2900), category: 'Highlights' },
  { id: 'v2', title: 'Salman Agha press conference after the series opener', duration: '6:15', teamIds: ['pak'], views: 41000, publishedAt: ago(2700), category: 'Press' },
  { id: 'v3', title: 'Abrar Ahmed: every wicket from the 1st T20I', duration: '3:20', teamIds: ['pak'], photo: 'pitch', views: 96000, publishedAt: ago(2800), category: 'Highlights' },
  { id: 'v4', title: 'PSL 2026 final: last over in full', duration: '4:58', teamIds: ['lq', 'iu'], views: 640000, publishedAt: ago(230000), category: 'PSL' },
  { id: 'v5', title: 'Explained: how our win probability model works', duration: '5:10', teamIds: ['pak', 'sa'], views: 22000, publishedAt: ago(8000), category: 'Explainers' },
];

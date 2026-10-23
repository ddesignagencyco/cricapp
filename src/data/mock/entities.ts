import type { Author, Player, PlayerFormatStats, Series, Team, Venue } from '../types';

/*
 * Sample data for the UI phase. Names are real so screens read naturally;
 * every number here is placeholder until the NestJS API is connected.
 */

const team = (id: string, name: string, short: string, color: string, kind: Team['kind'], flag?: string): Team => ({
  id,
  name,
  short,
  color,
  kind,
  flag,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
});

export const teams: Team[] = [
  team('pak', 'Pakistan', 'PAK', '#1FB86A', 'international', '🇵🇰'),
  team('sa', 'South Africa', 'SA', '#F2B705', 'international', '🇿🇦'),
  team('ind', 'India', 'IND', '#3E8BFF', 'international', '🇮🇳'),
  team('aus', 'Australia', 'AUS', '#F5C518', 'international', '🇦🇺'),
  team('eng', 'England', 'ENG', '#E8475F', 'international'),
  team('nz', 'New Zealand', 'NZ', '#0E8A8F', 'international', '🇳🇿'),
  team('sl', 'Sri Lanka', 'SL', '#4F7BFF', 'international', '🇱🇰'),
  team('ban', 'Bangladesh', 'BAN', '#20A363', 'international', '🇧🇩'),
  team('afg', 'Afghanistan', 'AFG', '#4C8DF6', 'international', '🇦🇫'),
  team('wi', 'West Indies', 'WI', '#B33A5B', 'international'),
  team('lq', 'Lahore Qalandars', 'LQ', '#35C15B', 'franchise'),
  team('kk', 'Karachi Kings', 'KK', '#2F7DF0', 'franchise'),
  team('iu', 'Islamabad United', 'IU', '#F0474B', 'franchise'),
  team('pz', 'Peshawar Zalmi', 'PZ', '#F7C600', 'franchise'),
  team('qg', 'Quetta Gladiators', 'QG', '#9A5CF0', 'franchise'),
  team('ms', 'Multan Sultans', 'MS', '#22C3AE', 'franchise'),
  team('lw', 'Lahore Whites', 'LHW', '#7C5CE0', 'domestic'),
  team('kb', 'Karachi Blues', 'KRB', '#4E8CFF', 'domestic'),
];

const s = (p: Partial<PlayerFormatStats>): PlayerFormatStats => ({
  matches: 0,
  runs: 0,
  average: 0,
  strikeRate: 0,
  hundreds: 0,
  fifties: 0,
  best: '-',
  wickets: 0,
  economy: 0,
  bowlingAverage: 0,
  ...p,
});

const player = (
  id: string,
  name: string,
  teamId: string,
  role: Player['role'],
  batting: string,
  bowling: string | undefined,
  age: number,
  stats: Player['stats'],
  recent: number[],
): Player => ({
  id,
  name,
  short: name.split(' ').slice(-1)[0],
  teamId,
  role,
  batting,
  bowling,
  age,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  stats,
  recent,
});

export const players: Player[] = [
  // Pakistan
  player('babar', 'Babar Azam', 'pak', 'Batter', 'Right-hand bat', 'Right-arm offbreak', 32, {
    T20: s({ matches: 132, runs: 4302, average: 39.8, strikeRate: 129.4, hundreds: 3, fifties: 36, best: '122' }),
    ODI: s({ matches: 136, runs: 6510, average: 54.2, strikeRate: 88.6, hundreds: 20, fifties: 37, best: '158' }),
    Test: s({ matches: 59, runs: 4380, average: 44.2, strikeRate: 54.1, hundreds: 9, fifties: 27, best: '196' }),
  }, [16, 47, 9, 68, 34]),
  player('rizwan', 'Mohammad Rizwan', 'pak', 'Wicketkeeper', 'Right-hand bat', undefined, 34, {
    T20: s({ matches: 106, runs: 3414, average: 47.4, strikeRate: 125.4, hundreds: 1, fifties: 30, best: '104*' }),
    ODI: s({ matches: 88, runs: 2690, average: 41.4, strikeRate: 89.2, hundreds: 4, fifties: 18, best: '131*' }),
    Test: s({ matches: 37, runs: 2088, average: 40.2, strikeRate: 53.8, hundreds: 4, fifties: 11, best: '171*' }),
  }, [53, 12, 71, 40, 2]),
  player('saim', 'Saim Ayub', 'pak', 'Batter', 'Left-hand bat', 'Right-arm offbreak', 24, {
    T20: s({ matches: 48, runs: 1110, average: 24.7, strikeRate: 139.8, fifties: 7, best: '98', wickets: 9, economy: 7.6 }),
    ODI: s({ matches: 19, runs: 812, average: 45.1, strikeRate: 101.3, hundreds: 3, fifties: 2, best: '113' }),
  }, [34, 0, 61, 22, 45]),
  player('farhan', 'Sahibzada Farhan', 'pak', 'Batter', 'Right-hand bat', undefined, 30, {
    T20: s({ matches: 31, runs: 912, average: 31.4, strikeRate: 136.9, fifties: 8, best: '74' }),
  }, [52, 18, 74, 6, 39]),
  player('fakhar', 'Fakhar Zaman', 'pak', 'Batter', 'Left-hand bat', 'Slow left-arm orthodox', 36, {
    T20: s({ matches: 102, runs: 2280, average: 24.8, strikeRate: 132.1, fifties: 14, best: '91' }),
    ODI: s({ matches: 88, runs: 3651, average: 45.6, strikeRate: 93.7, hundreds: 11, fifties: 17, best: '210*' }),
  }, [27, 44, 3, 19, 58]),
  player('salman', 'Salman Ali Agha', 'pak', 'All-rounder', 'Right-hand bat', 'Right-arm offbreak', 32, {
    T20: s({ matches: 36, runs: 640, average: 26.7, strikeRate: 124.5, fifties: 3, best: '63', wickets: 11, economy: 7.4 }),
    ODI: s({ matches: 30, runs: 980, average: 42.6, strikeRate: 96.2, hundreds: 2, fifties: 6, best: '134', wickets: 9, economy: 5.6 }),
  }, [8, 33, 51, 14, 22]),
  player('haris', 'Mohammad Haris', 'pak', 'Wicketkeeper', 'Right-hand bat', undefined, 25, {
    T20: s({ matches: 24, runs: 410, average: 19.5, strikeRate: 141.2, fifties: 2, best: '72' }),
  }, [0, 31, 12, 9, 40]),
  player('hasan', 'Hasan Nawaz', 'pak', 'Batter', 'Right-hand bat', undefined, 24, {
    T20: s({ matches: 18, runs: 388, average: 27.7, strikeRate: 156.4, hundreds: 1, best: '105*' }),
  }, [12, 105, 4, 29, 18]),
  player('nawaz', 'Mohammad Nawaz', 'pak', 'All-rounder', 'Left-hand bat', 'Slow left-arm orthodox', 32, {
    T20: s({ matches: 78, runs: 690, average: 18.6, strikeRate: 132.0, best: '45', wickets: 74, economy: 7.1, bowlingAverage: 24.8 }),
  }, [14, 6, 21, 0, 9]),
  player('faheem', 'Faheem Ashraf', 'pak', 'All-rounder', 'Left-hand bat', 'Right-arm medium-fast', 32, {
    T20: s({ matches: 52, runs: 420, average: 15.6, strikeRate: 130.4, best: '46', wickets: 44, economy: 7.9 }),
  }, [9, 2, 17, 11, 0]),
  player('shaheen', 'Shaheen Shah Afridi', 'pak', 'Bowler', 'Left-hand bat', 'Left-arm fast', 26, {
    T20: s({ matches: 88, runs: 190, average: 9.5, strikeRate: 121.0, best: '4/22', wickets: 112, economy: 7.6, bowlingAverage: 22.1 }),
    ODI: s({ matches: 66, runs: 280, best: '6/35', wickets: 131, economy: 5.6, bowlingAverage: 23.4 }),
    Test: s({ matches: 31, runs: 410, best: '6/51', wickets: 116, economy: 3.2, bowlingAverage: 26.6 }),
  }, [2, 1, 3, 0, 2]),
  player('naseem', 'Naseem Shah', 'pak', 'Bowler', 'Right-hand bat', 'Right-arm fast', 23, {
    T20: s({ matches: 37, best: '3/19', wickets: 41, economy: 7.8, bowlingAverage: 23.9 }),
    ODI: s({ matches: 22, best: '5/33', wickets: 41, economy: 5.2, bowlingAverage: 20.1 }),
  }, [1, 2, 0, 3, 1]),
  player('rauf', 'Haris Rauf', 'pak', 'Bowler', 'Right-hand bat', 'Right-arm fast', 32, {
    T20: s({ matches: 92, best: '5/18', wickets: 118, economy: 8.1, bowlingAverage: 21.6 }),
  }, [2, 3, 1, 2, 0]),
  player('abrar', 'Abrar Ahmed', 'pak', 'Bowler', 'Right-hand bat', 'Legbreak googly', 28, {
    T20: s({ matches: 21, best: '4/9', wickets: 30, economy: 6.4, bowlingAverage: 15.8 }),
  }, [1, 2, 4, 1, 2]),
  player('sufiyan', 'Sufiyan Muqeem', 'pak', 'Bowler', 'Left-hand bat', 'Left-arm wrist spin', 27, {
    T20: s({ matches: 19, best: '5/3', wickets: 28, economy: 6.9, bowlingAverage: 16.4 }),
  }, [0, 1, 2, 5, 1]),
  player('shadab', 'Shadab Khan', 'pak', 'All-rounder', 'Right-hand bat', 'Legbreak googly', 28, {
    T20: s({ matches: 112, runs: 760, average: 16.5, strikeRate: 136.2, best: '48', wickets: 112, economy: 7.2, bowlingAverage: 24.3 }),
  }, [21, 3, 15, 30, 7]),
  // South Africa
  player('markram', 'Aiden Markram', 'sa', 'Batter', 'Right-hand bat', 'Right-arm offbreak', 32, {
    T20: s({ matches: 62, runs: 1620, average: 31.2, strikeRate: 145.1, fifties: 11, best: '70*' }),
  }, [18, 54, 32, 7, 66]),
  player('qdk', 'Quinton de Kock', 'sa', 'Wicketkeeper', 'Left-hand bat', undefined, 33, {
    T20: s({ matches: 98, runs: 2810, average: 31.6, strikeRate: 138.7, hundreds: 1, fifties: 18, best: '100' }),
  }, [41, 12, 77, 23, 5]),
  player('rickelton', 'Ryan Rickelton', 'sa', 'Batter', 'Left-hand bat', undefined, 30, {
    T20: s({ matches: 22, runs: 540, average: 25.7, strikeRate: 142.1, fifties: 3, best: '71' }),
  }, [22, 8, 41, 63, 0]),
  player('brevis', 'Dewald Brevis', 'sa', 'Batter', 'Right-hand bat', 'Legbreak', 23, {
    T20: s({ matches: 21, runs: 620, average: 34.4, strikeRate: 172.3, hundreds: 1, fifties: 2, best: '125*' }),
  }, [47, 125, 9, 31, 53]),
  player('stubbs', 'Tristan Stubbs', 'sa', 'Batter', 'Right-hand bat', 'Right-arm offbreak', 26, {
    T20: s({ matches: 40, runs: 780, average: 28.9, strikeRate: 140.6, fifties: 3, best: '72' }),
  }, [12, 33, 40, 2, 19]),
  player('miller', 'David Miller', 'sa', 'Batter', 'Left-hand bat', undefined, 37, {
    T20: s({ matches: 130, runs: 2510, average: 32.6, strikeRate: 141.9, hundreds: 2, fifties: 10, best: '106*' }),
  }, [26, 14, 51, 8, 30]),
  player('jansen', 'Marco Jansen', 'sa', 'All-rounder', 'Left-hand bat', 'Left-arm fast', 26, {
    T20: s({ matches: 30, runs: 260, strikeRate: 141.0, best: '42', wickets: 34, economy: 8.0 }),
  }, [9, 21, 3, 17, 0]),
  player('bosch', 'Corbin Bosch', 'sa', 'All-rounder', 'Right-hand bat', 'Right-arm fast-medium', 31, {
    T20: s({ matches: 8, runs: 60, best: '22', wickets: 7, economy: 8.6 }),
  }, [3, 12, 0, 6, 9]),
  player('rabada', 'Kagiso Rabada', 'sa', 'Bowler', 'Left-hand bat', 'Right-arm fast', 31, {
    T20: s({ matches: 72, best: '4/21', wickets: 82, economy: 8.2, bowlingAverage: 25.1 }),
  }, [1, 2, 0, 3, 1]),
  player('ngidi', 'Lungi Ngidi', 'sa', 'Bowler', 'Right-hand bat', 'Right-arm fast', 30, {
    T20: s({ matches: 46, best: '4/19', wickets: 66, economy: 8.4 }),
  }, [0, 2, 1, 1, 2]),
  player('maharaj', 'Keshav Maharaj', 'sa', 'Bowler', 'Right-hand bat', 'Slow left-arm orthodox', 36, {
    T20: s({ matches: 40, best: '3/21', wickets: 38, economy: 7.3 }),
  }, [1, 1, 2, 0, 3]),
  player('linde', 'George Linde', 'sa', 'All-rounder', 'Left-hand bat', 'Slow left-arm orthodox', 35, {
    T20: s({ matches: 16, runs: 140, best: '33', wickets: 15, economy: 7.0 }),
  }, [11, 0, 23, 4, 8]),
  // Elsewhere (rankings and live matches)
  player('root', 'Joe Root', 'eng', 'Batter', 'Right-hand bat', 'Right-arm offbreak', 35, {
    ODI: s({ matches: 182, runs: 7300, average: 48.3, strikeRate: 86.8, hundreds: 19, fifties: 42, best: '166' }),
  }, [62, 104, 13, 48, 77]),
  player('brook', 'Harry Brook', 'eng', 'Batter', 'Right-hand bat', undefined, 27, {
    ODI: s({ matches: 32, runs: 1210, average: 41.7, strikeRate: 98.4, hundreds: 2, fifties: 8, best: '110' }),
  }, [80, 22, 51, 6, 39]),
  player('henry', 'Matt Henry', 'nz', 'Bowler', 'Right-hand bat', 'Right-arm fast-medium', 34, {
    ODI: s({ matches: 92, best: '5/30', wickets: 160, economy: 5.3 }),
  }, [2, 3, 1, 4, 2]),
  player('santner', 'Mitchell Santner', 'nz', 'All-rounder', 'Left-hand bat', 'Slow left-arm orthodox', 34, {
    ODI: s({ matches: 110, runs: 1520, best: '67', wickets: 120, economy: 4.7 }),
  }, [1, 2, 2, 0, 1]),
  player('mendis', 'Kusal Mendis', 'sl', 'Wicketkeeper', 'Right-hand bat', undefined, 31, {
    Test: s({ matches: 70, runs: 4410, average: 37.4, strikeRate: 62.5, hundreds: 10, fifties: 22, best: '176' }),
  }, [124, 18, 40, 7, 63]),
  player('mushfiq', 'Mushfiqur Rahim', 'ban', 'Wicketkeeper', 'Right-hand bat', undefined, 39, {
    Test: s({ matches: 98, runs: 6300, average: 38.9, strikeRate: 47.1, hundreds: 12, fifties: 28, best: '219*' }),
  }, [71, 4, 35, 106, 22]),
  player('gill', 'Shubman Gill', 'ind', 'Batter', 'Right-hand bat', undefined, 27, {
    T20: s({ matches: 36, runs: 1040, average: 32.5, strikeRate: 141.1, hundreds: 1, fifties: 5, best: '126*' }),
  }, [47, 12, 88, 31, 4]),
  player('bumrah', 'Jasprit Bumrah', 'ind', 'Bowler', 'Right-hand bat', 'Right-arm fast', 32, {
    T20: s({ matches: 80, best: '3/7', wickets: 102, economy: 6.3 }),
  }, [2, 1, 3, 2, 1]),
];

export const venues: Venue[] = [
  { id: 'pindi', name: 'Rawalpindi Cricket Stadium', city: 'Rawalpindi', country: 'Pakistan', avgFirstInnings: 182, paceShare: 0.62 },
  { id: 'gaddafi', name: 'Gaddafi Stadium', city: 'Lahore', country: 'Pakistan', avgFirstInnings: 176, paceShare: 0.55 },
  { id: 'nsk', name: 'National Bank Stadium', city: 'Karachi', country: 'Pakistan', avgFirstInnings: 171, paceShare: 0.51 },
  { id: 'wellington', name: 'Sky Stadium', city: 'Wellington', country: 'New Zealand', avgFirstInnings: 268, paceShare: 0.71 },
  { id: 'galle', name: 'Galle International Stadium', city: 'Galle', country: 'Sri Lanka', avgFirstInnings: 352, paceShare: 0.28 },
  { id: 'gwalior', name: 'Shrimant Madhavrao Scindia Stadium', city: 'Gwalior', country: 'India', avgFirstInnings: 178, paceShare: 0.5 },
  { id: 'ufone', name: 'Iqbal Stadium', city: 'Faisalabad', country: 'Pakistan', avgFirstInnings: 164, paceShare: 0.58 },
  { id: 'adelaide', name: 'Adelaide Oval', city: 'Adelaide', country: 'Australia', avgFirstInnings: 281, paceShare: 0.66 },
];

export const series: Series[] = [
  { id: 'pak-sa-t20', name: 'South Africa tour of Pakistan 2026', short: 'PAK v SA T20Is', slug: 'south-africa-tour-of-pakistan-2026', format: 'T20', kind: 'bilateral', start: '2026-10-21', end: '2026-10-25', teamIds: ['pak', 'sa'], color: '#1FB86A' },
  { id: 'nz-eng-odi', name: 'England tour of New Zealand 2026', short: 'NZ v ENG ODIs', slug: 'england-tour-of-new-zealand-2026', format: 'ODI', kind: 'bilateral', start: '2026-10-23', end: '2026-10-29', teamIds: ['nz', 'eng'], color: '#E8475F' },
  { id: 'sl-ban-test', name: 'Bangladesh tour of Sri Lanka 2026', short: 'SL v BAN Tests', slug: 'bangladesh-tour-of-sri-lanka-2026', format: 'Test', kind: 'bilateral', start: '2026-10-13', end: '2026-10-25', teamIds: ['sl', 'ban'], color: '#4F7BFF' },
  { id: 'ind-wi-t20', name: 'West Indies tour of India 2026', short: 'IND v WI T20Is', slug: 'west-indies-tour-of-india-2026', format: 'T20', kind: 'bilateral', start: '2026-10-24', end: '2026-11-02', teamIds: ['ind', 'wi'], color: '#3E8BFF' },
  { id: 'nt20', name: 'National T20 Cup 2026', short: 'National T20 Cup', slug: 'national-t20-cup-2026', format: 'T20', kind: 'tournament', start: '2026-10-10', end: '2026-11-05', teamIds: ['lw', 'kb'], color: '#8FA3C8' },
  { id: 'psl11', name: 'HBL Pakistan Super League 2026', short: 'PSL 11', slug: 'psl-2026', format: 'T20', kind: 'league', start: '2026-04-11', end: '2026-05-18', teamIds: ['lq', 'kk', 'iu', 'pz', 'qg', 'ms'], color: '#F5C04A' },
  { id: 'aus-afg-odi', name: 'Afghanistan tour of Australia 2026', short: 'AUS v AFG ODIs', slug: 'afghanistan-tour-of-australia-2026', format: 'ODI', kind: 'bilateral', start: '2026-10-19', end: '2026-10-26', teamIds: ['aus', 'afg'], color: '#F5C518' },
];

export const authors: Author[] = [
  { id: 'a1', name: 'Hamza Qureshi', role: 'Senior Cricket Writer', initials: 'HQ' },
  { id: 'a2', name: 'Ayesha Malik', role: 'PSL Correspondent', initials: 'AM' },
  { id: 'a3', name: 'Usman Siddiqui', role: 'Data & Analysis Editor', initials: 'US' },
  { id: 'a4', name: 'زینب احمد', role: 'اردو ڈیسک', initials: 'ز' },
];

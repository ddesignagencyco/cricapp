import { isSportRadarId, num, str } from '../utils/extract';
import {
  cap,
  cricketOversToBalls,
  formatCricketOvers,
  formatDate,
  formatNumber,
  formatPlayerName,
  formatRate,
  formatScheduled,
  formatTeamSelectLabel,
  formatTime,
  getInitials,
  getPslLogo,
  mapBatting,
  mapBowling,
  toKarachiISODate,
} from '../utils/helpers';
import { mediaFileName } from '../utils/mediaDownload';

describe('isSportRadarId', () => {
  it('recognises namespaced provider ids', () => {
    expect(isSportRadarId('sr:match:67132180')).toBe(true);
    expect(isSportRadarId('sr:competitor:195222')).toBe(true);
    expect(isSportRadarId('  sr:tournament:38573 ')).toBe(true);
  });

  it('does not treat ordinary text as an id', () => {
    expect(isSportRadarId('Pakistan')).toBe(false);
    expect(isSportRadarId('sr:')).toBe(false);
  });
});

describe('str', () => {
  it('hides raw provider ids instead of showing them to readers', () => {
    expect(str('sr:tournament:38573')).toBe('');
  });

  it('reads a display value out of a nested object', () => {
    expect(str({ name: 'Lahore Qalandars' })).toBe('Lahore Qalandars');
    expect(str({ title: 'Final' })).toBe('Final');
    expect(str({ name: 'sr:x:1', city_name: 'Karachi' })).toBe('Karachi');
  });

  it('returns an empty string for unusable input', () => {
    expect(str('')).toBe('');
    expect(str('   ')).toBe('');
    expect(str(null)).toBe('');
    expect(str(42)).toBe('');
  });
});

describe('num', () => {
  it('parses numbers and numeric strings', () => {
    expect(num(5)).toBe(5);
    expect(num('5.5')).toBe(5.5);
  });

  it('returns null for anything unparseable', () => {
    expect(num('abc')).toBeNull();
    expect(num(null)).toBeNull();
    expect(num(undefined)).toBeNull();
  });
});

describe('getInitials', () => {
  it('uses the first letter of the first two words', () => {
    expect(getInitials('Babar Azam')).toBe('BA');
    expect(getInitials('Mohammad Rizwan')).toBe('MR');
  });

  it('skips filler words', () => {
    expect(getInitials('Karachi Kings of the East')).toBe('KK');
  });

  it('falls back to two characters for a single word', () => {
    expect(getInitials('Islamabad')).toBe('IS');
  });

  it('returns a question mark for an empty name', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials(null)).toBe('?');
  });
});

describe('formatPlayerName', () => {
  it('flips the SportRadar "Last, First" form', () => {
    expect(formatPlayerName('Khan, Yasir')).toBe('Yasir Khan');
  });

  it('leaves a normal name alone', () => {
    expect(formatPlayerName('Babar Azam')).toBe('Babar Azam');
    expect(formatPlayerName('')).toBe('Player');
  });
});

describe('overs helpers', () => {
  it('converts cricket overs to legal balls', () => {
    expect(cricketOversToBalls(15.3)).toBe(93);
    expect(cricketOversToBalls(0.6)).toBe(6);
  });

  it('returns null for missing or invalid overs', () => {
    expect(cricketOversToBalls('')).toBeNull();
    expect(cricketOversToBalls(null)).toBeNull();
    expect(cricketOversToBalls('abc')).toBeNull();
  });

  it('formats overs without inventing NaN', () => {
    expect(formatCricketOvers(15.3)).toBe('15.3');
    expect(formatCricketOvers(20)).toBe('20');
    expect(formatCricketOvers('nope')).toBe('');
  });
});

describe('number and rate formatting', () => {
  it('groups thousands and defaults an empty value to zero', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber('')).toBe('0');
  });

  it('dashes a missing rate', () => {
    expect(formatRate(null)).toBe('—');
    expect(formatRate(undefined)).toBe('—');
    expect(formatRate(8.456)).toBe('8.46');
  });

  it('capitalises and dashes', () => {
    expect(cap('lEADING')).toBe('Leading');
    expect(cap('')).toBe('—');
  });
});

describe('date and time formatting', () => {
  it('formats a date in the app time zone', () => {
    // 23:30 UTC on the 28th is already the 29th in Asia/Karachi (+5).
    expect(toKarachiISODate(new Date('2026-09-28T23:30:00Z'))).toBe('2026-09-29');
  });

  it('splits a scheduled timestamp into date and 24h time', () => {
    const { date, time } = formatScheduled('2026-09-24T09:30:00Z');
    expect(date).toBe('2026-09-24');
    expect(time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('returns empty parts rather than "Invalid Date"', () => {
    expect(formatScheduled(undefined)).toEqual({ date: '', time: '' });
    expect(formatScheduled('not-a-date')).toEqual({ date: '', time: '' });
    expect(formatDate('bad')).toBe('');
  });

  it('converts a 24h kickoff to a 12h label', () => {
    expect(formatTime('14:30')).toBe('2:30 PM');
    expect(formatTime('09:05')).toBe('9:05 AM');
    expect(formatTime('00:00')).toBe('12:00 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime(undefined)).toBe('');
  });
});

describe('scorecard row mapping', () => {
  it('formats strike rate to two decimals', () => {
    const rows = mapBatting([{ id: '1', name: 'Babar', out: true, runs: 60, balls: 30, fours: 4, sixes: 1, sr: 200 }]);
    expect(rows[0].sr).toBe('200.00');
  });

  it('handles an absent row list', () => {
    expect(mapBatting(undefined)).toEqual([]);
    expect(mapBowling(undefined)).toEqual([]);
  });

  it('dashes economy for a bowler who conceded nothing', () => {
    const rows = mapBowling([
      { id: '1', name: 'Shaheen', overs: 4, maidens: 0, runs: 0, wickets: 0, econ: 0 },
    ]);
    expect(rows[0].econ).toBe('—');
  });
});

describe('team select and PSL logos', () => {
  it('builds a readable team label', () => {
    expect(formatTeamSelectLabel({ name: 'Lahore Qalandars', abbr: 'LQA' })).toBe('Lahore Qalandars (LQA)');
    expect(formatTeamSelectLabel({ name: 'Lahore Qalandars' })).toBe('Lahore Qalandars');
    expect(formatTeamSelectLabel({ name: 'X', kindLabel: 'Women' })).toBe('X · Women');
  });

  it('returns a logo for a known code and null otherwise', () => {
    expect(getPslLogo('LQA')).toContain('http');
    expect(getPslLogo('lqa')).toContain('http');
    expect(getPslLogo('unknown')).toBeNull();
    expect(getPslLogo('')).toBeNull();
  });
});

describe('mediaFileName', () => {
  it('slugifies the title and keeps the extension from the url', () => {
    expect(mediaFileName('Babar Azam century!', 'https://cdn.example.com/a/photo.JPG')).toBe(
      'babar-azam-century.jpg'
    );
  });

  it('does not double up the extension already in the title', () => {
    expect(mediaFileName('final.png', 'https://cdn.example.com/photo.png')).toBe('final.png');
  });

  it('falls back to a generic name and the given extension', () => {
    expect(mediaFileName('', 'https://cdn.example.com/render', 'mp4')).toBe('pakcriczone-media.mp4');
  });

  it('strips characters that are illegal in a filename', () => {
    const name = mediaFileName('A/B:C*D?"E', 'https://cdn.example.com/x.png');
    expect(name).toBe('a-b-c-d-e.png');
  });

  it('caps the length so long titles stay valid on every filesystem', () => {
    const name = mediaFileName('x'.repeat(200), 'https://cdn.example.com/a.png');
    expect(name.length).toBeLessThanOrEqual(64);
  });
});

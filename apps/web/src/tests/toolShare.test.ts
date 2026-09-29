import { buildShareText, buildResultUrl, cleanInputs, isShareableValue, shareSheetTitle } from '../lib/toolShare';

describe('isShareableValue', () => {
  it('accepts a real result', () => {
    expect(isShareableValue('145')).toBe(true);
    expect(isShareableValue('6.25')).toBe(true);
    expect(isShareableValue('not out')).toBe(true);
  });

  it('rejects the placeholders a tool shows before it has computed anything', () => {
    ['', '  ', '—', '–', '…', 'Loading', 'N/A', 'null', 'undefined'].forEach((v) => {
      expect(isShareableValue(v)).toBe(false);
    });
  });
});

describe('cleanInputs', () => {
  it('keeps labelled rows with both parts filled', () => {
    expect(cleanInputs([{ label: 'Overs', value: '20' }])).toEqual([{ label: 'Overs', value: '20' }]);
  });

  it('trims whitespace on both fields', () => {
    expect(cleanInputs([{ label: '  Target ', value: ' 160 ' }])).toEqual([{ label: 'Target', value: '160' }]);
  });

  it('drops a row with a missing label or value', () => {
    expect(cleanInputs([{ label: '', value: '20' }, { label: 'Overs', value: '' }])).toEqual([]);
  });

  it('drops a placeholder value', () => {
    expect(cleanInputs([{ label: 'Result', value: '—' }])).toEqual([]);
  });

  it('never shares anything that looks like a credential', () => {
    const rows = cleanInputs([
      { label: 'Password', value: 'hunter2' },
      { label: 'api_key', value: 'abc123' },
      { label: 'Auth token', value: 'xyz' },
      { label: 'Overs', value: '20' },
    ]);
    expect(rows).toEqual([{ label: 'Overs', value: '20' }]);
  });

  it('is safe with no arguments', () => {
    expect(cleanInputs()).toEqual([]);
  });
});

describe('buildShareText', () => {
  it('leads with the tool and the answer, not the url', () => {
    const text = buildShareText({
      toolTitle: 'DLS calculator',
      label: 'New target',
      value: '145',
      url: 'https://pakcriczone.com/tools/dls',
    });
    expect(text.split('\n')[0]).toBe('🏏 DLS calculator');
    expect(text.split('\n')[1]).toBe('New target: 145');
    // The url comes last, so a chat preview shows the number.
    expect(text.indexOf('New target: 145')).toBeLessThan(text.indexOf('https://'));
  });

  it('includes the inputs as one readable line', () => {
    const text = buildShareText({
      toolTitle: 'DLS calculator',
      label: 'New target',
      value: '145',
      url: 'https://pakcriczone.com/tools/dls',
      inputs: [
        { label: 'Overs available', value: '20' },
        { label: 'Target', value: '160' },
      ],
    });
    expect(text).toContain('Overs available: 20 · Target: 160');
  });

  it('omits the inputs line entirely when there are none', () => {
    const text = buildShareText({ toolTitle: 'RRR', label: 'Required rate', value: '9.12' });
    expect(text).toBe('🏏 RRR\nRequired rate: 9.12');
  });

  it('omits the url line when there is no page url', () => {
    expect(buildShareText({ toolTitle: 'RRR', label: 'Rate', value: '9' })).not.toContain('👉');
  });

  it('falls back to a generic title and label rather than blanks', () => {
    const text = buildShareText({ toolTitle: '', label: '', value: '5' });
    expect(text).toBe('🏏 Cricket tool\nResult: 5');
  });

  it('keeps a "not out" style value, which is a real answer', () => {
    const text = buildShareText({ toolTitle: 'Average', label: 'Batters dismissed', value: 'not out' });
    expect(text).toContain('Batters dismissed: not out');
  });

  it('does not leak a credential that a tool accidentally passed', () => {
    const text = buildShareText({
      toolTitle: 'X',
      label: 'Y',
      value: '5',
      inputs: [{ label: 'api_key', value: 'sk-live-123' }],
    });
    expect(text).not.toContain('sk-live-123');
  });
});

describe('buildResultUrl', () => {
  it('appends the inputs as query params', () => {
    expect(buildResultUrl('https://pakcriczone.com/tools/dls', 'dls', [{ label: 'Overs', value: '20' }])).toBe(
      'https://pakcriczone.com/tools/dls?overs=20',
    );
  });

  it('lowercases and underscores the keys', () => {
    expect(
      buildResultUrl('https://x.test/tools/a', 'a', [{ label: 'Required Run Rate', value: '9.12' }]),
    ).toBe('https://x.test/tools/a?required_run_rate=9.12');
  });

  it('merges into an existing query string', () => {
    expect(
      buildResultUrl('https://x.test/tools/a?ref=whatsapp', 'a', [{ label: 'Overs', value: '20' }]),
    ).toBe('https://x.test/tools/a?ref=whatsapp&overs=20');
  });

  it('leaves the url alone when there is nothing to add', () => {
    expect(buildResultUrl('https://x.test/tools/a', 'a')).toBe('https://x.test/tools/a');
    expect(buildResultUrl('https://x.test/tools/a', 'a', [{ label: '', value: '' }])).toBe('https://x.test/tools/a');
  });

  it('encodes a value with a space or an ampersand', () => {
    const url = buildResultUrl('https://x.test/t', 't', [{ label: 'Note', value: 'a b&c' }]);
    expect(url).toBe('https://x.test/t?note=a+b%26c');
    expect(new URL(url).searchParams.get('note')).toBe('a b&c');
  });
});

describe('shareSheetTitle', () => {
  it('combines the tool and the label', () => {
    expect(shareSheetTitle('Net run rate', 'NRR')).toBe('Net run rate — NRR');
  });

  it('falls back when the label is missing', () => {
    expect(shareSheetTitle('Net run rate', '')).toBe('Net run rate — Result');
  });
});

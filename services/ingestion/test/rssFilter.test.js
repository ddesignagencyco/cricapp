import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAttributionHtml,
  buildSourceGuid,
  matchesTopicFilter,
  sanitizeRssHtml,
  stripHtmlToText,
} from '../src/rssFilter.js';

describe('matchesTopicFilter', () => {
  const sample = {
    title: 'Babar Azam leads Pakistan to thrilling PSL victory in Lahore',
    summary: '<p>A dominant T20 chase at Gaddafi Stadium.</p>',
    categories: ['Pakistan Cricket', 'PSL'],
  };

  it('matches all items when includeKeywords is empty', () => {
    const res = matchesTopicFilter(sample, [], []);
    assert.equal(res.matched, true);
  });

  it('matches case-insensitively on word boundaries', () => {
    const res = matchesTopicFilter(sample, ['psl', 'ipl'], []);
    assert.equal(res.matched, true);
    assert.deepEqual(res.matchedKeywords, ['psl']);
  });

  it('does not match partial substrings inside unrelated words', () => {
    const res = matchesTopicFilter(
      { title: 'Football transfer news today', summary: 'Premier league update', categories: [] },
      ['ball'],
      [],
    );
    assert.equal(res.matched, false);
  });

  it('rejects items matching excludeKeywords even when includeKeywords match', () => {
    const res = matchesTopicFilter(
      { ...sample, title: 'Sponsored betting tips for Pakistan PSL match' },
      ['PSL', 'Pakistan'],
      ['betting', 'sponsored'],
    );
    assert.equal(res.matched, false);
    assert.equal(res.excludedBy, 'betting');
  });
});

describe('sanitizeRssHtml & attribution helpers', () => {
  it('strips script tags, iframes, inline styles, and event handlers', () => {
    const dirty = '<p style="color:red" onclick="alert(1)">Hello<script>evil()</script><iframe src="x"></iframe></p>';
    const clean = sanitizeRssHtml(dirty);
    assert.equal(clean, '<p>Hello</p>');
  });

  it('strips HTML to plain text cleanly', () => {
    assert.equal(stripHtmlToText('<p>Hello <b>world</b></p>'), 'Hello world');
  });

  it('builds deterministic source GUIDs per feed URL and item', () => {
    const a = buildSourceGuid('https://example.com/rss', { guid: '123', title: 'A' });
    const b = buildSourceGuid('https://example.com/rss', { guid: '123', title: 'A' });
    const c = buildSourceGuid('https://other.com/rss', { guid: '123', title: 'A' });
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.ok(a.startsWith('rss:'));
  });

  it('builds safe attribution HTML with rel noopener nofollow', () => {
    const html = buildAttributionHtml('Match summary.', 'ESPNcricinfo', 'https://espncricinfo.com/story/1');
    assert.ok(html.includes('Originally reported by'));
    assert.ok(html.includes('rel="noopener noreferrer nofollow"'));
  });
});

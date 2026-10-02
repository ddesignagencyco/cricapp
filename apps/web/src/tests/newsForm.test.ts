import {
  NEWS_PUSH_BODY_MAX,
  NEWS_PUSH_TITLE_MAX,
  NEWS_SOCIAL_COPY_MAX,
  blockingNewsFields,
  buildNewsPayload,
  bylineForProfile,
  validateNewsDraft,
  type NewsFormValues,
} from '../lib/newsForm';

/** A minimal but complete editor form: required fields filled, everything else blank. */
const ready: NewsFormValues = {
  title: 'Babar Azam seals a thriller at Gaddafi Stadium',
  slug: 'babar-azam-seals-thriller',
  content: '<p>Lahore won by six runs.</p>',
  language: 'en',
  pushNotificationTitle: '',
  pushNotificationBody: '',
  socialCopy: '',
  summary: '',
  imageUrl: '',
  author: '',
  authorId: '',
  source: '',
  categoryId: '',
  metaTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  players: [],
  teams: [],
  matches: [],
  series: [],
};

describe('a draft the API will accept', () => {
  it('has nothing to fix', () => {
    expect(validateNewsDraft(ready)).toEqual({});
    expect(blockingNewsFields(validateNewsDraft(ready))).toEqual([]);
  });

  it('accepts a headline of exactly the word limit', () => {
    const title = Array.from({ length: 50 }, (_, i) => `w${i}`).join(' ');
    expect(validateNewsDraft({ ...ready, title })).toEqual({});
  });

  it('accepts push and social copy of exactly the API limit', () => {
    expect(
      validateNewsDraft({
        ...ready,
        pushNotificationTitle: 'a'.repeat(NEWS_PUSH_TITLE_MAX),
        pushNotificationBody: 'b'.repeat(NEWS_PUSH_BODY_MAX),
        socialCopy: 'c'.repeat(NEWS_SOCIAL_COPY_MAX),
      }),
    ).toEqual({});
  });
});

describe('the fields the API requires', () => {
  it('reports a missing headline', () => {
    expect(validateNewsDraft({ ...ready, title: '   ' }).title).toMatch(/required/i);
  });

  it('reports missing content even when the body holds only markup', () => {
    expect(validateNewsDraft({ ...ready, content: '<p><br></p>' }).content).toMatch(/required/i);
    expect(validateNewsDraft({ ...ready, content: '   ' }).content).toMatch(/required/i);
  });

  it('reports a headline over the word limit', () => {
    const title = Array.from({ length: 51 }, (_, i) => `w${i}`).join(' ');
    expect(validateNewsDraft({ ...ready, title }).title).toMatch(/50 words or fewer/);
  });

  it('reports a slug the API pattern would reject', () => {
    expect(validateNewsDraft({ ...ready, slug: 'not a slug!' }).slug).toMatch(/letters, numbers, and hyphens/);
  });

  it('allows a blank slug, which the API generates from the headline', () => {
    expect(validateNewsDraft({ ...ready, slug: '' }).slug).toBeUndefined();
  });

  it('reports a language outside en/ur', () => {
    expect(validateNewsDraft({ ...ready, language: 'fr' }).language).toMatch(/English or Urdu/);
  });
});

describe('the push and social limits the API enforces', () => {
  it('names the field, its length and how much to cut', () => {
    const errors = validateNewsDraft({
      ...ready,
      pushNotificationTitle: 'a'.repeat(NEWS_PUSH_TITLE_MAX + 1),
      pushNotificationBody: 'b'.repeat(NEWS_PUSH_BODY_MAX + 12),
      socialCopy: 'c'.repeat(NEWS_SOCIAL_COPY_MAX + 3),
    });
    expect(errors.pushNotificationTitle).toContain(`${NEWS_PUSH_TITLE_MAX + 1} characters`);
    expect(errors.pushNotificationTitle).toContain('trim 1');
    expect(errors.pushNotificationBody).toContain('trim 12');
    expect(errors.socialCopy).toContain('trim 3');
  });

  it('ignores surrounding whitespace when counting', () => {
    const padded = `  ${'a'.repeat(NEWS_PUSH_TITLE_MAX)}  `;
    expect(validateNewsDraft({ ...ready, pushNotificationTitle: padded }).pushNotificationTitle).toBeUndefined();
  });
});

describe('what the editor tells the writer', () => {
  it('lists the blocking fields in reading order', () => {
    const blocking = blockingNewsFields(validateNewsDraft({ ...ready, title: '', slug: 'bad slug!' }));
    expect(blocking.map((row) => row.label)).toEqual(['Headline', 'Slug']);
  });

  it('includes an optional field that the API would reject', () => {
    // An over-long push title is optional to fill in, but not optional to fill in wrongly.
    const blocking = blockingNewsFields(
      validateNewsDraft({ ...ready, pushNotificationTitle: 'a'.repeat(NEWS_PUSH_TITLE_MAX + 1) }),
    );
    expect(blocking.map((row) => row.label)).toEqual(['Push title']);
  });
});

/**
 * The exact field list of `CreateNewsDto` / `UpdateNewsDto` in
 * `apps/api/src/news/dto/news.dto.ts`. Kept here as a literal so a rename on either side
 * shows up as a failing test rather than as a 400 in the editor.
 */
const API_NEWS_FIELDS = [
  'title',
  'slug',
  'summary',
  'content',
  'imageUrl',
  'author',
  'authorId',
  'source',
  'categoryId',
  'language',
  'metaTitle',
  'metaDescription',
  'canonicalUrl',
  'translationGroupId',
  'pushNotificationTitle',
  'pushNotificationBody',
  'socialCopy',
  'isPublished',
  'playerIds',
  'teamIds',
  'matchIds',
  'seriesIds',
] as const;

const filled: NewsFormValues = {
  ...ready,
  summary: 'A one-line lead.',
  imageUrl: 'https://cdn.example/cover.jpg',
  author: 'CricApp Editorial',
  authorId: 'author-1',
  source: 'PCB',
  categoryId: 'cat-1',
  metaTitle: 'Babar seals a thriller',
  metaDescription: 'Lahore win by six runs.',
  canonicalUrl: 'https://cricapp.com/news/babar-azam-seals-thriller',
  pushNotificationTitle: 'Bazar Azam seals it',
  pushNotificationBody: 'Lahore beat Islamabad by six runs.',
  socialCopy: 'What a finish at Gaddafi. #PSL',
  players: [{ id: 'sr:player:1' }],
  teams: [{ id: 'sr:competitor:2' }],
  matches: [{ id: 'sr:match:3' }],
  series: [{ id: 'sr:tournament:4' }],
};

describe('the request the editor sends', () => {
  it('only sends fields the API accepts', () => {
    const payload = buildNewsPayload(filled, false);
    for (const key of Object.keys(payload)) {
      expect(API_NEWS_FIELDS).toContain(key);
    }
  });

  it('sends every field the editor holds', () => {
    const payload = buildNewsPayload(filled, true);
    // translationGroupId is the API's own: it groups translations, and the editor never
    // sets it by hand. Everything else in the form must reach the API.
    expect(Object.keys(payload).sort()).toEqual(API_NEWS_FIELDS.filter((f) => f !== 'translationGroupId').slice().sort());
  });

  it('always sends the two required fields and the publish flag', () => {
    const payload = buildNewsPayload(ready, false);
    expect(payload.title).toBe('Babar Azam seals a thriller at Gaddafi Stadium');
    expect(payload.content).toBe('<p>Lahore won by six runs.</p>');
    expect(payload.isPublished).toBe(false);
  });

  it('leaves blank optional fields out instead of sending empty strings', () => {
    // The API would store "" rather than null, and a blank canonical URL is worse than none.
    const payload = buildNewsPayload(ready, true);
    expect(payload).not.toHaveProperty('summary');
    expect(payload).not.toHaveProperty('imageUrl');
    expect(payload).not.toHaveProperty('canonicalUrl');
    expect(payload).not.toHaveProperty('socialCopy');
  });

  it('derives the slug from the headline when the editor left it blank', () => {
    expect(buildNewsPayload({ ...filled, slug: '' }, false).slug).toBe(
      'babar-azam-seals-a-thriller-at-gaddafi-stadium',
    );
  });

  it('keeps a slug the editor typed', () => {
    expect(buildNewsPayload({ ...filled, slug: 'custom-slug' }, false).slug).toBe('custom-slug');
  });

  it('sends the push and social copy the API has columns for', () => {
    const payload = buildNewsPayload(filled, true);
    expect(payload.pushNotificationTitle).toBe('Bazar Azam seals it');
    expect(payload.pushNotificationBody).toBe('Lahore beat Islamabad by six runs.');
    expect(payload.socialCopy).toBe('What a finish at Gaddafi. #PSL');
  });

  it('sends linked ids, not the labels the editor typed', () => {
    const payload = buildNewsPayload(filled, false);
    expect(payload.playerIds).toEqual(['sr:player:1']);
    expect(payload.teamIds).toEqual(['sr:competitor:2']);
    expect(payload.matchIds).toEqual(['sr:match:3']);
    expect(payload.seriesIds).toEqual(['sr:tournament:4']);
  });

  it('sends empty id lists rather than omitting them, so a link is cleared', () => {
    const payload = buildNewsPayload({ ...filled, players: [], teams: [], matches: [], series: [] }, false);
    expect(payload.playerIds).toEqual([]);
    expect(payload.matchIds).toEqual([]);
  });

  it('trims what it sends', () => {
    const payload = buildNewsPayload({ ...filled, summary: '  A one-line lead.  ', author: ' Staff ' }, false);
    expect(payload.summary).toBe('A one-line lead.');
    expect(payload.author).toBe('Staff');
  });
});

describe('the byline that follows the author profile', () => {
  it('fills an empty byline from the chosen profile', () => {
    expect(bylineForProfile('Ali Khan', '', true)).toEqual({ byline: 'Ali Khan', isAuto: true });
  });

  it('follows the profile while the byline is still auto-filled', () => {
    expect(bylineForProfile('Ali Khan', 'Ali Khan', true)).toEqual({ byline: 'Ali Khan', isAuto: true });
    expect(bylineForProfile('Sana Mir', 'Ali Khan', true)).toEqual({ byline: 'Sana Mir', isAuto: true });
  });

  it('never overwrites a byline the writer typed', () => {
    // A guest writer credited under a different name than the staff profile.
    expect(bylineForProfile('Ali Khan', 'Guest Reporter', false)).toEqual({
      byline: 'Guest Reporter',
      isAuto: false,
    });
  });

  it('leaves the byline alone when no profile is chosen', () => {
    expect(bylineForProfile('', 'Guest Reporter', false)).toEqual({ byline: 'Guest Reporter', isAuto: false });
    expect(bylineForProfile('', '', true)).toEqual({ byline: '', isAuto: true });
  });

  it('ignores a whitespace-only profile name', () => {
    expect(bylineForProfile('   ', 'Guest Reporter', true)).toEqual({ byline: 'Guest Reporter', isAuto: true });
  });
});
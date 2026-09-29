import { sanitizeArticleHtml } from '../utils/sanitizeHtml';

describe('sanitizeArticleHtml', () => {
  it('returns an empty string for empty input', () => {
    expect(sanitizeArticleHtml('')).toBe('');
  });

  it('keeps allow-listed formatting tags', () => {
    expect(sanitizeArticleHtml('<p>Hello <strong>world</strong></p>')).toBe(
      '<p>Hello <strong>world</strong></p>',
    );
  });

  it('keeps headings and lists', () => {
    const html = '<h2>Title</h2><ul><li>One</li><li>Two</li></ul>';
    expect(sanitizeArticleHtml(html)).toBe(html);
  });

  it('strips script tags but keeps surrounding text', () => {
    // The tag is removed; the body text is not part of a tag match so it stays.
    expect(sanitizeArticleHtml('<p>Safe</p><script>alert(1)</script>')).toBe(
      '<p>Safe</p>alert(1)',
    );
  });

  it('strips event handler attributes on allow-listed tags', () => {
    expect(sanitizeArticleHtml('<p onclick="steal()">text</p>')).toBe('<p>text</p>');
  });

  it('strips iframes entirely', () => {
    expect(sanitizeArticleHtml('<iframe src="https://evil.test"></iframe>')).toBe('');
  });

  it('strips style tags', () => {
    expect(sanitizeArticleHtml('<style>body{display:none}</style>')).toBe(
      'body{display:none}',
    );
  });

  describe('anchors', () => {
    it('keeps an https href and forces safe rel attributes', () => {
      expect(sanitizeArticleHtml('<a href="https://example.com">link</a>')).toBe(
        '<a href="https://example.com" rel="noopener noreferrer">link</a>',
      );
    });

    it('keeps a relative href', () => {
      expect(sanitizeArticleHtml('<a href="/news/1">link</a>')).toBe(
        '<a href="/news/1" rel="noopener noreferrer">link</a>',
      );
    });

    it('keeps a mailto href', () => {
      expect(sanitizeArticleHtml('<a href="mailto:a@b.com">mail</a>')).toBe(
        '<a href="mailto:a@b.com" rel="noopener noreferrer">mail</a>',
      );
    });

    it('drops a javascript: href', () => {
      // The tag survives but the unsafe url is discarded, so there is nothing to click.
      expect(sanitizeArticleHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
    });

    it('drops a data: href', () => {
      expect(sanitizeArticleHtml('<a href="data:text/html;base64,AAA">x</a>')).toBe('<a>x</a>');
    });

    it('escapes quotes in the href so the attribute cannot be broken out of', () => {
      expect(sanitizeArticleHtml('<a href=\'https://e.com/?a="b\'>x</a>')).toContain('&quot;');
    });
  });

  describe('images', () => {
    it('keeps a remote image with a lazy hint', () => {
      expect(sanitizeArticleHtml('<img src="https://cdn.test/a.jpg" alt="A">')).toBe(
        '<img src="https://cdn.test/a.jpg" alt="A" loading="lazy" class="news-image">',
      );
    });

    it('drops the whole img when src is unsafe', () => {
      expect(sanitizeArticleHtml('<img src="javascript:alert(1)" alt="A">')).toBe('');
    });

    it('keeps a base64 png data image', () => {
      const src = 'data:image/png;base64,iVBORw0KGgo=';
      expect(sanitizeArticleHtml(`<img src="${src}">`)).toContain(`src="${src}"`);
    });

    it('drops a base64 svg data image because svg can carry script', () => {
      expect(
        sanitizeArticleHtml('<img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=">'),
      ).toBe('');
    });

    it('escapes the alt attribute', () => {
      expect(sanitizeArticleHtml('<img src="https://c.test/a.png" alt=\'a"b\'>')).toContain(
        'alt="a&quot;b"',
      );
    });
  });

  it('normalises self-closing br and hr', () => {
    expect(sanitizeArticleHtml('<br/><hr/>')).toBe('<br><hr>');
  });

  it('lowercases tag names so uppercase script is still stripped', () => {
    expect(sanitizeArticleHtml('<SCRIPT>alert(1)</SCRIPT>')).toBe('alert(1)');
  });

  it('does not let a stripped tag re-open an allow-listed one', () => {
    // "<scr<script>ipt>" must not be rebuilt into a live <script> tag.
    const out = sanitizeArticleHtml('<scr<script>ipt>alert(1)</script>');
    expect(out).not.toContain('<script');
  });
});

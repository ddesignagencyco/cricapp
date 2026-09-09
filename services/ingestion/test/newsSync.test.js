import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseFeed, normalizeArticle, slugify, unescapeHtml } from "../src/newsSync.js";

describe("slugify", () => {
  it("lowercases and replaces non-alphanumeric with hyphens", () => {
    assert.equal(slugify("PSL 2026 Final Preview!"), "psl-2026-final-preview");
  });

  it("trims leading and trailing hyphens", () => {
    assert.equal(slugify("---Hello World---"), "hello-world");
  });
});

describe("unescapeHtml", () => {
  it("decodes common HTML entities", () => {
    assert.equal(unescapeHtml("&lt;div&gt;Hello &amp; World&lt;/div&gt;"), "<div>Hello & World</div>");
  });

  it("returns null for null input", () => {
    assert.equal(unescapeHtml(null), null);
  });
});

describe("parseFeed", () => {
  it("parses RSS 2.0 items", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Article One</title>
      <link>https://example.com/1</link>
      <description>Summary one</description>
      <pubDate>Mon, 01 Sep 2026 10:00:00 GMT</pubDate>
      <guid>guid-1</guid>
      <author>John Doe</author>
      <enclosure url="https://example.com/1.jpg" type="image/jpeg"/>
    </item>
    <item>
      <title><![CDATA[Article Two & More]]></title>
      <link>https://example.com/2</link>
      <description><![CDATA[<p>Summary two</p>]]></description>
      <pubDate>Mon, 01 Sep 2026 11:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

    const items = parseFeed(xml);
    assert.equal(items.length, 2);
    assert.equal(items[0].title, "Article One");
    assert.equal(items[0].link, "https://example.com/1");
    assert.equal(items[0].summary, "Summary one");
    assert.equal(items[0].guid, "guid-1");
    assert.equal(items[0].author, "John Doe");
    assert.equal(items[0].enclosureUrl, "https://example.com/1.jpg");

    assert.equal(items[1].title, "Article Two & More");
    assert.equal(items[1].summary, "<p>Summary two</p>");
  });

  it("parses Atom entries", () => {
    const xml = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Atom Article</title>
    <link href="https://example.com/atom-1"/>
    <summary>Atom summary</summary>
    <published>2026-09-01T10:00:00Z</published>
    <id>atom-1</id>
    <author><name>Jane Doe</name></author>
  </entry>
</feed>`;

    const items = parseFeed(xml);
    assert.equal(items.length, 1);
    assert.equal(items[0].title, "Atom Article");
    assert.equal(items[0].link, "https://example.com/atom-1");
    assert.equal(items[0].summary, "Atom summary");
    assert.equal(items[0].pubDate, "2026-09-01T10:00:00Z");
    assert.equal(items[0].guid, "atom-1");
    assert.equal(items[0].author, "Jane Doe");
  });

  it("returns empty array for invalid XML", () => {
    const items = parseFeed("<html><body>Not a feed</body></html>");
    assert.equal(items.length, 0);
  });
});

describe("normalizeArticle", () => {
  it("maps RSS fields to article row shape", () => {
    const raw = {
      title: "PSL Final Preview",
      link: "https://example.com/psl-final",
      summary: "A preview of the final",
      content: "<p>Full content</p>",
      pubDate: "Mon, 01 Sep 2026 10:00:00 GMT",
      guid: "guid-123",
      author: "Editor",
      enclosureUrl: "https://example.com/image.jpg",
      mediaThumbnail: null,
    };

    const article = normalizeArticle(raw, "ESPNcricinfo", "PSL");
    assert.equal(article.title, "PSL Final Preview");
    assert.ok(article.slug.startsWith("psl-final-preview-"));
    assert.equal(article.summary, "A preview of the final");
    assert.equal(article.content, "<p>Full content</p>");
    assert.equal(article.imageUrl, "https://example.com/image.jpg");
    assert.equal(article.author, "Editor");
    assert.equal(article.source, "ESPNcricinfo");
    assert.equal(article.categoryName, "PSL");
    assert.equal(article.publishedAt, "2026-09-01T10:00:00.000Z");
  });

  it("falls back to summary when content is missing", () => {
    const raw = {
      title: "Short News",
      link: "https://example.com/short",
      summary: "Only summary available",
    };

    const article = normalizeArticle(raw, "Source", "General");
    assert.equal(article.content, "Only summary available");
    assert.equal(article.categoryName, "General");
  });

  it("uses source name as author fallback", () => {
    const raw = { title: "No Author", link: "https://example.com/no-author" };
    const article = normalizeArticle(raw, "Cricbuzz", "General");
    assert.equal(article.author, "Cricbuzz");
  });

  it("handles missing dates gracefully", () => {
    const raw = { title: "No Date", link: "https://example.com/no-date" };
    const article = normalizeArticle(raw, "Source", "General");
    assert.equal(article.publishedAt, null);
  });
});

import { act, render, screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '../test/harness';

jest.mock('../services/gallery', () => ({
  fetchGalleryPage: jest.fn(),
  fetchGalleryItem: jest.fn(),
}));

// The share endpoint answers with the gallery path, which is the wrong url for a
// story. Mocked so a test can prove the viewer does not ask it for one.
jest.mock('../services/sharing', () => ({ getShareLink: jest.fn() }));

import { fetchGalleryItem, fetchGalleryPage, type GalleryMedia } from '../services/gallery';
import { getShareLink } from '../services/sharing';
import { fetchStories, fetchStoryById, toStory } from '../services/stories';
import { isDirectVideoUrl } from '../utils/galleryEmbed';
import { formatMediaDuration, formatPublishedDate } from '../utils/helpers';
import StoryCard from '../components/stories/StoryCard';
import HomeStoriesRail from '../components/stories/HomeStoriesRail';
import StoryRailCard from '../components/stories/StoryRailCard';
import StoryStage from '../components/stories/StoryStage';
import StoryViewer from '../components/stories/StoryViewer';
import { useHoverPreview } from '../components/stories/useHoverPreview';
import { isLiveStream } from '../services/streams';
import type { Story } from '../services/stories';

const list = jest.mocked(fetchGalleryPage);
const one = jest.mocked(fetchGalleryItem);

function media(overrides: Partial<GalleryMedia> = {}): GalleryMedia {
  return {
    id: 'm1',
    title: 'Yorker in the 19th',
    caption: 'Two balls and the game is done.',
    type: 'short',
    url: 'https://res.cloudinary.com/demo/video/upload/clip.mp4',
    thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/clip.jpg',
    duration: 12.4,
    width: 1080,
    height: 1920,
    format: 'mp4',
    createdAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  };
}

const page = (items: GalleryMedia[], total = items.length) => ({
  items,
  total,
  totalPages: 1,
});

const story: Story = toStory(media())!;

let playMock: jest.SpyInstance;

beforeEach(() => {
  jest.resetAllMocks();
  list.mockResolvedValue(page([]));
  one.mockResolvedValue(null);
  // jsdom has no media pipeline: play() logs "not implemented" and returns
  // undefined, which would hide the autoplay-rejection path this viewer relies on.
  playMock = jest
    .spyOn(window.HTMLMediaElement.prototype, 'play')
    .mockImplementation(() => Promise.resolve());
});

afterEach(() => {
  playMock.mockRestore();
});

describe('toStory', () => {
  it('normalises a gallery short into a story with a stable, shareable path', () => {
    expect(story).toMatchObject({
      id: 'm1',
      slug: 'm1',
      type: 'video',
      title: 'Yorker in the 19th',
      mediaUrl: 'https://res.cloudinary.com/demo/video/upload/clip.mp4',
      posterUrl: 'https://res.cloudinary.com/demo/video/upload/clip.jpg',
      duration: 12.4,
      shareUrl: '/stories/m1',
      galleryUrl: '/gallery/m1',
    });
  });

  it('drops media whose url cannot be fetched rather than rendering a broken tile', () => {
    expect(toStory(media({ url: '' }))).toBeNull();
    expect(toStory(media({ url: '#' }))).toBeNull();
    expect(toStory(media({ url: 'javascript:alert(1)' }))).toBeNull();
  });

  it('never points a video poster at the video file itself', () => {
    const bare = toStory(media({ thumbnailUrl: null }))!;
    expect(bare.posterUrl).toBeNull();
  });

  it('falls back to the file for an image poster, and treats images as images', () => {
    const photo = toStory(
      media({ type: 'image', url: 'https://res.cloudinary.com/demo/image/upload/a.jpg', thumbnailUrl: null })
    )!;
    expect(photo.type).toBe('image');
    expect(photo.posterUrl).toBe('https://res.cloudinary.com/demo/image/upload/a.jpg');
  });

  it('resolves an external video url to an embed and leaves a file without one', () => {
    const embed = toStory(media({ url: 'https://www.youtube.com/shorts/abcdefghijk' }))!;
    expect(embed.embedUrl).toBe('https://www.youtube.com/embed/abcdefghijk?autoplay=1&playsinline=1');
    expect(story.embedUrl).toBeNull();
  });

  it('never invents a title for an untitled asset', () => {
    expect(toStory(media({ title: null }))!.title).toBe('Short');
    expect(toStory(media({ type: 'video', title: '   ' }))!.title).toBe('Video');
  });
});

describe('fetchStories', () => {
  it('merges the two reel-ish gallery types into one newest-first list', async () => {
    list.mockImplementation(async (params) => {
      if (params?.type === 'short') {
        return page([media({ id: 'older', createdAt: '2026-09-01T00:00:00.000Z' })], 1);
      }
      return page([media({ id: 'newer', type: 'video', createdAt: '2026-10-05T00:00:00.000Z' })], 1);
    });

    const result = await fetchStories({ page: 1, limit: 10 });
    expect(result.items.map((s) => s.id)).toEqual(['newer', 'older']);
    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(1);
  });

  it('asks each source for the whole window it needs, not just one page', async () => {
    await fetchStories({ page: 3, limit: 10 });
    // Page 3 x 10 rows, because an item in the global top 30 is necessarily in
    // its own type's top 30.
    list.mockClear();
    await fetchStories({ page: 3, limit: 10 });
    list.mock.calls.forEach(([params]) => expect(params).toMatchObject({ page: 1, limit: 30 }));
  });

  it('keeps the page total bounded by what the API will serve', async () => {
    await fetchStories({ page: 50, limit: 20 });
    list.mock.calls.forEach(([params]) => expect(params).toMatchObject({ limit: 100 }));
  });

  it('de-duplicates an id that somehow arrives from both source types', async () => {
    list.mockResolvedValue(page([media({ id: 'dupe' })], 1));
    const result = await fetchStories({ page: 1, limit: 10 });
    expect(result.items.map((s) => s.id)).toEqual(['dupe']);
  });

  it('reports a single page rather than zero when there is nothing to show', async () => {
    await expect(fetchStories({})).resolves.toEqual({ items: [], total: 0, totalPages: 1 });
  });
});

describe('fetchStoryById', () => {
  it('projects one story, or null when the media is gone', async () => {
    one.mockResolvedValue(media());
    await expect(fetchStoryById('m1')).resolves.toMatchObject({ id: 'm1', shareUrl: '/stories/m1' });
    one.mockResolvedValue(null);
    await expect(fetchStoryById('nope')).resolves.toBeNull();
  });

  it('does not call the API for an empty id', async () => {
    await expect(fetchStoryById('')).resolves.toBeNull();
    expect(one).not.toHaveBeenCalled();
  });
});

describe('story url helpers', () => {
  it('treats a playable file as native video and a watch page as an embed', () => {
    expect(isDirectVideoUrl('https://res.cloudinary.com/demo/video/upload/a.mp4')).toBe(true);
    expect(isDirectVideoUrl('https://res.cloudinary.com/demo/video/upload/a.webm?x=1')).toBe(true);
    expect(isDirectVideoUrl('https://www.youtube.com/shorts/abcdefghijk')).toBe(false);
    expect(isDirectVideoUrl(null)).toBe(false);
  });

  it('formats a duration, rounding the fractional seconds cloudinary reports', () => {
    expect(formatMediaDuration(7)).toBe('0:07');
    expect(formatMediaDuration(12.4)).toBe('0:12');
    expect(formatMediaDuration(65)).toBe('1:05');
    expect(formatMediaDuration(null)).toBe('—');
    expect(formatMediaDuration(0)).toBe('—');
  });

  it('formats a publish date from a real timestamp as well as a date-only value', () => {
    // The API stores created_at as a full timestamp; formatDate assumes a
    // date-only string and silently drops the label on anything longer.
    expect(formatPublishedDate('2026-10-01T10:00:00.000Z')).toMatch(/2026/);
    expect(formatPublishedDate('2026-10-01')).toMatch(/2026/);
    expect(formatPublishedDate(null)).toBe('');
    expect(formatPublishedDate('not-a-date')).toBe('');
  });
});

describe('story fixtures', () => {
  it('exposes the fields the player reads straight off a story', () => {
    expect(story).toMatchObject({
      id: 'm1',
      type: 'video',
      mediaUrl: 'https://res.cloudinary.com/demo/video/upload/clip.mp4',
      posterUrl: 'https://res.cloudinary.com/demo/video/upload/clip.jpg',
      duration: 12.4,
      shareUrl: '/stories/m1',
    });
  });

  it('maps an image story onto the still branch of the player', () => {
    const photo = toStory(
      media({ type: 'image', url: 'https://res.cloudinary.com/demo/image/upload/a.jpg' })
    )!;
    expect(photo.type).toBe('image');
    expect(photo.duration).toBe(12.4);
  });
});

describe('StoryCard', () => {
  it('is a real deep link, so the story is reachable without the viewer', () => {
    render(<StoryCard story={story} />);
    const link = screen.getByRole('link', { name: /play story: yorker in the 19th/i });
    expect(link).toHaveAttribute('href', '/stories/m1');
  });

  it('opens in place when the rail supplies a handler, and defers to modified clicks', () => {
    const onOpen = jest.fn();
    render(<StoryCard story={story} onOpen={onOpen} />);
    const link = screen.getByRole('link', { name: /play story/i });

    fireEvent.click(link);
    expect(onOpen).toHaveBeenCalledTimes(1);

    // A modified click must keep its native "open in new tab" meaning.
    onOpen.mockClear();
    fireEvent.click(link, { metaKey: true });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('leaves the link alone entirely when no viewer handler is supplied', () => {
    render(<StoryCard story={story} />);
    const link = screen.getByRole('link', { name: /play story/i });
    // Nothing calls preventDefault, so the router follows the href.
    expect(link).toHaveAttribute('href', '/stories/m1');
    fireEvent.click(link);
    expect(link).toHaveAttribute('href', '/stories/m1');
  });

  it('exposes a share control alongside the play target', () => {
    render(<StoryCard story={story} />);
    expect(screen.getByRole('button', { name: /share yorker in the 19th/i })).toBeInTheDocument();
  });

  it('shows the duration and the publish date when the story has them', () => {
    render(<StoryCard story={story} />);
    expect(screen.getByText('0:12')).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });
});

describe('StoryViewer', () => {
  const second = toStory(media({ id: 'm2', title: 'Second story' }))!;
  const stories = [story, second];

  function renderViewer(props: Partial<React.ComponentProps<typeof StoryViewer>> = {}) {
    const onClose = props.onClose ?? jest.fn();
    const onIndexChange = props.onIndexChange ?? jest.fn();
    const utils = render(
      <StoryViewer stories={stories} index={0} onClose={onClose} onIndexChange={onIndexChange} {...props} />
    );
    return { ...utils, onClose, onIndexChange };
  }

  it('opens as a labelled dialog with a position readout and one segment per story', () => {
    renderViewer();
    expect(screen.getByRole('dialog', { name: 'Yorker in the 19th' })).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close story' })).toBeInTheDocument();
  });

  it('plays a native video element for a file asset, so the player owns playback', () => {
    const { container } = renderViewer();
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('playsinline');
    expect(video?.getAttribute('poster')).toBe(story.posterUrl);
  });

  it('sets no poster at all when the story has no still', () => {
    const bare = toStory(media({ thumbnailUrl: null }))!;
    const { container } = renderViewer({ stories: [bare] });
    expect(container.querySelector('video')?.hasAttribute('poster')).toBe(false);
  });

  it('navigates with the arrow keys and closes on escape', () => {
    const { onClose, onIndexChange } = renderViewer();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onIndexChange).toHaveBeenCalledWith(1);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('does not page past either end', () => {
    const { onIndexChange } = renderViewer({ index: 1 });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onIndexChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Next story' })).toBeDisabled();
  });

  it('offers play/pause, mute and share on a video story', () => {
    renderViewer();
    expect(screen.getByRole('button', { name: 'Pause story' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unmute story' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /share yorker in the 19th/i })).toBeInTheDocument();
  });

  it('hides playback controls it cannot reach for an external embed', () => {
    const embed = toStory(media({ url: 'https://www.youtube.com/shorts/abcdefghijk' }))!;
    renderViewer({ stories: [embed] });
    expect(screen.queryByRole('button', { name: 'Pause story' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Unmute story' })).toBeNull();
    expect(playMock).not.toHaveBeenCalled();
  });

  it('shows a still with no playback controls at all', () => {
    const still = toStory(
      media({ type: 'image', url: 'https://res.cloudinary.com/demo/image/upload/a.jpg' })
    )!;
    const { container } = renderViewer({ stories: [still] });
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pause story' })).toBeNull();
  });

  it('falls back to a play button when the browser refuses to autoplay', async () => {
    playMock.mockImplementation(() => Promise.reject(new Error('NotAllowedError')));
    renderViewer();
    expect(await screen.findByRole('button', { name: 'Play story' })).toBeInTheDocument();
  });

  it('starts muted so a story is never blocked by the autoplay policy', () => {
    renderViewer();
    expect(playMock).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Unmute story' })).toBeInTheDocument();
  });

  it('pauses the clip when the player goes away, so nothing keeps playing', () => {
    const pauseMock = jest
      .spyOn(window.HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => undefined);
    const { unmount } = renderViewer();
    pauseMock.mockClear();
    unmount();
    expect(pauseMock).toHaveBeenCalled();
    pauseMock.mockRestore();
  });

  it('advances to the next story when the clip finishes', () => {
    const { container, onIndexChange } = renderViewer();
    fireEvent.ended(container.querySelector('video')!);
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('reports a video that fails to load instead of leaving a black frame', () => {
    const { container } = renderViewer();
    fireEvent.error(container.querySelector('video')!);
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be played/i);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shares the story url, never the gallery path the share endpoint would return', async () => {
    const share = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });

    renderViewer();
    fireEvent.click(screen.getByRole('button', { name: /share yorker in the 19th/i }));

    expect(getShareLink).not.toHaveBeenCalled();
    expect(await share.mock.calls[0][0]).toMatchObject({
      title: 'Yorker in the 19th',
      url: `${window.location.origin}/stories/m1`,
    });
  });

  it('links out to the story page so the sequence is not a dead end', () => {
    renderViewer();
    expect(screen.getByRole('link', { name: 'Open story' })).toHaveAttribute('href', '/stories/m1');
  });
});

describe('StoryStage', () => {
  it('opens the player on the deep-linked story so a shared url lands in it', () => {
    render(<StoryStage items={[story]} initialIndex={0} />);
    expect(screen.getByRole('dialog', { name: 'Yorker in the 19th' })).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();
  });

  it('falls back to the page content, with a replay, once dismissed', () => {
    render(<StoryStage items={[story]} initialIndex={0} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close story' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    const replay = screen.getByRole('button', { name: /replay story/i });
    fireEvent.click(replay);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('StoryRailCard', () => {
  it('sizes itself from its width, so the tile can never collapse to a sliver', () => {
    // A button has no intrinsic width and everything inside it is absolutely
    // positioned, so without an explicit width the whole card renders as a
    // couple of pixels. Width drives the box; aspect-ratio derives the height.
    render(<StoryRailCard story={story} onOpen={jest.fn()} />);
    const card = screen.getByRole('button', { name: 'Play story: Yorker in the 19th' });
    expect(card).toHaveClass('aspect-[9/16]');
    expect(card).toHaveClass('w-[clamp(7.5rem,13vw,9.5rem)]');
    // The width is a viewport clamp, so the rail can never exceed the screen.
    expect(card.className).not.toMatch(/(^|\s)h-\[/);
  });

  it('puts the title over the poster and keeps the poster full-bleed', () => {
    const { container } = render(<StoryRailCard story={story} onOpen={jest.fn()} />);
    expect(screen.getByText('Yorker in the 19th')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeInTheDocument();
    // The title and the scrim are stacked over the image, not beside it.
    expect(screen.getByText('Yorker in the 19th').className).toContain('line-clamp-2');
  });

  it('shows the duration on a video tile and not on a still', () => {
    const { unmount } = render(<StoryRailCard story={story} onOpen={jest.fn()} />);
    expect(screen.getByText('0:12')).toBeInTheDocument();
    unmount();

    const still = toStory(
      media({ type: 'image', url: 'https://res.cloudinary.com/demo/image/upload/a.jpg', duration: null })
    )!;
    render(<StoryRailCard story={still} onOpen={jest.fn()} />);
    expect(screen.getByRole('button', { name: /view story: yorker in the 19th/i })).toBeInTheDocument();
    expect(screen.queryByText('0:12')).toBeNull();
  });

  it('falls back to a neutral tile rather than a broken image when there is no poster', () => {
    const bare = toStory(media({ thumbnailUrl: null }))!;
    const { container } = render(<StoryRailCard story={bare} onOpen={jest.fn()} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.media-fallback')).not.toBeNull();
  });

  it('opens the story it was given', () => {
    const onOpen = jest.fn();
    render(<StoryRailCard story={story} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play story: Yorker in the 19th' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe('useHoverPreview', () => {
  /** jsdom has no matchMedia, so the query has to be stubbed per scenario. */
  function stubPointer(matches: boolean) {
    const listeners = new Set<() => void>();
    const query = {
      matches,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    };
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockReturnValue(query),
      configurable: true,
      writable: true,
    });
    return {
      change(next: boolean) {
        query.matches = next;
        listeners.forEach((fn) => fn());
      },
    };
  }

  function Probe({ target }: { target: Story }) {
    const preview = useHoverPreview(target);
    return (
      <div>
        <span data-testid="state">{preview.playing ? 'playing' : 'idle'}</span>
        {preview.playing ? (
          <video ref={preview.videoRef} data-testid="video" src={target.mediaUrl} muted />
        ) : null}
        <button type="button" onMouseEnter={preview.onMouseEnter} onMouseLeave={preview.onMouseLeave}>
          card
        </button>
      </div>
    );
  }

  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('plays a muted preview while hovered, and only while hovered', () => {
    stubPointer(true);
    const { container } = render(<Probe target={story} />);
    const trigger = screen.getByRole('button', { name: 'card' });

    // No video element exists at rest, so nothing is downloaded until the pointer
    // arrives. A rail of a dozen cards would otherwise pull a dozen clips.
    expect(screen.getByTestId('state')).toHaveTextContent('idle');
    expect(container.querySelector('video')).toBeNull();

    fireEvent.mouseEnter(trigger);
    expect(screen.getByTestId('state')).toHaveTextContent('playing');
    expect(playMock).toHaveBeenCalled();

    fireEvent.mouseLeave(trigger);
    expect(screen.getByTestId('state')).toHaveTextContent('idle');
  });

  it('never previews on a touch device, where a hover would follow a tap', () => {
    stubPointer(false);
    const { container } = render(<Probe target={story} />);
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'card' }));
    expect(container.querySelector('video')).toBeNull();
    expect(playMock).not.toHaveBeenCalled();
  });

  it('reacts to a pointer appearing or disappearing at runtime', () => {
    const pointer = stubPointer(false);
    const { container } = render(<Probe target={story} />);
    const trigger = screen.getByRole('button', { name: 'card' });
    fireEvent.mouseEnter(trigger);
    expect(container.querySelector('video')).toBeNull();

    // The media query listener fires outside React, so the resulting state
    // update has to be flushed explicitly.
    act(() => pointer.change(true));
    expect(container.querySelector('video')).not.toBeNull();
  });

  it('stays idle for a still, since there is nothing to preview', () => {
    stubPointer(true);
    const still = toStory(
      media({ type: 'image', url: 'https://res.cloudinary.com/demo/image/upload/a.jpg' })
    )!;
    const { container } = render(<Probe target={still} />);
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'card' }));
    expect(container.querySelector('video')).toBeNull();
  });

  it('stays idle for an external embed, which has no file to play inline', () => {
    stubPointer(true);
    const embed = toStory(media({ url: 'https://www.youtube.com/shorts/abcdefghijk' }))!;
    const { container } = render(<Probe target={embed} />);
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'card' }));
    expect(container.querySelector('video')).toBeNull();
  });

  it('stays idle when the browser cannot tell whether the pointer hovers', () => {
    // No matchMedia at all, as in jsdom and a few embedded webviews.
    Reflect.deleteProperty(window, 'matchMedia');
    const { container } = render(<Probe target={story} />);
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'card' }));
    expect(container.querySelector('video')).toBeNull();
  });
});

describe('hover preview on the cards', () => {
  function stubHover(matches: boolean) {
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockReturnValue({
        matches,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
      configurable: true,
      writable: true,
    });
  }

  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('swaps the rail poster for a preview on hover, and never before', () => {
    stubHover(true);
    const { container } = render(<StoryRailCard story={story} onOpen={jest.fn()} />);
    const card = screen.getByRole('button', { name: 'Play story: Yorker in the 19th' });
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')).not.toBeNull();

    fireEvent.mouseEnter(card);
    expect(container.querySelector('video')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('previews the listing card the same way', () => {
    stubHover(true);
    const { container } = render(<StoryCard story={story} onOpen={jest.fn()} />);
    const card = screen.getByRole('link', { name: /play story/i });
    expect(container.querySelector('video')).toBeNull();

    fireEvent.mouseEnter(card);
    expect(container.querySelector('video')).not.toBeNull();
  });

  it('leaves both cards as static artwork on a touch device', () => {
    stubHover(false);
    const { container } = render(
      <>
        <StoryRailCard story={story} onOpen={jest.fn()} />
        <StoryCard story={story} onOpen={jest.fn()} />
      </>
    );
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Play story: Yorker in the 19th' }));
    fireEvent.mouseEnter(screen.getByRole('link', { name: /play story/i }));
    expect(container.querySelector('video')).toBeNull();
  });
});

describe('HomeStoriesRail', () => {
  /** jsdom reports every element as 0x0, so the rail's overflow maths is stubbed. */
  function stubScrollMetrics(values: { scrollWidth: number; clientWidth: number; scrollLeft?: number }) {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get: () => values.scrollWidth,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => values.clientWidth,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
      configurable: true,
      get: () => values.scrollLeft ?? 0,
    });
  }

  beforeEach(() => {
    list.mockResolvedValue(page([media({ id: 'm1' }), media({ id: 'm2' })]));
    // The rail is only rendered once the query resolves.
    act(() => undefined);
  });

  it('offers both directions from the start, dimming only the one that leads nowhere', async () => {
    // Wider than the viewport, so there is somewhere to scroll in both
    // directions once the reader moves off the left edge.
    stubScrollMetrics({ scrollWidth: 2000, clientWidth: 800 });

    await act(async () => {
      renderWithProviders(<HomeStoriesRail />);
    });

    const back = await screen.findByRole('button', { name: 'Scroll stories left' });
    const forward = screen.getByRole('button', { name: 'Scroll stories right' });

    // At rest the rail cannot go back, so the back control is present but
    // disabled rather than absent � the reader can see the rail has more.
    expect(back).toBeInTheDocument();
    expect(back).toBeDisabled();
    expect(forward).toBeEnabled();
  });

  it('re-enables the back control once the reader has scrolled away from the start', async () => {
    stubScrollMetrics({ scrollWidth: 2000, clientWidth: 800, scrollLeft: 400 });

    await act(async () => {
      renderWithProviders(<HomeStoriesRail />);
    });

    const back = await screen.findByRole('button', { name: 'Scroll stories left' });
    expect(back).toBeEnabled();
  });

  it('renders nothing at all when there are no stories, rather than an empty rail', async () => {
    list.mockResolvedValue(page([]));
    stubScrollMetrics({ scrollWidth: 2000, clientWidth: 800 });

    const { container } = await act(async () => renderWithProviders(<HomeStoriesRail />));
    expect(container).toBeEmptyDOMElement();
  });
});

describe('HomeStoriesRail layout', () => {
  function stubScrollMetrics(values: { scrollWidth: number; clientWidth: number; scrollLeft?: number }) {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get: () => values.scrollWidth,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => values.clientWidth,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
      configurable: true,
      get: () => values.scrollLeft ?? 0,
    });
  }

  function rail(scroller: HTMLElement) {
    return scroller.querySelector('.no-scrollbar') as HTMLElement;
  }

  it('centres a rail that fits, so no empty card is left after the last tile', async () => {
    // Fewer stories than the rail is wide: nothing to scroll.
    list.mockResolvedValue(page([media({ id: 'm1' })]));
    stubScrollMetrics({ scrollWidth: 800, clientWidth: 800 });

    const { container } = await act(async () => renderWithProviders(<HomeStoriesRail />));
    await screen.findByRole('button', { name: /play story/i });
    expect(rail(container)).toHaveClass('justify-center');
  });

  it('left-aligns once the rail actually scrolls, so the first tile stays reachable', async () => {
    list.mockResolvedValue(
      page([media({ id: 'm1' }), media({ id: 'm2', title: 'Second clip' })])
    );
    stubScrollMetrics({ scrollWidth: 2000, clientWidth: 800 });

    const { container } = await act(async () => renderWithProviders(<HomeStoriesRail />));
    await screen.findByRole('button', { name: 'Play story: Yorker in the 19th' });
    // Centring an overflowing flex row makes its left edge unscrollable.
    expect(rail(container)).not.toHaveClass('justify-center');
  });
});

describe('isLiveStream', () => {
  it('accepts only a stream that is broadcasting right now', () => {
    expect(isLiveStream({ status: 'live' })).toBe(true);
    // Normalised the way normalizeStatus does, so casing and padding vary.
    expect(isLiveStream({ status: 'Live' })).toBe(true);
    expect(isLiveStream({ status: ' live ' })).toBe(true);
  });

  it('rejects ended, upcoming and anything it cannot place', () => {
    // An ended broadcast in a section that promises a live one is the exact bug
    // this guards, so these all have to be false.
    expect(isLiveStream({ status: 'ended' })).toBe(false);
    expect(isLiveStream({ status: 'upcoming' })).toBe(false);
    // Normalising turns a separator into an underscore, so this is a *different*
    // status rather than a synonym — and guessing wrong here would show a
    // finished stream as live.
    expect(isLiveStream({ status: 'live-now' })).toBe(false);
    expect(isLiveStream({ status: 'live-ish' })).toBe(false);
    expect(isLiveStream({ status: '' })).toBe(false);
    expect(isLiveStream({})).toBe(false);
  });
});

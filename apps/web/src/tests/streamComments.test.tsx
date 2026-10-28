import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '../test/harness';

// The board and the shared comments panel are rendered for real; only the HTTP
// layer, auth and toasts are mocked. That proves the stream thread is wired to
// GET/POST /streams/:id/comments, not just that a mocked service was called.
jest.mock('../services/api/client', () => {
  const actual = jest.requireActual('../services/api/client');
  return { ...actual, apiGet: jest.fn(), apiPost: jest.fn() };
});
jest.mock('../services/auth', () => ({ authHeaders: () => ({}) }));
jest.mock('../services/streams', () => {
  const actual = jest.requireActual('../services/streams');
  return { ...actual, fetchStreamsPage: jest.fn() };
});
jest.mock('../components/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('react-hot-toast', () => {
  const fn = jest.fn() as jest.Mock & { error: jest.Mock; success: jest.Mock };
  fn.error = jest.fn();
  fn.success = jest.fn();
  return { __esModule: true, default: fn };
});
jest.mock('../components/skeletons/Skeletons', () => ({
  CommentListSkeleton: () => <div data-testid="comment-skeleton" />,
  StreamsBodySkeleton: () => <div data-testid="streams-skeleton" />,
}));

import LiveStreamsBoard from '../components/boards/LiveStreamsBoard';
import { formatCommentTime } from '../components/CommentsSection';
import { apiGet, apiPost } from '../services/api/client';
import { fetchStreamsPage } from '../services/streams';
import { useAuth } from '../components/AuthProvider';
import type { Stream } from '../types/index';
import toast from 'react-hot-toast';

const get = jest.mocked(apiGet);
const post = jest.mocked(apiPost);
const streamsPage = jest.mocked(fetchStreamsPage);
const auth = useAuth as jest.MockedFunction<typeof useAuth>;
const toastMock = toast as unknown as { error: jest.Mock; success: jest.Mock };

const guest = { user: null, isAuthenticated: false, isAdmin: false, loading: false, isSuperAdmin: false } as never;
const member = {
  user: { id: 'u1', username: 'me', displayName: 'Me' },
  isAuthenticated: true,
  isAdmin: false,
  loading: false,
  isSuperAdmin: false,
} as never;

const stream = {
  id: 's1',
  title: 'PSL Final live',
  shortTitle: 'PSL Final live',
  status: 'live',
  embedUrl: 'https://www.youtube.com/watch?v=abc123',
} as Stream;

const fiveMinutesAgo = () => new Date(Date.now() - 5 * 60_000).toISOString();

function commentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    userId: 'u2',
    targetType: 'stream',
    targetId: 's1',
    body: 'What a shot! <b>not bold</b>',
    createdAt: fiveMinutesAgo(),
    updatedAt: fiveMinutesAgo(),
    user: { id: 'u2', username: 'ali', displayName: 'Ali Khan' },
    ...overrides,
  };
}

function pageOf(rows: unknown[]) {
  return {
    data: rows,
    meta: { page: 1, limit: 10, totalRecords: rows.length, totalPages: 1, hasNextPage: false, hasPrevPage: false },
  };
}

/** Routes the mocked GET by path: the stream thread, or reaction summaries. */
function serve(rows: unknown[]) {
  get.mockImplementation(async (path: string) => {
    if (path === '/streams/s1/comments') return pageOf(rows);
    if (path === '/reactions') return { counts: {}, emojis: [] };
    throw new Error(`unexpected GET ${path}`);
  });
}

function commentListCalls() {
  return get.mock.calls.filter(([path]) => path === '/streams/s1/comments');
}

async function renderBoard() {
  const result = renderWithProviders(<LiveStreamsBoard />);
  await waitFor(() => expect(commentListCalls().length).toBeGreaterThan(0));
  await waitFor(() => expect(screen.queryByTestId('comment-skeleton')).not.toBeInTheDocument());
  return result;
}

beforeEach(() => {
  jest.resetAllMocks();
  auth.mockReturnValue(guest);
  streamsPage.mockResolvedValue({ items: [stream], total: 1, totalPages: 1 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('stream comments panel', () => {
  it('lists the stream thread with author and relative time, as plain text', async () => {
    serve([commentRow()]);
    await renderBoard();

    expect(get).toHaveBeenCalledWith('/streams/s1/comments', { page: 1, limit: 10 });
    expect(screen.getByText('Ali Khan')).toBeInTheDocument();
    expect(screen.getByText('5m ago')).toBeInTheDocument();
    // Markup in a comment is shown literally, never parsed.
    expect(screen.getByText('What a shot! <b>not bold</b>')).toBeInTheDocument();
    expect(document.querySelector('b')).toBeNull();
  });

  it('shows the empty state when a stream has no comments', async () => {
    serve([]);
    await renderBoard();
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
  });

  it('asks a signed-out viewer to sign in instead of showing the composer', async () => {
    serve([]);
    await renderBoard();
    expect(screen.queryByRole('textbox', { name: 'Comment' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      expect.stringContaining('/login?returnTo='),
    );
  });

  it('posts to the stream comments endpoint and reloads the thread', async () => {
    auth.mockReturnValue(member);
    serve([]);
    post.mockResolvedValue(commentRow({ id: 'c9', body: 'Six!', userId: 'u1' }));
    await renderBoard();
    const before = commentListCalls().length;

    const box = screen.getByRole('textbox', { name: 'Comment' });
    expect(box).toHaveAttribute('maxLength', '1000');
    await userEvent.type(box, '  Six!  ');
    await userEvent.click(screen.getByRole('button', { name: /post/i }));

    await waitFor(() => expect(post).toHaveBeenCalledWith('/streams/s1/comments', { body: 'Six!' }, expect.anything()));
    expect(toastMock.success).toHaveBeenCalledWith('Comment posted.');
    await waitFor(() => expect(commentListCalls().length).toBeGreaterThan(before));
    expect(box).toHaveValue('');
  });

  it('toasts and keeps the draft when posting fails', async () => {
    auth.mockReturnValue(member);
    serve([]);
    post.mockRejectedValue(new Error('401'));
    await renderBoard();

    await userEvent.type(screen.getByRole('textbox', { name: 'Comment' }), 'Hello');
    await userEvent.click(screen.getByRole('button', { name: /post/i }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Could not post the comment.'));
    expect(screen.getByRole('textbox', { name: 'Comment' })).toHaveValue('Hello');
  });

  it('refreshes a live stream thread every 30 seconds', async () => {
    jest.useFakeTimers();
    serve([]);
    await renderBoard();
    const before = commentListCalls().length;

    serve([commentRow({ id: 'c2', body: 'Late cut for four' })]);
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    await waitFor(() => expect(commentListCalls().length).toBe(before + 1));
    expect(await screen.findByText('Late cut for four')).toBeInTheDocument();
  });

  it('does not poll a stream that is not live', async () => {
    jest.useFakeTimers();
    streamsPage.mockResolvedValue({ items: [{ ...stream, status: 'ended' }], total: 1, totalPages: 1 });
    serve([]);
    await renderBoard();
    const before = commentListCalls().length;

    await act(async () => {
      jest.advanceTimersByTime(90_000);
    });
    expect(commentListCalls().length).toBe(before);
  });
});

describe('formatCommentTime', () => {
  const now = Date.parse('2026-10-21T12:00:00Z');
  it.each([
    ['2026-10-21T11:59:30Z', 'just now'],
    ['2026-10-21T11:45:00Z', '15m ago'],
    ['2026-10-21T09:00:00Z', '3h ago'],
    ['2026-10-19T12:00:00Z', '2d ago'],
    ['2026-09-01T12:00:00Z', 'Sep 1, 2026'],
    ['not a date', ''],
  ])('%s -> %s', (iso, expected) => {
    expect(formatCommentTime(iso, now)).toBe(expected);
  });
});

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommentsSection from '../components/CommentsSection';
import { createTestQueryClient } from '../test/harness';

jest.mock('../components/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('../services/comments', () => ({
  listComments: jest.fn(),
  createComment: jest.fn(),
  deleteComment: jest.fn(),
  reportComment: jest.fn(),
  getReactionCounts: jest.fn(),
  toggleReaction: jest.fn(),
}));
jest.mock('../services/admin', () => ({ moderateComment: jest.fn() }));
jest.mock('react-hot-toast', () => {
  const fn = jest.fn() as jest.Mock & { error: jest.Mock; success: jest.Mock };
  fn.error = jest.fn();
  fn.success = jest.fn();
  return { __esModule: true, default: fn };
});
jest.mock('../components/skeletons/Skeletons', () => ({
  CommentListSkeleton: () => <div data-testid="comment-skeleton" />,
}));
jest.mock('../components/admin/AdminShared', () => ({
  ConfirmDialog: ({ open, onConfirm, title }: { open: boolean; onConfirm: () => void; title: string }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button type="button" onClick={onConfirm}>
          confirm-delete
        </button>
        <button type="button">cancel-delete</button>
      </div>
    ) : null,
}));
jest.mock('../components/ReportCommentDialog', () => ({
  __esModule: true,
  default: ({ open, onSubmit }: { open: boolean; onSubmit: (_reason: string) => void }) =>
    open ? (
      <div role="dialog" aria-label="Report comment">
        <button type="button" onClick={() => onSubmit('spam')}>
          confirm-report
        </button>
        <button type="button">cancel-report</button>
      </div>
    ) : null,
}));

import { useAuth } from '../components/AuthProvider';
import {
  listComments,
  createComment,
  deleteComment,
  reportComment,
  getReactionCounts,
  toggleReaction,
  type CommentItem,
} from '../services/comments';
import { moderateComment } from '../services/admin';
import toast from 'react-hot-toast';

const auth = useAuth as jest.MockedFunction<typeof useAuth>;
const list = listComments as jest.MockedFunction<typeof listComments>;
const create = createComment as jest.MockedFunction<typeof createComment>;
const del = deleteComment as jest.MockedFunction<typeof deleteComment>;
const report = reportComment as jest.MockedFunction<typeof reportComment>;
const counts = getReactionCounts as jest.MockedFunction<typeof getReactionCounts>;
const toggle = toggleReaction as jest.MockedFunction<typeof toggleReaction>;
const moderate = moderateComment as jest.MockedFunction<typeof moderateComment>;
const toastMock = toast as unknown as { error: jest.Mock; success: jest.Mock };
function comment(overrides: Partial<CommentItem> = {}): CommentItem {
  return {
    id: 'c1',
    userId: 'u2',
    targetType: 'match',
    targetId: 'm1',
    body: 'Great match',
    createdAt: '2026-02-01T10:30:00Z',
    updatedAt: '2026-02-01T10:30:00Z',
    user: { id: 'u2', username: 'ali', displayName: 'Ali' },
    ...overrides,
  };
}

function page(items: CommentItem[], total = items.length, totalPages = 1) {
  return Promise.resolve({ items, total, totalPages });
}

const guest = { user: null, isAuthenticated: false, isAdmin: false, loading: false, isSuperAdmin: false } as never;
const member = {
  user: { id: 'u1', username: 'me', displayName: 'Me' },
  isAuthenticated: true,
  isAdmin: false,
  loading: false,
  isSuperAdmin: false,
} as never;
const admin = {
  user: { id: 'u9', username: 'admin', displayName: 'Admin' },
  isAuthenticated: true,
  isAdmin: true,
  loading: false,
  isSuperAdmin: false,
} as never;

beforeEach(() => {
  jest.resetAllMocks();
  auth.mockReturnValue(guest);
  counts.mockResolvedValue({ counts: {}, emojis: [] });
  window.history.replaceState({}, '', '/');
});

async function renderComments(targetType: 'match' | 'news' | 'stream' = 'match', targetId = 'm1') {
  const result = render(<CommentsSection targetType={targetType} targetId={targetId} />);
  await waitFor(() => expect(list).toHaveBeenCalled());
  // Wait for the loading branch to resolve, not just for the request to start.
  await waitFor(() => expect(screen.queryByTestId('comment-skeleton')).not.toBeInTheDocument());
  return result;
}

describe('CommentsSection loading states', () => {
  it('shows a skeleton while the first page is in flight', async () => {
    list.mockReturnValue(new Promise(() => undefined));
    // The target's reaction summary is a second, independent request. This test ends
    // while the page request is still open, so the summary has to stay open too,
    // otherwise it resolves afterwards and updates state outside act.
    counts.mockReturnValue(new Promise(() => undefined));
    render(<CommentsSection targetType="match" targetId="m1" />);
    expect(screen.getByTestId('comment-skeleton')).toBeInTheDocument();
  });

  it('shows an empty state when there are no comments', async () => {
    list.mockReturnValue(page([]));
    await renderComments();
    expect(await screen.findByText(/no comments yet/i)).toBeInTheDocument();
  });

  it('shows an alert when the list request fails', async () => {
    list.mockRejectedValue(new Error('offline'));
    await renderComments();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load comments.');
  });

  it('shows the total in the heading', async () => {
    list.mockReturnValue(page([comment()], 42, 5));
    await renderComments();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});

describe('CommentsSection composer', () => {
  it('asks a guest to sign in instead of showing the form', async () => {
    list.mockReturnValue(page([]));
    await renderComments();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      expect.stringContaining('/login?returnTo='),
    );
  });

  it('shows the form to a signed-in user', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([]));
    await renderComments();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('keeps the post button disabled until there is non-whitespace text', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([]));
    await renderComments();
    const post = screen.getByRole('button', { name: /post/i });
    expect(post).toBeDisabled();

    await userEvent.type(screen.getByRole('textbox'), '   ');
    expect(post).toBeDisabled();

    await userEvent.type(screen.getByRole('textbox'), 'Nice');
    expect(post).toBeEnabled();
  });

  it('posts the trimmed body and reloads the list', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([]));
    create.mockResolvedValue(comment({ id: 'c9' }));
    await renderComments();

    await userEvent.type(screen.getByRole('textbox'), '  Nice one  ');
    await userEvent.click(screen.getByRole('button', { name: /post/i }));

    await waitFor(() => expect(create).toHaveBeenCalledWith('match', 'm1', 'Nice one'));
    expect(toastMock.success).toHaveBeenCalledWith('Comment posted.');
  });

  it('clears the box after a successful post', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([]));
    create.mockResolvedValue(comment());
    await renderComments();

    const box = screen.getByRole('textbox');
    await userEvent.type(box, 'Hi');
    await userEvent.click(screen.getByRole('button', { name: /post/i }));

    await waitFor(() => expect(box).toHaveValue(''));
  });

  it('keeps the text and warns when posting fails', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([]));
    create.mockRejectedValue(new Error('nope'));
    await renderComments();

    const box = screen.getByRole('textbox');
    await userEvent.type(box, 'Hi');
    await userEvent.click(screen.getByRole('button', { name: /post/i }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Could not post the comment.'));
    expect(box).toHaveValue('Hi');
  });

  it('caps the composer at 1000 characters', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([]));
    await renderComments();
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '1000');
  });
});

describe('CommentsSection moderation', () => {
  it('offers delete on your own comment', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([comment({ id: 'mine', userId: 'u1' })]));
    await renderComments();
    expect(screen.getByRole('button', { name: 'Delete comment' })).toBeInTheDocument();
  });

  it('hides delete on someone elses comment from a normal member', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([comment()]));
    await renderComments();
    expect(screen.queryByRole('button', { name: 'Delete comment' })).not.toBeInTheDocument();
  });

  it('lets an admin delete any comment', async () => {
    auth.mockReturnValue(admin);
    list.mockReturnValue(page([comment()]));
    await renderComments();
    expect(screen.getByRole('button', { name: 'Delete comment' })).toBeInTheDocument();
  });

  it('uses the moderation endpoint when an admin deletes someones comment', async () => {
    auth.mockReturnValue(admin);
    list.mockReturnValue(page([comment()]));
    moderate.mockResolvedValue({});
    await renderComments();

    await userEvent.click(screen.getByRole('button', { name: 'Delete comment' }));
    await userEvent.click(screen.getByRole('button', { name: 'confirm-delete' }));

    await waitFor(() => expect(moderate).toHaveBeenCalledWith('c1', 'deleted'));
    expect(del).not.toHaveBeenCalled();
  });

  it('uses the plain delete endpoint for your own comment even as an admin', async () => {
    auth.mockReturnValue(admin);
    list.mockReturnValue(page([comment({ userId: 'u9' })]));
    del.mockResolvedValue(undefined);
    await renderComments();

    await userEvent.click(screen.getByRole('button', { name: 'Delete comment' }));
    await userEvent.click(screen.getByRole('button', { name: 'confirm-delete' }));

    await waitFor(() => expect(del).toHaveBeenCalledWith('c1'));
    expect(moderate).not.toHaveBeenCalled();
  });

  it('removes the row and decrements the total after a delete', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([comment({ id: 'mine', userId: 'u1' })], 1));
    del.mockResolvedValue(undefined);
    await renderComments();

    await userEvent.click(screen.getByRole('button', { name: 'Delete comment' }));
    await userEvent.click(screen.getByRole('button', { name: 'confirm-delete' }));

    await waitFor(() => expect(screen.queryByText('Great match')).not.toBeInTheDocument());
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('restores the row and warns when the delete fails', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([comment({ id: 'mine', userId: 'u1' })], 1));
    del.mockRejectedValue(new Error('nope'));
    await renderComments();

    await userEvent.click(screen.getByRole('button', { name: 'Delete comment' }));
    await userEvent.click(screen.getByRole('button', { name: 'confirm-delete' }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Could not delete the comment.'));
    expect(screen.getByText('Great match')).toBeInTheDocument();
  });
});

describe('CommentsSection reporting', () => {
  it('shows report on someones comment for a member', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([comment()]));
    await renderComments();
    expect(screen.getByRole('button', { name: /report/i })).toBeInTheDocument();
  });

  it('hides report on your own comment', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([comment({ userId: 'u1' })]));
    await renderComments();
    expect(screen.queryByRole('button', { name: /report/i })).not.toBeInTheDocument();
  });

  it('hides report for an admin, who moderates directly instead', async () => {
    auth.mockReturnValue(admin);
    list.mockReturnValue(page([comment()]));
    await renderComments();
    expect(screen.queryByRole('button', { name: /report/i })).not.toBeInTheDocument();
  });

  it('hides report from a guest', async () => {
    list.mockReturnValue(page([comment()]));
    await renderComments();
    expect(screen.queryByRole('button', { name: /report/i })).not.toBeInTheDocument();
  });

  it('disables the button once the comment has been reported', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([comment()]));
    report.mockResolvedValue({ message: 'ok' });
    await renderComments();

    await userEvent.click(screen.getByRole('button', { name: /report/i }));
    await userEvent.click(screen.getByRole('button', { name: 'confirm-report' }));

    await waitFor(() => expect(screen.getByRole('button', { name: /reported/i })).toBeDisabled());
  });

  it('surfaces the api message when reporting fails', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([comment()]));
    const { ApiError } = jest.requireActual('../services/api/client');
    report.mockRejectedValue(new ApiError(400, 'Already reported'));
    await renderComments();

    await userEvent.click(screen.getByRole('button', { name: /report/i }));
    await userEvent.click(screen.getByRole('button', { name: 'confirm-report' }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Already reported'));
  });
});

describe('CommentsSection reactions', () => {
  it('asks a guest to sign in before reacting', async () => {
    list.mockReturnValue(page([]));
    await renderComments();
    // The reaction bar renders buttons; clicking one must not call the api.
    const bar = screen.getByRole('button', { name: /react|fire|like|\+/i });
    await userEvent.click(bar);
    expect(toggle).not.toHaveBeenCalled();
  });

  it('toggles and then refreshes the counts for a member', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([]));
    toggle.mockResolvedValue({ message: 'ok' });
    counts.mockResolvedValue({ counts: { fire: 1 }, emojis: ['fire'] });
    await renderComments();

    const bar = screen.getByRole('button', { name: /react|fire|like|\+/i });
    await userEvent.click(bar);

    await waitFor(() => expect(toggle).toHaveBeenCalledWith('match', 'm1', expect.anything()));
  });

  it('warns when the reaction cannot be saved', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([]));
    toggle.mockRejectedValue(new Error('nope'));
    await renderComments();

    const bar = screen.getByRole('button', { name: /react|fire|like|\+/i });
    await userEvent.click(bar);

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Could not save the reaction.'));
  });
});

describe('CommentsSection pagination', () => {
  it('hides the load more button on a single page', async () => {
    list.mockReturnValue(page([comment()], 1, 1));
    await renderComments();
    expect(screen.queryByRole('button', { name: /load more comments/i })).not.toBeInTheDocument();
  });

  it('appends the next page instead of replacing the list', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValueOnce(page([comment({ id: 'c1', body: 'First' })], 2, 2))
      .mockReturnValueOnce(page([comment({ id: 'c2', body: 'Second' })], 2, 2));
    await renderComments();

    await userEvent.click(screen.getByRole('button', { name: /load more comments/i }));

    await waitFor(() => expect(screen.getByText('Second')).toBeInTheDocument());
    expect(screen.getByText('First')).toBeInTheDocument();
  });

  it('requests the next page number', async () => {
    list.mockReturnValueOnce(page([comment()], 2, 2))
      .mockReturnValueOnce(page([comment({ id: 'c2' })], 2, 2));
    await renderComments();

    await userEvent.click(screen.getByRole('button', { name: /load more comments/i }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith('match', 'm1', 2, 10));
  });
});

describe('CommentsSection deep link', () => {
  it('highlights a comment pointed at by the ?comment= query', async () => {
    window.history.replaceState({}, '', '/matches/m1?comment=c1');
    list.mockReturnValue(page([comment()]));
    await renderComments();

    await waitFor(() => {
      const node = document.getElementById('comment-c1');
      expect(node?.className).toContain('ring-accent');
    });
  });

  it('highlights from a #comment- hash', async () => {
    window.history.replaceState({}, '', '/matches/m1#comment-c1');
    list.mockReturnValue(page([comment()]));
    await renderComments();

    await waitFor(() => {
      expect(document.getElementById('comment-c1')?.className).toContain('ring-accent');
    });
  });

  it('does not highlight anything for an unrelated hash', async () => {
    window.history.replaceState({}, '', '/matches/m1#top');
    list.mockReturnValue(page([comment()]));
    await renderComments();

    await waitFor(() => expect(screen.getByText('Great match')).toBeInTheDocument());
    expect(document.getElementById('comment-c1')?.className).not.toContain('ring-accent');
  });

  it('loads the next page when the highlighted comment is not on this one', async () => {
    window.history.replaceState({}, '', '/matches/m1?comment=later');
    list.mockReturnValueOnce(page([comment({ id: 'c1' })], 20, 4))
      .mockReturnValue(page([comment({ id: 'later' })], 20, 4));
    await renderComments();

    await waitFor(() => expect(list).toHaveBeenCalledWith('match', 'm1', 2, 10), { timeout: 4000 });
  });
});

describe('CommentsSection composer prompt', () => {
  /**
   * The prompt is fixed copy. It used to read "Share your thoughts as <name>", which put
   * the signed-in reader's account name into the page; the name belongs on the avatar
   * beside the box, not in the prompt itself.
   */
  it('asks the writer to share their thoughts', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([]));
    await renderComments();
    expect(screen.getByPlaceholderText(/share your thoughts/i)).toBeInTheDocument();
  });

  it('does not put the display name in the prompt', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([]));
    await renderComments();
    expect(screen.queryByPlaceholderText(/\bMe\b/)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/\bas\b/i)).not.toBeInTheDocument();
  });

  it('does not fall back to the username in the prompt', async () => {
    auth.mockReturnValue({
      ...(member as unknown as Record<string, unknown>),
      user: { id: 'u1', username: 'crickfan', displayName: null },
    } as never);
    list.mockReturnValue(page([]));
    await renderComments();
    expect(screen.getByPlaceholderText(/share your thoughts/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/crickfan/i)).not.toBeInTheDocument();
  });

  it('does not fall back to a generic name in the prompt', async () => {
    auth.mockReturnValue({
      ...(member as unknown as Record<string, unknown>),
      user: { id: 'u1', username: null, displayName: null },
    } as never);
    list.mockReturnValue(page([]));
    await renderComments();
    expect(screen.getByPlaceholderText(/share your thoughts/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/\bas a fan\b/i)).not.toBeInTheDocument();
  });

  it('shows the keyboard hint beside the box, not inside the prompt', async () => {
    auth.mockReturnValue(member);
    list.mockReturnValue(page([]));
    await renderComments();
    // The hint is its own row of <kbd> keys under the box.
    expect(screen.getByText(/for new line/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/enter to post/i)).not.toBeInTheDocument();
  });
});

describe('CommentsSection rendering details', () => {
  it('falls back to a generic name when a comment has no user', async () => {
    list.mockReturnValue(page([comment({ user: null })]));
    await renderComments();
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('preserves line breaks in the comment body', async () => {
    list.mockReturnValue(page([comment({ body: 'line one\nline two' })]));
    await renderComments();
    const body = screen.getByText(/line one/).closest('p');
    expect(body).toHaveClass('whitespace-pre-wrap');
  });

  it('renders each comment as a list item inside a list', async () => {
    list.mockReturnValue(page([comment({ id: 'a' }), comment({ id: 'b', body: 'Other' })]));
    await renderComments();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(2);
  });
});

describe('harness sanity', () => {
  it('builds a query client that never retries', () => {
    const client = createTestQueryClient();
    const retry = client.getDefaultOptions().queries?.retry;
    expect(retry).toBe(false);
  });
});

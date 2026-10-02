import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FavoriteButton from '../components/FavoriteButton';
import { addFavorite } from '../services/favorites';

jest.mock('../services/favorites', () => ({
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
  loadFavoritesForHearts: jest.fn(),
  peekFavoriteCache: jest.fn(),
  rememberFavoriteAdded: jest.fn(),
  rememberFavoriteRemoved: jest.fn(),
  subscribeFavoriteCache: jest.fn(() => () => undefined),
}));

jest.mock('../components/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

const addFavoriteMock = addFavorite as jest.MockedFunction<typeof addFavorite>;
const { loadFavoritesForHearts: loadForHearts } = jest.requireMock('../services/favorites') as {
  loadFavoritesForHearts: jest.Mock;
};

function renderAuthorHeart() {
  return render(<FavoriteButton targetType="author" targetId="author-uuid-1" />);
}

describe('FavoriteButton for authors', () => {
  beforeEach(() => {
    loadForHearts.mockResolvedValue([]);
    addFavoriteMock.mockResolvedValue({
      id: 'fav-1',
      userId: 'u1',
      targetType: 'author',
      targetId: 'author-uuid-1',
      createdAt: '2026-09-28T00:00:00Z',
    });
  });

  it('sends the author id, never the slug', async () => {
    // The backend normalises a slug to an id server-side, but the heart state is
    // matched on targetId — sending a slug would make the filled state wrong.
    renderAuthorHeart();

    await userEvent.click(await screen.findByRole('button', { name: /add to favorites/i }));

    await waitFor(() => {
      expect(addFavoriteMock).toHaveBeenCalledWith('author', 'author-uuid-1');
    });
  });

  it('renders unfilled when the author is not favourited', async () => {
    renderAuthorHeart();
    const button = await screen.findByRole('button', { name: /add to favorites/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders filled when the stored favourite targets this author id', async () => {
    loadForHearts.mockResolvedValue([
      {
        id: 'fav-9',
        userId: 'u1',
        targetType: 'author',
        targetId: 'author-uuid-1',
        createdAt: '2026-09-28T00:00:00Z',
      },
    ]);

    renderAuthorHeart();

    // The full-size button is labelled by its own text, not an aria-label.
    const button = await screen.findByRole('button', { name: /favorited/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('stays unfilled when the stored favourite is a different author', async () => {
    loadForHearts.mockResolvedValue([
      {
        id: 'fav-8',
        userId: 'u1',
        targetType: 'author',
        targetId: 'someone-else',
        createdAt: '2026-09-28T00:00:00Z',
      },
    ]);

    renderAuthorHeart();

    const button = await screen.findByRole('button', { name: /add to favorites/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});

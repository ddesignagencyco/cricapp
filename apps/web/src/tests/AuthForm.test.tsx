import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthForm from '../components/auth/AuthForm';

const replace = jest.fn();
let searchParams = new URLSearchParams('');

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => searchParams,
}));

jest.mock('../components/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('../services/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerification: jest.fn(),
}));
jest.mock('react-hot-toast', () => {
  const fn = jest.fn() as jest.Mock & { error: jest.Mock; success: jest.Mock };
  fn.error = jest.fn();
  fn.success = jest.fn();
  return { __esModule: true, default: fn };
});

import { useAuth } from '../components/AuthProvider';
import {
  login,
  register,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from '../services/auth';
import toast from 'react-hot-toast';

const auth = useAuth as jest.MockedFunction<typeof useAuth>;
const doLogin = login as jest.MockedFunction<typeof login>;
const doRegister = register as jest.MockedFunction<typeof register>;
const doForgot = forgotPassword as jest.MockedFunction<typeof forgotPassword>;
const doReset = resetPassword as jest.MockedFunction<typeof resetPassword>;
const doVerify = verifyEmail as jest.MockedFunction<typeof verifyEmail>;
const doResend = resendVerification as jest.MockedFunction<typeof resendVerification>;
const toastMock = toast as unknown as { error: jest.Mock; success: jest.Mock };

const anon = { refresh: jest.fn(), isAuthenticated: false, loading: false } as never;

let tokenSeq = 0;
/** verifyEmailOnce dedupes per tokenId:token, so each test needs a fresh token. */
function uniqueToken() {
  tokenSeq += 1;
  return `tok-${tokenSeq}`;
}

beforeEach(() => {
  jest.resetAllMocks();
  auth.mockReturnValue(anon);
  replace.mockClear();
  searchParams = new URLSearchParams('');
});

async function submit() {
  await userEvent.click(screen.getByRole('button', { name: /sign in to account|create free account|send reset link|reset password/i }));
}

describe('AuthForm login validation', () => {
  it('rejects a malformed email before calling the api', async () => {
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret1');
    await submit();

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(doLogin).not.toHaveBeenCalled();
  });

  it('rejects a password shorter than six characters', async () => {
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'short');
    await submit();

    expect(await screen.findByText('Password must be at least 6 characters.')).toBeInTheDocument();
    expect(doLogin).not.toHaveBeenCalled();
  });

  it('marks an invalid field with aria-invalid and points at the error', async () => {
    render(<AuthForm mode="login" />);
    await submit();
    const email = screen.getByLabelText(/email/i);
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
    expect(email).toHaveAttribute('aria-describedby', 'email-error');
  });

  it('offers a forgot-password link on the login form', () => {
    render(<AuthForm mode="login" />);
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute('href', '/forgot-password');
  });

  it('does not ask for a name on the login form', () => {
    render(<AuthForm mode="login" />);
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
  });
});

describe('AuthForm login success', () => {
  const user = { id: 'u1', username: 'ali', displayName: 'Ali Raza', isAdmin: false };

  it('trims the email and signs in', async () => {
    doLogin.mockResolvedValue({ user } as never);
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/email/i), '  a@b.com  ');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret1');
    await submit();

    await waitFor(() => expect(doLogin).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret1' }));
  });

  it('greets the user by display name', async () => {
    doLogin.mockResolvedValue({ user } as never);
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret1');
    await submit();

    expect(await screen.findByText(/welcome back, ali raza/i)).toBeInTheDocument();
  });

  it('falls back to the username when there is no display name', async () => {
    doLogin.mockResolvedValue({ user: { ...user, displayName: null } } as never);
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret1');
    await submit();

    expect(await screen.findByText(/welcome back, ali/i)).toBeInTheDocument();
  });

  it('sends a normal user to the home page', async () => {
    doLogin.mockResolvedValue({ user } as never);
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret1');
    await submit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('sends an admin to the dashboard', async () => {
    doLogin.mockResolvedValue({ user: { ...user, isAdmin: true } } as never);
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret1');
    await submit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin'));
  });
});

describe('AuthForm open redirect protection', () => {
  const user = { id: 'u1', username: 'ali', displayName: 'Ali', isAdmin: false };

  async function loginWith(returnTo: string) {
    searchParams = new URLSearchParams(`returnTo=${encodeURIComponent(returnTo)}`);
    doLogin.mockResolvedValue({ user } as never);
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret1');
    await submit();
    await waitFor(() => expect(replace).toHaveBeenCalled());
  }

  it('honours a same-site return path', async () => {
    await loginWith('/matches/m1');
    expect(replace).toHaveBeenCalledWith('/matches/m1');
  });

  it('refuses a protocol-relative url that would leave the site', async () => {
    // "//evil.test" is treated as an absolute url by the browser, so following
    // it blindly would be an open redirect.
    await loginWith('//evil.test/steal');
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('refuses an absolute http url', async () => {
    await loginWith('https://evil.test/steal');
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('refuses a bare domain with no leading slash', async () => {
    await loginWith('evil.test');
    expect(replace).toHaveBeenCalledWith('/');
  });
});

describe('AuthForm already-signed-in redirect', () => {
  it('bounces an authenticated user to the profile page', async () => {
    auth.mockReturnValue({ refresh: jest.fn(), isAuthenticated: true, loading: false } as never);
    render(<AuthForm mode="login" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/profile'));
  });

  it('waits while the session probe is still running', async () => {
    auth.mockReturnValue({ refresh: jest.fn(), isAuthenticated: true, loading: true } as never);
    render(<AuthForm mode="login" />);
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('AuthForm login failure', () => {
  it('shows the api error message', async () => {
    const { ApiError } = jest.requireActual('../services/api/client');
    doLogin.mockRejectedValue(new ApiError(401, 'Incorrect email or password'));
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret1');
    await submit();

    expect(await screen.findByText('Incorrect email or password')).toBeInTheDocument();
  });

  it('uses a generic message for a non-api failure', async () => {
    doLogin.mockRejectedValue(new Error('socket hang up'));
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret1');
    await submit();

    expect(await screen.findByText(/check your connection/i)).toBeInTheDocument();
  });

  it('offers a resend form only on a 403, because that means unverified', async () => {
    const { ApiError } = jest.requireActual('../services/api/client');
    doLogin.mockRejectedValue(new ApiError(403, 'Email not verified'));
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret1');
    await submit();

    expect(await screen.findByText(/not verified yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
  });

  it('does not offer the resend form on a 401', async () => {
    const { ApiError } = jest.requireActual('../services/api/client');
    doLogin.mockRejectedValue(new ApiError(401, 'Wrong password'));
    render(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret1');
    await submit();

    await screen.findByText('Wrong password');
    expect(screen.queryByRole('button', { name: /resend email/i })).not.toBeInTheDocument();
  });
});

describe('AuthForm register', () => {
  async function fillRegister(overrides: { name?: string; password?: string; confirm?: string; terms?: boolean } = {}) {
    render(<AuthForm mode="register" />);
    if (overrides.name !== undefined) await userEvent.type(screen.getByLabelText(/full name/i), overrides.name);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password/i), overrides.password ?? 'secret1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), overrides.confirm ?? 'secret1');
    if (overrides.terms !== false) await userEvent.click(screen.getByRole('checkbox'));
    return screen.getByRole('button', { name: /create free account/i });
  }

  it('requires a name of at least two characters', async () => {
    await fillRegister({ name: 'A' });
    await userEvent.click(screen.getByRole('button', { name: /create free account/i }));
    expect(await screen.findByText('Enter your full name.')).toBeInTheDocument();
    expect(doRegister).not.toHaveBeenCalled();
  });

  it('requires the terms checkbox', async () => {
    await fillRegister({ name: 'Ali Raza', terms: false });
    await userEvent.click(screen.getByRole('button', { name: /create free account/i }));
    expect(await screen.findByText('Accept the terms to continue.')).toBeInTheDocument();
  });

  it('requires the two passwords to match', async () => {
    await fillRegister({ name: 'Ali Raza', confirm: 'different' });
    await userEvent.click(screen.getByRole('button', { name: /create free account/i }));
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
  });

  it('derives a url-safe username from the name', async () => {
    doRegister.mockResolvedValue({ message: 'Account created', requiresEmailVerification: true } as never);
    await fillRegister({ name: 'Ali Raza' });
    await userEvent.click(screen.getByRole('button', { name: /create free account/i }));

    await waitFor(() =>
      expect(doRegister).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'aliraza', displayName: 'Ali Raza' }),
      ),
    );
  });

  it('strips non-alphanumerics from the derived username', async () => {
    doRegister.mockResolvedValue({ message: 'ok' } as never);
    await fillRegister({ name: "Ali  Raza!!!" });
    await userEvent.click(screen.getByRole('button', { name: /create free account/i }));

    await waitFor(() => expect(doRegister).toHaveBeenCalledWith(expect.objectContaining({ username: 'aliraza' })));
  });

  it('pads a username that would be too short to be allowed', async () => {
    doRegister.mockResolvedValue({ message: 'ok' } as never);
    await fillRegister({ name: 'Al' });
    await userEvent.click(screen.getByRole('button', { name: /create free account/i }));

    await waitFor(() => expect(doRegister).toHaveBeenCalledWith(expect.objectContaining({ username: 'fanal' })));
  });

  it('sends the user to login after a successful signup', async () => {
    doRegister.mockResolvedValue({ message: 'Account created' } as never);
    await fillRegister({ name: 'Ali Raza' });
    await userEvent.click(screen.getByRole('button', { name: /create free account/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it('links to both the terms and the privacy policy', () => {
    render(<AuthForm mode="register" />);
    expect(screen.getByRole('link', { name: /terms of service/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy');
  });
});

describe('AuthForm forgot password', () => {
  it('asks only for an email, never a password', () => {
    render(<AuthForm mode="forgot" />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^password/i)).not.toBeInTheDocument();
  });

  it('sends the address and shows the api message', async () => {
    doForgot.mockResolvedValue({ message: 'Reset link sent' } as never);
    render(<AuthForm mode="forgot" />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com');
    await submit();

    await waitFor(() => expect(doForgot).toHaveBeenCalledWith({ email: 'a@b.com' }));
    expect(await screen.findByText('Reset link sent')).toBeInTheDocument();
  });
});

describe('AuthForm reset password', () => {
  it('refuses to render a form without a token and points at the forgot page', () => {
    render(<AuthForm mode="reset" />);
    expect(screen.getByText(/only works from the link in your email/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request a new reset link/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    expect(screen.queryByLabelText(/^password/i)).not.toBeInTheDocument();
  });

  it('labels the field "New password"', () => {
    render(<AuthForm mode="reset" token="t" tokenId="ti" />);
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
  });

  it('requires the passwords to match', async () => {
    render(<AuthForm mode="reset" token="t" tokenId="ti" />);
    await userEvent.type(screen.getByLabelText(/new password/i), 'secret1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'other');
    await submit();

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(doReset).not.toHaveBeenCalled();
  });

  it('resets with the token pair and returns to login', async () => {
    doReset.mockResolvedValue({ message: 'Password updated' } as never);
    const token = uniqueToken();
    render(<AuthForm mode="reset" token={token} tokenId="tid" />);
    await userEvent.type(screen.getByLabelText(/new password/i), 'secret1');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'secret1');
    await submit();

    await waitFor(() => expect(doReset).toHaveBeenCalledWith({ tokenId: 'tid', token, password: 'secret1' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it('shows the password guidance note', () => {
    render(<AuthForm mode="reset" token="t" tokenId="ti" />);
    expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
  });
});

describe('AuthForm verify email', () => {
  it('verifies on mount and shows the api message', async () => {
    doVerify.mockResolvedValue({ message: 'Email verified' } as never);
    render(<AuthForm mode="verify" token={uniqueToken()} tokenId="tid" />);

    expect(await screen.findByText('Email verified')).toBeInTheDocument();
    expect(doVerify).toHaveBeenCalledWith({ token: expect.any(String), tokenId: 'tid' });
  });

  it('shows a busy line while the request is in flight', async () => {
    doVerify.mockReturnValue(new Promise(() => undefined));
    render(<AuthForm mode="verify" token={uniqueToken()} tokenId="tid" />);

    expect(await screen.findByText(/verifying your email/i)).toBeInTheDocument();
  });

  it('treats an already-verified response as a success, not an error', async () => {
    // The already-verified branch reads the api message, so the rejection has
    // to be an ApiError — a plain Error is reported as a generic failure.
    const { ApiError } = jest.requireActual('../services/api/client');
    doVerify.mockRejectedValue(new ApiError(400, 'Email is already verified'));
    render(<AuthForm mode="verify" token={uniqueToken()} tokenId="tid" />);

    expect(await screen.findByText(/already verified/i)).toBeInTheDocument();
    // A success means the resend form is not needed.
    expect(screen.queryByRole('button', { name: /resend email/i })).not.toBeInTheDocument();
  });

  it('shows a real failure and keeps the resend form available', async () => {
    doVerify.mockRejectedValue(new Error('Token has expired'));
    render(<AuthForm mode="verify" token={uniqueToken()} tokenId="tid" />);

    expect(await screen.findByText(/check your connection/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
  });

  it('rejects a link with no token instead of calling the api', async () => {
    render(<AuthForm mode="verify" />);
    expect(await screen.findByText(/missing or incomplete/i)).toBeInTheDocument();
    expect(doVerify).not.toHaveBeenCalled();
  });

  it('sends the verification request once even across remounts', async () => {
    doVerify.mockResolvedValue({ message: 'ok' } as never);
    // Same token both times — that is what the dedupe map keys on.
    const token = uniqueToken();
    const first = render(<AuthForm mode="verify" token={token} tokenId="tid" />);
    await screen.findByText('ok');
    first.unmount();

    render(<AuthForm mode="verify" token={token} tokenId="tid" />);
    await screen.findByText('ok');
    // The module-level dedupe map means the second mount reuses the first result.
    expect(doVerify).toHaveBeenCalledTimes(1);
  });

  it('always offers a way back to login', async () => {
    doVerify.mockResolvedValue({ message: 'ok' } as never);
    render(<AuthForm mode="verify" token={uniqueToken()} tokenId="tid" />);
    expect(await screen.findByRole('link', { name: /continue to login/i })).toHaveAttribute('href', '/login');
  });
});

describe('AuthForm resend verification', () => {
  it('requires an email', async () => {
    doVerify.mockRejectedValue(new Error('bad token'));
    render(<AuthForm mode="verify" token={uniqueToken()} tokenId="tid" />);

    await userEvent.click(await screen.findByRole('button', { name: /resend email/i }));
    expect(toastMock.error).toHaveBeenCalledWith('Email is required.');
    expect(doResend).not.toHaveBeenCalled();
  });

  it('shows the resend response message', async () => {
    doVerify.mockRejectedValue(new Error('bad token'));
    doResend.mockResolvedValue({ message: 'Verification email sent' } as never);
    render(<AuthForm mode="verify" token={uniqueToken()} tokenId="tid" />);

    await userEvent.type(await screen.findByLabelText(/email/i), 'a@b.com');
    await userEvent.click(screen.getByRole('button', { name: /resend email/i }));

    expect(await screen.findByText('Verification email sent')).toBeInTheDocument();
  });

  it('switches to the verified state when resend says already verified', async () => {
    doVerify.mockRejectedValue(new Error('bad token'));
    doResend.mockResolvedValue({ message: 'This address is already verified' } as never);
    render(<AuthForm mode="verify" token={uniqueToken()} tokenId="tid" />);

    await userEvent.type(await screen.findByLabelText(/email/i), 'a@b.com');
    await userEvent.click(screen.getByRole('button', { name: /resend email/i }));

    await waitFor(() => expect(screen.queryByRole('button', { name: /resend email/i })).not.toBeInTheDocument());
  });

  it('shows the error when the resend request fails', async () => {
    doVerify.mockRejectedValue(new Error('bad token'));
    doResend.mockRejectedValue(new Error('rate limited'));
    render(<AuthForm mode="verify" token={uniqueToken()} tokenId="tid" />);

    await userEvent.type(await screen.findByLabelText(/email/i), 'a@b.com');
    await userEvent.click(screen.getByRole('button', { name: /resend email/i }));

    // The verify failure and the resend failure both render the same generic
    // copy, so assert the resend form is still usable rather than the text.
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: /resend email/i })).toBeEnabled();
  });
});

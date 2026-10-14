import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import NewsletterModal, {
  NEWSLETTER_MODAL_DELAY_MS,
  NEWSLETTER_MODAL_SNOOZE_MS,
  NOTIFICATION_PROMPT_STORAGE_KEY,
  notificationsUnsupported,
  shouldOfferNotificationOptIn,
} from '../components/NewsletterModal';

const subscribeMock = jest.fn();
const permissionMock = jest.fn();

jest.mock('../services/newsletter', () => ({
  subscribeNewsletter: (...args: unknown[]) => subscribeMock(...args),
}));

jest.mock('../services/notifications', () => ({
  requestNotificationPermission: (...args: unknown[]) => permissionMock(...args),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(
    { success: jest.fn(), error: jest.fn() },
    { __esModule: true },
  ),
}));

function setNotification(value: unknown) {
  (window as unknown as { Notification?: unknown }).Notification = value;
}

beforeEach(() => {
  window.localStorage.clear();
  subscribeMock.mockReset();
  permissionMock.mockReset();
  jest.useFakeTimers();
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  delete (window as unknown as { Notification?: unknown }).Notification;
});

/** Mounts the modal and advances past the first-visit delay. */
function renderAndReveal() {
  const result = render(<NewsletterModal />);
  act(() => {
    jest.advanceTimersByTime(NEWSLETTER_MODAL_DELAY_MS + 10);
  });
  return result;
}

describe('first-visit gating', () => {
  it('stays hidden until the delay elapses', () => {
    render(<NewsletterModal />);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      jest.advanceTimersByTime(NEWSLETTER_MODAL_DELAY_MS + 10);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('never reopens once the visitor subscribed', () => {
    window.localStorage.setItem(
      'pcz-newsletter-modal',
      JSON.stringify({ status: 'subscribed', at: Date.now() }),
    );
    render(<NewsletterModal />);
    act(() => {
      jest.advanceTimersByTime(NEWSLETTER_MODAL_DELAY_MS + 10);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('snoozes a dismissal for 30 days, then returns', () => {
    const old = Date.now() - NEWSLETTER_MODAL_SNOOZE_MS - 1000;
    window.localStorage.setItem(
      'pcz-newsletter-modal',
      JSON.stringify({ status: 'dismissed', at: old }),
    );
    renderAndReveal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('stays snoozed inside the 30-day window', () => {
    window.localStorage.setItem(
      'pcz-newsletter-modal',
      JSON.stringify({ status: 'dismissed', at: Date.now() }),
    );
    render(<NewsletterModal />);
    act(() => {
      jest.advanceTimersByTime(NEWSLETTER_MODAL_DELAY_MS + 10);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('dismissal', () => {
  it('closes on the close button and records the snooze', () => {
    renderAndReveal();
    fireEvent.click(screen.getByLabelText(/close newsletter invite/i));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.localStorage.getItem('pcz-newsletter-modal')).toContain('dismissed');
  });

  it('closes on Escape without blocking navigation', () => {
    renderAndReveal();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('subscribe', () => {
  it('submits the email and silences future visits', async () => {
    subscribeMock.mockResolvedValue({ message: 'Subscribed' });
    renderAndReveal();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fan@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^subscribe$/i }));
    });

    await waitFor(() => expect(subscribeMock).toHaveBeenCalledWith('fan@example.com'));
    expect(window.localStorage.getItem('pcz-newsletter-modal')).toContain('subscribed');
  });
});

describe('notification opt-in', () => {
  it('reports unsupported without the Notification API', () => {
    delete (window as unknown as { Notification?: unknown }).Notification;
    expect(notificationsUnsupported()).toBe(true);
  });

  it('never offers the opt-in when permission was already answered', () => {
    setNotification({ permission: 'denied' });
    expect(shouldOfferNotificationOptIn()).toBe(false);
    window.localStorage.setItem(NOTIFICATION_PROMPT_STORAGE_KEY, '123');
    setNotification({ permission: 'default' });
    expect(shouldOfferNotificationOptIn()).toBe(false);
  });

  it('offers the opt-in to a fresh visitor and requests only on click', async () => {
    setNotification({ permission: 'default' });
    permissionMock.mockResolvedValue('granted');
    renderAndReveal();

    // Nothing requested just by showing the modal.
    expect(permissionMock).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /notify me about live scores/i }));
    });
    expect(permissionMock).toHaveBeenCalledTimes(1);
  });

  it('does not nag again after a blocked visitor', async () => {
    setNotification({ permission: 'default' });
    permissionMock.mockResolvedValue('denied');
    renderAndReveal();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /notify me about live scores/i }));
    });
    expect(permissionMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(NOTIFICATION_PROMPT_STORAGE_KEY)).toBeTruthy();
  });
});
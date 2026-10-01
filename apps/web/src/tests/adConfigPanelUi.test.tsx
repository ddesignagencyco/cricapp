import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdConfigPanel from '../components/admin/AdConfigPanel';
import { AD_PLACEMENTS, EMPTY_AD_CONFIG, type AdConfig } from '../lib/advertisements/registry';

const saveAdConfig = jest.fn(async (_input: unknown) => ({ ads: EMPTY_AD_CONFIG }));

jest.mock('../services/siteSettings', () => ({
  saveAdConfig: (input: unknown) => saveAdConfig(input),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

function configWith(overrides: Partial<AdConfig> = {}): AdConfig {
  return { ...EMPTY_AD_CONFIG, ...overrides };
}

/** The group heading, addressed by its landmark so the bulk buttons cannot also match. */
function groupHeading(name: string): HTMLElement {
  return within(screen.getByRole('group', { name: `${name} placements` })).getByRole('button', {
    name: new RegExp(`^${name}`),
  });
}

function homeGroup(): HTMLElement {
  return screen.getByRole('group', { name: 'Home page placements' });
}

function renderPanel(config: AdConfig = EMPTY_AD_CONFIG, props: Partial<React.ComponentProps<typeof AdConfigPanel>> = {}) {
  return render(
    <AdConfigPanel
      config={config}
      adUnits={[]}
      includeArchived={false}
      onToggleArchived={jest.fn()}
      onSaved={jest.fn()}
      {...props}
    />,
  );
}

beforeEach(() => {
  saveAdConfig.mockClear();
});

describe('grouping the placement switches', () => {
  it('starts collapsed, so the page opens with a handful of headings instead of 26 rows', () => {
    renderPanel();
    expect(groupHeading('Home page')).toHaveAttribute('aria-expanded', 'false');
    // The switch for a row inside a collapsed group is not reachable yet.
    expect(screen.queryByRole('switch', { name: 'Enable Mid page' })).not.toBeInTheDocument();
  });

  it('reveals a group\'s rows on demand', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(groupHeading('Home page'));
    expect(within(homeGroup()).getByRole('switch', { name: 'Enable Mid page' })).toBeInTheDocument();
    expect(within(homeGroup()).getByRole('switch', { name: 'Enable Footer' })).toBeInTheDocument();
  });

  it('shows how many slots in a group are on', () => {
    renderPanel();
    const homeRows = AD_PLACEMENTS.filter((row) => row.group === 'home').length;
    expect(within(homeGroup()).getByText(`${homeRows}/${homeRows} on`)).toBeInTheDocument();
  });

  it('turns a whole group on or off from its heading', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(groupHeading('Home page'));

    await user.click(within(homeGroup()).getByRole('button', { name: 'Turn off every placement in Home page' }));
    AD_PLACEMENTS.filter((row) => row.group === 'home').forEach((row) => {
      expect(within(homeGroup()).getByRole('switch', { name: `Enable ${row.label}` })).toHaveAttribute(
        'aria-checked',
        'false',
      );
    });
    // Another group is untouched.
    await user.click(groupHeading('News'));
    expect(
      within(screen.getByRole('group', { name: 'News placements' })).getByRole('switch', {
        name: 'Enable List — bottom',
      }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('disables the bulk button once the whole group already matches it', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(groupHeading('Home page'));
    expect(within(homeGroup()).getByRole('button', { name: 'Turn on every placement in Home page' })).toBeDisabled();
    expect(within(homeGroup()).getByRole('button', { name: 'Turn off every placement in Home page' })).toBeEnabled();

    await user.click(within(homeGroup()).getByRole('button', { name: 'Turn off every placement in Home page' }));
    expect(within(homeGroup()).getByRole('button', { name: 'Turn on every placement in Home page' })).toBeEnabled();
    expect(within(homeGroup()).getByRole('button', { name: 'Turn off every placement in Home page' })).toBeDisabled();
  });
});

describe('filtering placements', () => {
  it('opens the matching group without a click', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.type(screen.getByRole('searchbox', { name: 'Filter placements' }), 'prediction-detail');
    expect(screen.getByRole('switch', { name: 'Enable Prediction detail — sidebar' })).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Enable Mid page' })).not.toBeInTheDocument();
  });

  it('says so when nothing matches, instead of showing an empty page', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.type(screen.getByRole('searchbox', { name: 'Filter placements' }), 'zzzz');
    expect(screen.getByText(/No placement matches/)).toBeInTheDocument();
  });

  it('clears back to every group', async () => {
    const user = userEvent.setup();
    renderPanel();
    const box = screen.getByRole('searchbox', { name: 'Filter placements' });
    await user.type(box, 'prediction');
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(box).toHaveValue('');
    expect(groupHeading('Home page')).toBeInTheDocument();
  });
});

describe('saving and discarding', () => {
  it('cannot be saved until something actually changes', async () => {
    const user = userEvent.setup();
    renderPanel();
    const save = screen.getByRole('button', { name: 'Save ad configuration' });
    expect(save).toBeDisabled();
    expect(screen.getByText(/Saved\./)).toBeInTheDocument();

    await user.click(groupHeading('Home page'));
    await user.click(within(homeGroup()).getByRole('switch', { name: 'Enable Mid page' }));

    expect(save).toBeEnabled();
    expect(screen.getByText(/Unsaved changes\./)).toBeInTheDocument();
  });

  it('discards an edit and puts the switch back', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(groupHeading('Home page'));
    await user.click(within(homeGroup()).getByRole('switch', { name: 'Enable Mid page' }));
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));

    expect(within(homeGroup()).getByRole('switch', { name: 'Enable Mid page' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Save ad configuration' })).toBeDisabled();
  });

  it('posts the config and reconciles from the response', async () => {
    const user = userEvent.setup();
    const onSaved = jest.fn();
    renderPanel(configWith({ mode: 'off' }), { onSaved });
    await user.click(groupHeading('Home page'));
    await user.click(within(homeGroup()).getByRole('switch', { name: 'Enable Mid page' }));
    await user.click(screen.getByRole('button', { name: 'Save ad configuration' }));

    expect(saveAdConfig).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'off', placements: expect.objectContaining({ 'home-mid': { enabled: false, slotId: '' } }) }),
    );
    expect(onSaved).toHaveBeenCalledWith(EMPTY_AD_CONFIG);
    expect(screen.getByRole('button', { name: 'Save ad configuration' })).toBeDisabled();
  });

  it('will not post a form that only matches what is already saved', async () => {
    const user = userEvent.setup();
    renderPanel();
    expect(screen.getByRole('button', { name: 'Save ad configuration' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Save ad configuration' }));
    expect(saveAdConfig).not.toHaveBeenCalled();
  });
});

describe('explaining what will actually render', () => {
  it('warns that the switches are inert while the mode is off', () => {
    renderPanel(configWith({ mode: 'off' }));
    expect(screen.getByText(/no slot will render regardless of the switches below/)).toBeInTheDocument();
  });

  it('does not show that warning in the default mode', () => {
    renderPanel();
    expect(screen.queryByText(/no slot will render regardless/)).not.toBeInTheDocument();
  });

  it('counts the placements that would render nothing in adsense mode', () => {
    renderPanel(configWith({ mode: 'adsense', clientId: 'pub-1234567890123456' }));
    expect(screen.getByText(new RegExp(`\\d+ of ${AD_PLACEMENTS.length} placements have no ad unit id`))).toBeInTheDocument();
  });

  it('marks a row that has no ad unit of its own or inherited', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(groupHeading('Home page'));
    const row = within(homeGroup()).getByRole('switch', { name: 'Enable Mid page' }).closest('li') as HTMLElement;
    expect(within(row).getByText('no ad unit')).toBeInTheDocument();
  });

  it('says where an inherited ad unit comes from', async () => {
    const user = userEvent.setup();
    renderPanel(
      configWith({ defaultSlots: { ...EMPTY_AD_CONFIG.defaultSlots, leaderboard: '1111111111' } }),
    );
    await user.click(groupHeading('Home page'));
    const row = within(homeGroup()).getByRole('switch', { name: 'Enable Mid page' }).closest('li') as HTMLElement;
    expect(within(row).getByText('size default')).toBeInTheDocument();
  });
});

describe('the gambling opt-in', () => {
  it('is named the same thing to a screen reader as to the eye', () => {
    // The two used to disagree, so the announcement and the on-screen words
    // described different settings.
    renderPanel();
    const toggle = screen.getByRole('switch', { name: 'Allow ads on /odds and /predictions' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Allow ads on /odds and /predictions')).toBeInTheDocument();
  });
});

describe('the ad unit list filter', () => {
  it('sits with the dropdowns it filters, not in a panel of its own', async () => {
    const user = userEvent.setup();
    const onToggleArchived = jest.fn();
    renderPanel(EMPTY_AD_CONFIG, { includeArchived: false, onToggleArchived });

    const toggle = screen.getByRole('switch', { name: 'Show archived ad units in the dropdowns' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await user.click(toggle);
    expect(onToggleArchived).toHaveBeenCalled();
  });

  it('shows the fetched unit count', () => {
    renderPanel();
    expect(screen.getByText('0 units listed')).toBeInTheDocument();
  });
});

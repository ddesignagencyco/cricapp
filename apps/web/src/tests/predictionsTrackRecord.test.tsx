import { render, screen } from '@testing-library/react';
import PredictionsHub from '../components/predictions/PredictionsHub';
import {
  MIN_PUBLISHABLE_PREDICTION_SAMPLES,
  isAccuracyPublishable,
} from '../lib/predictions';
import type { Match } from '../types';
import type { PredictionPerformance } from '../types/predictions';

/**
 * The predictions page showed a "Track record" card reading "0%" above a breakdown
 * of `T20 1 · 0%` and `ODI 2 · 0%`, built from three settled matches.
 *
 * The API had already refused to publish that number — `claimReady: false`,
 * `publishMinSamples: 200` and a `guidance` sentence saying so — but the page gated
 * on `sampleSize > 0` alone and never read any of the three. Three games is noise,
 * so the card now stays hidden until the backend says the figure is publishable.
 */

jest.mock('../hooks/useMatchStream', () => ({
  useMatchStream: () => null,
  mergeMatchLivePayload: (payload: unknown) => payload,
  mergeLiveUpdate: (list: unknown[]) => list,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/predictions',
  useSearchParams: () => new URLSearchParams(''),
  useParams: () => ({}),
}));

/** The exact payload the running API returns today. */
const NOT_CLAIMABLE: PredictionPerformance = {
  modelVersion: 'prematch-logit-v3',
  stage: 'pre_match',
  sampleSize: 3,
  accuracy: 0,
  brierScore: 0.25,
  expectedCalibrationError: 0.5,
  byFormat: [
    { format: 't20', sampleSize: 1, accuracy: 0, brierScore: 0.25 },
    { format: 'odi', sampleSize: 2, accuracy: 0, brierScore: 0.25 },
  ],
  byConfidenceBand: [{ band: 'low', sampleSize: 3, accuracy: 0, brierScore: 0.25 }],
  claimReady: false,
  publishMinSamples: 200,
  guidance: 'Do not market a headline accuracy % until sampleSize >= 200 settled matches.',
};

/** What the payload looks like once the model is mature enough to talk about. */
const CLAIMABLE: PredictionPerformance = {
  modelVersion: 'prematch-logit-v4',
  stage: 'pre_match',
  sampleSize: 480,
  accuracy: 0.61,
  brierScore: 0.19,
  byFormat: [{ format: 't20', sampleSize: 480, accuracy: 0.61, brierScore: 0.19 }],
  byConfidenceBand: [{ band: 'medium', sampleSize: 300, accuracy: 0.64, brierScore: 0.18 }],
  claimReady: true,
  publishMinSamples: 200,
};

function renderHub(performance: PredictionPerformance | null) {
  const live: Array<{ match: Match; predictions: null }> = [];
  return render(
    <PredictionsHub
      performance={performance}
      live={live}
      upcoming={live}
      upcomingPage={1}
      upcomingTotal={0}
      upcomingLimit={12}
    />,
  );
}

/** Drops a field the way an older API build that does not send it would. */
function without<T extends object>(payload: T, field: string): T {
  const copy: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
  delete copy[field];
  return copy as T;
}

describe('isAccuracyPublishable', () => {
  it('refuses the exact payload the API is returning now', () => {
    expect(isAccuracyPublishable(NOT_CLAIMABLE)).toBe(false);
  });

  it('allows a figure the backend has blessed', () => {
    expect(isAccuracyPublishable(CLAIMABLE)).toBe(true);
  });

  it('refuses anything at all when there is no payload', () => {
    expect(isAccuracyPublishable(null)).toBe(false);
    expect(isAccuracyPublishable(undefined)).toBe(false);
  });

  it("follows the backend's verdict rather than second-guessing it", () => {
    // The API owns the policy. A bare `true` is honoured even at a tiny sample.
    expect(isAccuracyPublishable({ ...NOT_CLAIMABLE, sampleSize: 1, claimReady: true })).toBe(true);
  });

  it('falls back to the sample-size rule when claimReady is absent', () => {
    // An older API build sends no verdict, so the page must still refuse a thin sample.
    const noVerdict = without(NOT_CLAIMABLE, 'claimReady');
    expect(isAccuracyPublishable(noVerdict)).toBe(false);
    expect(isAccuracyPublishable({ ...noVerdict, sampleSize: 480 })).toBe(true);
  });

  it('honours a threshold other than the default when one is supplied', () => {
    const noVerdict = without(NOT_CLAIMABLE, 'claimReady');
    expect(isAccuracyPublishable({ ...noVerdict, publishMinSamples: 2, sampleSize: 3 })).toBe(true);
  });

  it('uses 200 as the threshold when the API names none', () => {
    expect(MIN_PUBLISHABLE_PREDICTION_SAMPLES).toBe(200);
    const bare = without(without(NOT_CLAIMABLE, 'claimReady'), 'publishMinSamples');
    expect(isAccuracyPublishable(bare)).toBe(false);
    expect(isAccuracyPublishable({ ...bare, sampleSize: 200 })).toBe(true);
  });

  it('does not treat a missing sample size as a large one', () => {
    // No verdict and no sample: there is nothing to base a claim on, so it must refuse.
    const noEvidence = without(without(CLAIMABLE, 'claimReady'), 'sampleSize');
    expect(isAccuracyPublishable(noEvidence as PredictionPerformance)).toBe(false);
  });

  it('ignores a sample size that is not a number', () => {
    const noVerdict = without(CLAIMABLE, 'claimReady');
    expect(isAccuracyPublishable({ ...noVerdict, sampleSize: 'lots' as unknown as number })).toBe(false);
  });
});

describe('the track record card on the predictions page', () => {
  it('is not rendered while the API refuses to publish the figure', () => {
    renderHub(NOT_CLAIMABLE);
    expect(screen.queryByText('Track record')).not.toBeInTheDocument();
    expect(screen.queryByText('3 settled matches')).not.toBeInTheDocument();
  });

  it('never shows the misleading 0% headline', () => {
    renderHub(NOT_CLAIMABLE);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    expect(screen.queryByText('T20')).not.toBeInTheDocument();
    expect(screen.queryByText('ODI')).not.toBeInTheDocument();
    expect(screen.queryByText('Confidence')).not.toBeInTheDocument();
  });

  it('appears once the figure is publishable', () => {
    renderHub(CLAIMABLE);
    expect(screen.getByText('Track record')).toBeInTheDocument();
    expect(screen.getByText('480 settled matches')).toBeInTheDocument();
    // Once in the headline, once in the format breakdown.
    expect(screen.getAllByText('61%')).toHaveLength(2);
    expect(screen.getByText('T20')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('is absent when the page has no performance payload at all', () => {
    renderHub(null);
    expect(screen.queryByText('Track record')).not.toBeInTheDocument();
  });

  it('still renders the page itself, so the section does not just vanish', () => {
    renderHub(NOT_CLAIMABLE);
    expect(screen.getByText('Predictions')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Live/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Upcoming/ })).toBeInTheDocument();
  });
});

'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, Send, FlaskConical, RefreshCw } from 'lucide-react';
import {
  AdminField,
  AdminSelect,
  CardHeader,
  CardPanel,
  ConfirmDialog,
  StatCard,
} from './AdminShared';
import {
  fetchNewsletterCampaigns,
  previewNewsletterCampaign,
  sendNewsletterCampaign,
  sendNewsletterTest,
  type NewsletterCampaignInput,
  type NewsletterCampaignOverview,
  type NewsletterPreview,
  type NewsletterType,
} from '../../services/newsletter';
import { fetchMatchesPage } from '../../services/matches';
import { fetchNewsAdmin } from '../../services/newsAdmin';
import { ApiError } from '../../services/api/client';
import type { Match } from '../../types';

type Option = { value: string; label: string };

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback;
}

function matchLabel(m: Match): string {
  const names = (m.teamNames || []).filter((n) => n && !n.startsWith('sr:'));
  const when = m.scheduled ? new Date(m.scheduled).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  return [names.join(' vs ') || m.matchId, m.tournament, when].filter(Boolean).join(' · ');
}

/** Pakistan and PSL first: those are the matches previews exist for. */
function matchPriority(m: Match): number {
  const text = `${(m.teamNames || []).join(' ')} ${m.tournament || ''}`;
  return /pakistan/i.test(text) ? 0 : 1;
}

function formatWhen(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Newsletter campaigns: preview any newsletter type with live data, send a [TEST]
 * copy to yourself, then send to every eligible subscriber. The server enforces the
 * safety rules (one copy per issue, per-day caps, opt-outs), so this screen can't
 * double-send.
 */
export default function NewsletterCampaigns() {
  const [overview, setOverview] = useState<NewsletterCampaignOverview | null>(null);
  const [type, setType] = useState<NewsletterType>('daily_digest');
  const [matchId, setMatchId] = useState('');
  const [newsId, setNewsId] = useState('');
  const [matches, setMatches] = useState<Option[]>([]);
  const [stories, setStories] = useState<Option[]>([]);
  const [preview, setPreview] = useState<NewsletterPreview | null>(null);
  const [busy, setBusy] = useState<'preview' | 'test' | 'send' | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadOverview = () => {
    fetchNewsletterCampaigns()
      .then(setOverview)
      .catch(() => setOverview(null));
  };

  useEffect(() => {
    loadOverview();
    fetchMatchesPage({ status: 'upcoming', limit: 100, page: 1 })
      .then((res) =>
        setMatches(
          [...res.items]
            .sort((a, b) => matchPriority(a) - matchPriority(b) || String(a.scheduled).localeCompare(String(b.scheduled)))
            .map((m) => ({ value: String(m.matchId || m.id), label: matchLabel(m) })),
        ),
      )
      .catch(() => setMatches([]));
    fetchNewsAdmin({ limit: 30, page: 1 })
      .then((res) =>
        setStories(
          res.items
            .filter((a) => a.isPublished)
            .map((a) => ({ value: String(a.id), label: String(a.title) })),
        ),
      )
      .catch(() => setStories([]));
  }, []);

  // A preview belongs to one input; changing the input clears it.
  useEffect(() => setPreview(null), [type, matchId, newsId]);

  const input = useMemo<NewsletterCampaignInput | null>(() => {
    if (type === 'match_preview') return matchId ? { type, matchId } : null;
    if (type === 'breaking_news') return newsId ? { type, newsId } : null;
    return { type };
  }, [type, matchId, newsId]);

  const info = overview?.types.find((t) => t.type === type);

  const runPreview = async () => {
    if (!input) return;
    setBusy('preview');
    try {
      setPreview(await previewNewsletterCampaign(input));
    } catch (error) {
      setPreview(null);
      toast.error(errorText(error, 'Could not build this newsletter.'));
    } finally {
      setBusy(null);
    }
  };

  const runTest = async () => {
    if (!input) return;
    setBusy('test');
    try {
      const res = await sendNewsletterTest(input);
      toast.success(`Test sent to ${res.to}`);
    } catch (error) {
      toast.error(errorText(error, 'Could not send the test email.'));
    } finally {
      setBusy(null);
    }
  };

  const runSend = async () => {
    if (!input) return;
    setBusy('send');
    try {
      const res = await sendNewsletterCampaign(input);
      toast.success(`Sending “${res.subject}”. Progress appears below.`);
      setConfirmOpen(false);
      // Sending is paced on the server; refresh the log a few times as it goes.
      [3000, 15000, 45000].forEach((ms) => setTimeout(loadOverview, ms));
    } catch (error) {
      toast.error(errorText(error, 'Could not start sending.'));
      setConfirmOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const typeLabel = (value: string) => overview?.types.find((t) => t.type === value)?.label ?? value;
  const actionClass = 'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold disabled:opacity-50';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Active subscribers" value={overview?.subscribers.active ?? '—'} icon={<Send size={16} />} />
        <StatCard label="Unsubscribed" value={overview?.subscribers.unsubscribed ?? '—'} icon={<RefreshCw size={16} />} />
        <StatCard
          label="Scheduled sending"
          value={overview ? (overview.autoSend ? 'On' : 'Off') : '—'}
          sub={overview?.autoSend ? 'Digests and previews go out on schedule.' : 'Nothing sends until you press Send.'}
          icon={<FlaskConical size={16} />}
        />
      </div>

      <CardPanel>
        <CardHeader>
          <h2 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Send a newsletter</h2>
        </CardHeader>
        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div className="space-y-4">
            <AdminField label="Newsletter" htmlFor="nl-type" hint={info?.description}>
              <AdminSelect id="nl-type" value={type} onChange={(e) => setType(e.target.value as NewsletterType)}>
                {(overview?.types ?? []).map((t) => (
                  <option key={t.type} value={t.type}>{t.label}</option>
                ))}
                {!overview ? <option value="daily_digest">Daily digest</option> : null}
              </AdminSelect>
            </AdminField>

            {type === 'match_preview' ? (
              <AdminField label="Match" htmlFor="nl-match" hint="Upcoming matches, Pakistan and PSL first.">
                <AdminSelect id="nl-match" value={matchId} onChange={(e) => setMatchId(e.target.value)}>
                  <option value="">Choose a match…</option>
                  {matches.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </AdminSelect>
              </AdminField>
            ) : null}

            {type === 'breaking_news' ? (
              <AdminField label="Story" htmlFor="nl-news" hint="Only a verified, published story.">
                <AdminSelect id="nl-news" value={newsId} onChange={(e) => setNewsId(e.target.value)}>
                  <option value="">Choose a story…</option>
                  {stories.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </AdminSelect>
              </AdminField>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void runPreview()} disabled={!input || busy !== null} className={`btn-secondary ${actionClass}`}>
                <Eye size={14} /> {busy === 'preview' ? 'Building…' : 'Preview'}
              </button>
              <button type="button" onClick={() => void runTest()} disabled={!input || busy !== null} className={`btn-secondary ${actionClass}`}>
                <FlaskConical size={14} /> {busy === 'test' ? 'Sending…' : 'Send test to me'}
              </button>
              <button type="button" onClick={() => setConfirmOpen(true)} disabled={!input || !preview || busy !== null} className={`btn-brand ${actionClass}`}>
                <Send size={14} /> Send to subscribers
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Preview first — sending unlocks once you have seen the email. Each subscriber gets an issue
              once, at most two newsletters a day, and never a type they switched off.
            </p>
          </div>

          <div className="min-w-0">
            {preview ? (
              <div className="overflow-hidden rounded-md" style={{ border: '1px solid var(--admin-border)' }}>
                <div className="space-y-0.5 px-3 py-2 text-xs" style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
                  <p className="font-bold" style={{ color: 'var(--admin-text)' }}>{preview.subject}</p>
                  <p className="truncate" style={{ color: 'var(--admin-text-muted)' }}>{preview.preheader}</p>
                </div>
                {/* sandbox with no permissions: the email is shown, never run. */}
                <iframe title="Newsletter preview" srcDoc={preview.html} sandbox="" className="block h-[560px] w-full bg-white" />
              </div>
            ) : (
              <div className="grid h-full min-h-[200px] place-items-center rounded-md px-4 text-center text-sm" style={{ border: '1px dashed var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                Press Preview to see the email exactly as subscribers will get it.
              </div>
            )}
          </div>
        </div>
      </CardPanel>

      <CardPanel className="overflow-hidden">
        <CardHeader action={
          <button type="button" onClick={loadOverview} className={`btn-secondary ${actionClass}`}>
            <RefreshCw size={13} /> Refresh
          </button>
        }>
          <h2 className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>Recent campaigns</h2>
        </CardHeader>
        <div className="table-scroll">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead>
              <tr style={{ background: 'var(--admin-table-header)', borderBottom: '1px solid var(--admin-border)' }}>
                {['Newsletter', 'Subject', 'Sent', 'Failed', 'Last sent'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!overview?.recentCampaigns.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--admin-text-muted)' }}>No newsletters sent yet.</td>
                </tr>
              ) : overview.recentCampaigns.map((c) => (
                <tr key={`${c.type}|${c.issueKey}`} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <td className="whitespace-nowrap px-4 py-2.5 font-semibold" style={{ color: 'var(--admin-text)' }}>{typeLabel(c.type)}</td>
                  <td className="max-w-[22rem] truncate px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }} title={c.subject ?? undefined}>{c.subject ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums" style={{ color: 'var(--admin-text)' }}>{c.sent}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums" style={{ color: c.failed ? 'var(--admin-danger)' : 'var(--admin-text-muted)' }}>{c.failed}</td>
                  <td className="whitespace-nowrap px-4 py-2.5" style={{ color: 'var(--admin-text-muted)' }}>{formatWhen(c.lastSentAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardPanel>

      <ConfirmDialog
        open={confirmOpen}
        title="Send to all subscribers?"
        message={`“${preview?.subject ?? ''}” will go to every eligible subscriber (${overview?.subscribers.active ?? 0} active). This can't be undone.`}
        confirmLabel="Send now"
        loading={busy === 'send'}
        onConfirm={() => void runSend()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

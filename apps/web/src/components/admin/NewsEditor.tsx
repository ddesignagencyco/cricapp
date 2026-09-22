'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EditorSkeleton } from '../skeletons/Skeletons';
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  Tag,
  User,
  Globe,
  ImageIcon,
  Languages,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createCategory,
  createNews,
  createNewsTranslation,
  fetchNewsArticle,
  fetchNewsCategories,
  updateNews,
  type NewsArticleAdmin,
  type NewsCategory,
  type NewsInput,
} from '../../services/newsAdmin';
import RichTextEditor from './RichTextEditor';
import MediaPicker from './MediaPicker';
import { AdminField, AdminInput, AdminSelect } from './AdminShared';
import EntityIdPicker, { type EntityChoice } from './EntityIdPicker';
import { fetchMatchById } from '../../services/matches';
import { fetchPlayerById } from '../../services/players';
import { fetchTeamById, fetchTeamResults, fetchTeamSchedule } from '../../services/teams';
import { fetchTournamentById } from '../../services/tournaments';
import { searchAll } from '../../services/search';
import { fetchAdminAuthors, type AdminAuthor } from '../../services/admin';
import RemoteImage from '../RemoteImage';
import {
  NEWS_LANGUAGES,
  NEWS_TITLE_MAX_WORDS,
  countWords,
  isEmptyRichText,
  isUrduLanguage,
  isValidNewsSlug,
  otherNewsLanguage,
  slugifyNews,
} from '../../utils/newsConstraints';
import { newsLocale } from '../../utils/locale';
import { translateNewsCopy } from '../../lib/machineTranslate';

interface NewsEditorProps {
  mode: 'create' | 'edit';
  id?: string;
}

interface FormState {
  title: string;
  slug: string;
  summary: string;
  content: string;
  imageUrl: string;
  author: string;
  authorId: string;
  source: string;
  categoryId: string;
  language: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  players: EntityChoice[];
  teams: EntityChoice[];
  matches: EntityChoice[];
  series: EntityChoice[];
}

const emptyForm: FormState = {
  title: '',
  slug: '',
  summary: '',
  content: '',
  imageUrl: '',
  author: '',
  authorId: '',
  source: '',
  categoryId: '',
  language: 'en',
  metaTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  players: [],
  teams: [],
  matches: [],
  series: [],
};

function asIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string' || typeof item === 'number') return String(item);
      if (item && typeof item === 'object' && 'id' in item) {
        const id = (item as { id?: unknown }).id;
        return id === null || id === undefined ? '' : String(id);
      }
      return '';
    })
    .filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const text = value.trim();
    return !text || text === '[object Object]' ? '' : text;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(' ');
  if (typeof value !== 'object') return '';
  const rec = asRecord(value);
  const nested = rec.name ?? rec.full_name ?? rec.fullName ?? rec.short_name ?? rec.shortName ?? rec.abbr ?? rec.title;
  if (nested === undefined || nested === null || nested === value) return '';
  return asText(nested);
}

function matchIdOf(match: unknown): string {
  const row = asRecord(match);
  const raw = row.matchId ?? row.match_id ?? row.id;
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw).trim();
  return asText(raw);
}

function teamNameList(match: unknown): string[] {
  const row = asRecord(match);
  const names = row.teamNames ?? row.team_names;
  return Array.isArray(names) ? names.map(asText).filter(Boolean) : [];
}

function sideName(side: unknown): string {
  const rec = asRecord(side);
  return asText(rec.name ?? rec.full_name ?? rec.fullName ?? rec.short_name ?? rec.qualifier ?? side);
}

function matchLabel(match: unknown): string {
  if (!match) return 'Match';
  const row = asRecord(match);
  const names = teamNameList(match);
  const teamsVal = row.teams;
  let home = '';
  let away = '';
  if (Array.isArray(teamsVal)) {
    home = sideName(teamsVal[0]) || names[0] || '';
    away = sideName(teamsVal[1]) || names[1] || '';
  } else {
    const teams = asRecord(teamsVal);
    home = sideName(teams.home) || names[0] || sideName(row.home);
    away = sideName(teams.away) || names[1] || sideName(row.away);
  }
  if (home && away) return `${home} vs ${away}`;
  if (home || away) return home || away;
  return asText(row.tournamentName) || asText(row.tournament) || asText(row.matchId) || 'Match';
}

function sportEventLabel(event: { eventId?: string; payload?: Record<string, unknown> }): string {
  const payload = asRecord(event.payload);
  const names = Array.isArray(payload.teamNames) ? payload.teamNames.map(asText).filter(Boolean) : [];
  if (names.length >= 2) return `${names[0]} vs ${names[1]}`;
  const ev = asRecord(payload.sport_event);
  const comps = Array.isArray(ev.competitors) ? ev.competitors : [];
  const home = sideName(comps[0]);
  const away = sideName(comps[1]);
  if (home && away) return `${home} vs ${away}`;
  return asText(payload.tournament) || asText(event.eventId) || 'Match';
}

async function resolveLinkedEntities(
  article: NewsArticleAdmin
): Promise<Pick<FormState, 'players' | 'teams' | 'matches' | 'series'>> {
  const extra = article as NewsArticleAdmin & {
    players?: unknown;
    teams?: unknown;
    matches?: unknown;
    series?: unknown;
  };
  const playerIds = asIdList(article.playerIds ?? extra.players);
  const teamIds = asIdList(article.teamIds ?? extra.teams);
  const matchIds = asIdList(article.matchIds ?? extra.matches);
  const seriesIds = asIdList(article.seriesIds ?? extra.series);

  const [players, teams, matches, series] = await Promise.all([
    Promise.all(
      playerIds.map(async (id) => {
        const player = await fetchPlayerById(id).catch(() => null);
        return { id, label: player?.name || player?.fullName || id };
      })
    ),
    Promise.all(
      teamIds.map(async (id) => {
        const team = await fetchTeamById(id).catch(() => null);
        return { id, label: team?.name || id };
      })
    ),
    Promise.all(
      matchIds.map(async (id) => {
        const match = await fetchMatchById(id).catch(() => null);
        return { id, label: matchLabel(match) };
      })
    ),
    Promise.all(
      seriesIds.map(async (id) => {
        const row = await fetchTournamentById(id).catch(() => null);
        return { id, label: row?.name || id };
      })
    ),
  ]);

  return { players, teams, matches, series };
}

export default function NewsEditor({ mode, id }: NewsEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const translateFrom = searchParams.get('translateFrom') || '';
  const isTranslate = mode === 'create' && Boolean(translateFrom);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [authors, setAuthors] = useState<AdminAuthor[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit' || isTranslate);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(isTranslate ? translateFrom : null);
  const [hasOtherTranslation, setHasOtherTranslation] = useState(false);

  useEffect(() => {
    fetchNewsCategories().then(setCategories).catch(() => setCategories([]));
    fetchAdminAuthors().then(setAuthors).catch(() => setAuthors([]));
    const initialCategory = searchParams.get('category');
    if (mode === 'create' && initialCategory && !translateFrom) {
      setForm((current) => ({ ...current, categoryId: initialCategory }));
    }
    if (mode === 'create' && translateFrom) {
      fetchNewsArticle(translateFrom)
        .then(async (article) => {
          const sourceLang = isUrduLanguage(article.language) ? 'ur' : 'en';
          const target = otherNewsLanguage(article.language);
          const linked = await resolveLinkedEntities(article);
          const sourceCopy = {
            title: article.title || '',
            summary: article.summary || '',
            content: article.content || '',
            metaTitle: article.metaTitle || '',
            metaDescription: article.metaDescription || '',
          };
          let copy = sourceCopy;
          try {
            copy = await translateNewsCopy(sourceCopy, sourceLang, target);
          } catch {
            toast.error('Auto-translate failed. English text is filled — rewrite it in Urdu.');
          }
          setSourceId(article.id);
          setForm({
            ...emptyForm,
            title: copy.title,
            slug: slugifyNews(copy.title),
            summary: copy.summary,
            content: copy.content,
            imageUrl: article.imageUrl || '',
            author: article.author || '',
            authorId: article.authorId || '',
            source: article.source || '',
            categoryId: article.categoryId || '',
            language: target,
            metaTitle: copy.metaTitle,
            metaDescription: copy.metaDescription,
            canonicalUrl: '',
            ...linked,
          });
          setSlugTouched(false);
        })
        .catch(() => toast.error('Could not load the source article.'))
        .finally(() => setLoading(false));
      return;
    }
    if (mode === 'edit' && id) {
      fetchNewsArticle(id)
        .then((article) => {
          const currentLang = article.language || 'en';
          setHasOtherTranslation(
            (article.translations || []).some((row) => row.language === otherNewsLanguage(currentLang)),
          );
          setForm({
            title: article.title,
            slug: article.slug || slugifyNews(article.title),
            summary: article.summary || '',
            content: article.content,
            imageUrl: article.imageUrl || '',
            author: article.author || '',
            authorId: article.authorId || '',
            source: article.source || '',
            categoryId: article.categoryId || '',
            language: currentLang,
            metaTitle: article.metaTitle || '',
            metaDescription: article.metaDescription || '',
            canonicalUrl: article.canonicalUrl || '',
            players: [],
            teams: [],
            matches: [],
            series: [],
          });
          void resolveLinkedEntities(article).then((linked) => {
            setForm((current) => ({ ...current, ...linked }));
          });
        })
        .catch(() => toast.error('Could not load the article.'))
        .finally(() => setLoading(false));
    }
  }, [id, mode, searchParams, translateFrom]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setTitle = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: slugTouched ? f.slug : slugifyNews(title),
    }));
  };

  const titleWordCount = countWords(form.title);
  const copyLocale = newsLocale(form.language, `${form.title} ${form.summary}`);
  const copyField = {
    className: 'news-copy',
    dir: copyLocale.dir,
    lang: copyLocale.lang,
  } as const;
  const urduCopy = isUrduLanguage(form.language) || copyLocale.lang === 'ur';
  const placeholders = urduCopy
    ? {
        title: 'مثلاً بابر اعظم نے قذافی اسٹیڈیم پر میچ جیت لیا',
        slug: 'ہیڈلائن سے بنے گا',
        summary: 'پیش منظر کے لیے مختصر تعارف',
        content: 'پورا مضمون یہاں لکھیں…',
        metaTitle: 'سرچ نتائج میں دکھے گا',
        metaDescription: 'مختصر سرچ وضاحت',
      }
    : {
        title: 'e.g. Babar Azam seals thriller at Gaddafi Stadium',
        slug: 'generated-from-headline',
        summary: 'Brief lead paragraph for previews',
        content: 'Write the full article here...',
        metaTitle: 'Shown in search results',
        metaDescription: 'Short search snippet',
      };

  const searchPlayers = useCallback(async (q: string): Promise<EntityChoice[]> => {
    const res = await searchAll(q);
    return res.players
      .map((player) => ({
        id: String(player.id || player.playerId || ''),
        label: player.name || player.fullName || String(player.id || ''),
      }))
      .filter((row) => row.id);
  }, []);

  const searchTeams = useCallback(async (q: string): Promise<EntityChoice[]> => {
    const res = await searchAll(q);
    return res.teams
      .map((team) => ({
        id: String(team.id || team.teamId || ''),
        label: team.name || team.shortName || String(team.id || ''),
      }))
      .filter((row) => row.id);
  }, []);

  const searchMatches = useCallback(async (q: string): Promise<EntityChoice[]> => {
    const found = new Map<string, EntityChoice>();
    const addHit = (id: string, label: string) => {
      if (id && !found.has(id)) found.set(id, { id, label });
    };

    const looksLikeId = /^(sr:match:|[0-9a-f-]{8,})/i.test(q);
    if (looksLikeId) {
      const exact = await fetchMatchById(q).catch(() => null);
      if (exact) addHit(matchIdOf(exact), matchLabel(exact));
    }

    const res = await searchAll(q);
    for (const match of res.matches) {
      addHit(matchIdOf(match), matchLabel(match));
    }

    if (found.size === 0) {
      const teamIds = res.teams.map((team) => String(team.id || '')).filter(Boolean).slice(0, 3);
      const fixtures = await Promise.all(
        teamIds.map(async (teamId) => {
          const [schedule, results] = await Promise.all([
            fetchTeamSchedule(teamId, { limit: 20 }).catch(() => []),
            fetchTeamResults(teamId, { limit: 20 }).catch(() => []),
          ]);
          return [...schedule, ...results];
        })
      );
      for (const event of fixtures.flat()) {
        const id = String(event.eventId || '');
        if (!id) continue;
        addHit(id, sportEventLabel(event));
      }
    }

    return [...found.values()];
  }, []);

  const searchSeries = useCallback(async (q: string): Promise<EntityChoice[]> => {
    const res = await searchAll(q);
    return res.tournaments
      .map((row) => ({
        id: String(row.id || row.tournamentId || ''),
        label: row.name || String(row.id || ''),
      }))
      .filter((row) => row.id);
  }, []);

  const handleAddCategory = () => {
    const name = newCategory.trim();
    if (!name) {
      toast.error('Name is required.');
      return;
    }
    createCategory(name)
      .then((category) => {
        setCategories((list) => [...list, category]);
        set('categoryId', category.id);
        setNewCategory('');
        setShowAddCat(false);
        toast.success(`Category "${category.name}" created.`);
      })
      .catch(() => toast.error('Could not create the category.'));
  };

  const submit = async (publish: boolean) => {
    const title = form.title.trim();
    const slug = slugifyNews(form.slug.trim() || title);
    const wordCount = countWords(title);
    const missing: string[] = [];
    if (!title) missing.push('Headline');
    if (isEmptyRichText(form.content)) missing.push('Content');
    if (missing.length) {
      toast.error(`${missing.join(' and ')} ${missing.length === 1 ? 'is' : 'are'} required.`);
      return;
    }
    if (wordCount > NEWS_TITLE_MAX_WORDS) {
      toast.error(`Title must be ${NEWS_TITLE_MAX_WORDS} words or fewer.`);
      return;
    }
    if (slug && !isValidNewsSlug(slug)) {
      toast.error('Slug can use letters, numbers, and hyphens only.');
      return;
    }
    if (form.language && !NEWS_LANGUAGES.includes(form.language as (typeof NEWS_LANGUAGES)[number])) {
      toast.error('Language must be English or Urdu.');
      return;
    }

    setSaving(true);
    const payload: NewsInput = {
      title,
      content: form.content.trim(),
      isPublished: publish,
    };
    if (slug) payload.slug = slug;
    if (form.summary.trim()) payload.summary = form.summary.trim();
    if (form.imageUrl.trim()) payload.imageUrl = form.imageUrl.trim();
    if (form.author.trim()) payload.author = form.author.trim();
    if (form.authorId.trim()) payload.authorId = form.authorId.trim();
    if (form.source.trim()) payload.source = form.source.trim();
    if (form.categoryId.trim()) payload.categoryId = form.categoryId.trim();
    if (form.language.trim()) payload.language = form.language.trim();
    if (form.metaTitle.trim()) payload.metaTitle = form.metaTitle.trim();
    if (form.metaDescription.trim()) payload.metaDescription = form.metaDescription.trim();
    if (form.canonicalUrl.trim()) payload.canonicalUrl = form.canonicalUrl.trim();
    payload.playerIds = form.players.map((row) => row.id);
    payload.teamIds = form.teams.map((row) => row.id);
    payload.matchIds = form.matches.map((row) => row.id);
    payload.seriesIds = form.series.map((row) => row.id);

    try {
      if (mode === 'create' && sourceId) {
        await createNewsTranslation(sourceId, payload);
        toast.success(publish ? 'Translation published!' : 'Translation draft saved.');
      } else if (mode === 'create') {
        await createNews(payload);
        toast.success(publish ? 'News published!' : 'Draft saved.');
      } else if (id) {
        await updateNews(id, payload);
        toast.success(publish ? 'News updated!' : 'Draft updated.');
      }
      router.push('/admin/news');
    } catch (err: unknown) {
      let errMsg = 'Could not save the article.';
      const error = err && typeof err === 'object' ? err as Record<string, unknown> : null;
      if (error?.body && typeof error.body === 'object') {
        const b = error.body as Record<string, unknown>;
        if (Array.isArray(b.message)) errMsg = b.message.join('; ');
        else if (typeof b.message === 'string') errMsg = b.message;
        else if (typeof b.error === 'string') errMsg = b.error;
      } else if (typeof error?.message === 'string') errMsg = error.message;
      toast.error(errMsg, { duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <EditorSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/news"
            className="grid h-8 w-8 place-items-center rounded-md transition-colors"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
            title="Back to News"
          >
            <ArrowLeft size={14} />
          </Link>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>
              {isTranslate ? `Create ${form.language === 'ur' ? 'Urdu' : 'English'} translation` : mode === 'create' ? 'Create News' : 'Edit News'}
            </h1>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              {isTranslate
                ? 'Headline, summary and body are machine-translated. Review the Urdu, then save. Slug stays blank so it stays unique.'
                : mode === 'create'
                  ? 'Write cricket news with rich formatting'
                  : `Editing news #${id?.slice(0, 8)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'edit' && id && !hasOtherTranslation ? (
            <Link
              href={`/admin/news/new?translateFrom=${id}`}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-colors"
              style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
            >
              <Languages size={12} />
              Create {form.language === 'ur' ? 'English' : 'Urdu'} translation
            </Link>
          ) : null}
          <button
            type="button"
            disabled={saving}
            onClick={() => submit(false)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => submit(true)}
            className="btn-brand inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Publish Live
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: Content */}
        <div className="space-y-4 lg:col-span-2">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
                Headline <span style={{ color: 'var(--admin-danger)' }}>*</span>
              </label>
              <span
                className="text-xs"
                style={{ color: titleWordCount > NEWS_TITLE_MAX_WORDS ? 'var(--admin-danger)' : 'var(--admin-text-muted)' }}
              >
                {titleWordCount}/{NEWS_TITLE_MAX_WORDS} words
              </span>
            </div>
            <AdminInput
              type="text"
              value={form.title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={placeholders.title}
              required
              {...copyField}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>
              SEO slug
            </label>
            <AdminInput
              type="text"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set('slug', slugifyNews(e.target.value));
              }}
              placeholder={placeholders.slug}
              {...copyField}
            />
            <p className="mt-1 text-xs" style={{ color: form.slug && !isValidNewsSlug(form.slug) ? 'var(--admin-danger)' : 'var(--admin-text-muted)' }}>
              {form.slug && !isValidNewsSlug(form.slug)
                ? 'Use letters, numbers, and hyphens only.'
                : 'Generated from the headline. Urdu articles keep an Urdu slug.'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>Summary</label>
            <AdminInput
              type="text"
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              placeholder={placeholders.summary}
              {...copyField}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>
              Content <span style={{ color: 'var(--admin-danger)' }}>*</span>
            </label>
            <RichTextEditor
              value={form.content}
              onChange={(v) => set('content', v)}
              placeholder={placeholders.content}
              language={form.language}
            />
          </div>
        </div>

        {/* Right: Metadata */}
        <div className="space-y-4">
          {/* Category */}
          <div className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--admin-text)' }}>
                <Tag size={12} style={{ color: 'var(--admin-accent)' }} /> Category
              </label>
              <button type="button" onClick={() => setShowAddCat((s) => !s)} className="text-xs font-bold" style={{ color: 'var(--admin-accent)' }}>
                {showAddCat ? 'Cancel' : '+ New'}
              </button>
            </div>
            {showAddCat ? (
              <div className="space-y-2">
                <AdminField label="Name" required>
                  <AdminInput type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name" />
                </AdminField>
                <button type="button" onClick={handleAddCategory} className="btn-brand w-full rounded-md py-1.5 text-xs font-bold disabled:opacity-50">
                  Create & Select
                </button>
              </div>
            ) : (
              <AdminSelect value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                <option value="">Select Category...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </AdminSelect>
            )}
            <label className="mt-3 block text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
              Language
              <div className="mt-1">
                <AdminSelect
                  value={form.language}
                  onChange={(e) => set('language', e.target.value)}
                  disabled={isTranslate}
                >
                  <option value="en">English</option>
                  <option value="ur">Urdu</option>
                </AdminSelect>
              </div>
            </label>
          </div>

          {/* Featured Image */}
          <div className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2" style={{ color: 'var(--admin-text)' }}>
              <ImageIcon size={12} style={{ color: 'var(--admin-accent)' }} /> Cover Image
            </label>
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="flex w-full items-center justify-center rounded-md px-3 py-2 text-xs font-bold"
              style={{ border: '1px dashed var(--admin-border)', color: 'var(--admin-accent)' }}
            >
              {form.imageUrl ? 'Change image' : 'Choose from gallery'}
            </button>
            {form.imageUrl && (
              <div className="mt-2 overflow-hidden rounded" style={{ border: '1px solid var(--admin-border)' }}>
                <RemoteImage src={form.imageUrl} alt="Preview" width={640} height={96} className="news-image h-24 w-full bg-secondary" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <p className="break-all px-2 py-1 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{form.imageUrl}</p>
                <button
                  type="button"
                  onClick={() => set('imageUrl', '')}
                  className="w-full px-2 py-1.5 text-xs font-semibold"
                  style={{ borderTop: '1px solid var(--admin-border)', color: 'var(--admin-danger)' }}
                >
                  Remove cover
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg p-4 space-y-3" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>Author profile</label>
              <AdminSelect value={form.authorId} onChange={(e) => set('authorId', e.target.value)}>
                <option value="">No author profile</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>{author.name}</option>
                ))}
              </AdminSelect>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>Author byline</label>
              <div className="relative">
                <User size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
                <AdminInput type="text" value={form.author} onChange={(e) => set('author', e.target.value)} placeholder="PakCricZone Editorial" style={{ paddingLeft: '2rem' }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>Source</label>
              <div className="relative">
                <Globe size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
                <AdminInput type="text" value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="PCB / ICC" style={{ paddingLeft: '2rem' }} />
              </div>
            </div>
          </div>

          <div className="rounded-lg p-4 space-y-3" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text)' }}>
              Linked to
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Search by name. After you pick one, the saved ID is shown. Linked matches appear on the match News tab.
            </p>
            <EntityIdPicker
              label="Matches"
              hint="Search match by name"
              values={form.matches}
              onChange={(matches) => set('matches', matches)}
              search={searchMatches}
            />
            <EntityIdPicker
              label="Teams"
              hint="Search team by name"
              values={form.teams}
              onChange={(teams) => set('teams', teams)}
              search={searchTeams}
            />
            <EntityIdPicker
              label="Players"
              hint="Search player by name"
              values={form.players}
              onChange={(players) => set('players', players)}
              search={searchPlayers}
            />
            <EntityIdPicker
              label="Series"
              hint="Search series by name"
              values={form.series}
              onChange={(series) => set('series', series)}
              search={searchSeries}
            />
          </div>

          <div className="rounded-lg p-4 space-y-3" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text)' }}>SEO</p>
            <AdminField label="SEO title">
              <AdminInput value={form.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} placeholder={placeholders.metaTitle} {...copyField} />
            </AdminField>
            <AdminField label="SEO description">
              <AdminInput value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} placeholder={placeholders.metaDescription} {...copyField} />
            </AdminField>
            <AdminField label="Canonical URL">
              <AdminInput value={form.canonicalUrl} onChange={(e) => set('canonicalUrl', e.target.value)} placeholder="https://…" />
            </AdminField>
          </div>
        </div>
      </div>

      <MediaPicker
        open={galleryOpen}
        title="Choose cover image"
        onClose={() => setGalleryOpen(false)}
        onSelect={(url) => {
          set('imageUrl', url);
          setGalleryOpen(false);
        }}
      />
    </div>
  );
}

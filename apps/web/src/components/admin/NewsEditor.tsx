'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EditorSkeleton } from '../skeletons/Skeletons';
import {
  ArrowLeft,
  Bell,
  Loader2,
  Save,
  Search,
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
} from '../../services/newsAdmin';
import RichTextEditor from './RichTextEditor';
import MediaPicker from './MediaPicker';
import { AdminField, AdminInput, AdminSelect } from './AdminShared';
import EntityIdPicker, { type EntityChoice } from './EntityIdPicker';
import { matchLabel, searchLinkedMatches } from '../../lib/newsLinkedMatches';
import { fetchMatchById } from '../../services/matches';
import { fetchPlayerById } from '../../services/players';
import { fetchTeamById } from '../../services/teams';
import { fetchTournamentById } from '../../services/tournaments';
import { searchAll } from '../../services/search';
import { fetchAdminAuthors, type AdminAuthor } from '../../services/admin';
import RemoteImage from '../RemoteImage';
import {
  NEWS_TITLE_MAX_WORDS,
  countWords,
  isUrduLanguage,
  isValidNewsSlug,
  otherNewsLanguage,
  slugifyNews,
} from '../../utils/newsConstraints';
import {
  NEWS_META_DESCRIPTION_SUGGESTED,
  NEWS_META_TITLE_SUGGESTED,
  NEWS_PUSH_BODY_MAX,
  NEWS_PUSH_TITLE_MAX,
  NEWS_SOCIAL_COPY_MAX,
  blockingNewsFields,
  buildNewsPayload,
  bylineForProfile,
  validateNewsDraft,
} from '../../lib/newsForm';
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
  pushNotificationTitle: string;
  pushNotificationBody: string;
  socialCopy: string;
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
  pushNotificationTitle: '',
  pushNotificationBody: '',
  socialCopy: '',
  players: [],
  teams: [],
  matches: [],
  series: [],
};

/**
 * `12/150` beside a field. For the push and social fields the limit is the one the API
 * enforces, so an over-long value is caught while typing instead of at save.
 */
function CharCount({ value, max, limitIsApi }: { value: string; max: number; limitIsApi?: boolean }) {
  const length = value.trim().length;
  const over = length > max;
  return (
    <span
      className="text-xs tabular-nums"
      style={{ color: over ? 'var(--admin-danger)' : 'var(--admin-text-muted)' }}
      title={limitIsApi ? 'The API rejects anything longer' : 'Search results truncate around this length'}
    >
      {length}/{max}
    </span>
  );
}

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

  /**
   * Whether the byline is the author profile's name rather than something a writer typed.
   * A typed byline is never overwritten when the profile changes; an auto one follows it.
   */
  const bylineAutoRef = useRef(true);

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
            pushNotificationTitle: article.pushNotificationTitle || '',
            pushNotificationBody: article.pushNotificationBody || '',
            socialCopy: article.socialCopy || '',
            players: [],
            teams: [],
            matches: [],
            series: [],
          });
          // A byline already on the article is a writer's choice, not an auto-filled one.
          bylineAutoRef.current = !(article.author || '').trim();
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

  /** Picking an author profile fills the byline, unless the writer typed their own. */
  const selectAuthorProfile = (authorId: string) => {
    const profile = authors.find((row) => row.id === authorId);
    setForm((f) => {
      const next = bylineForProfile(profile?.name ?? '', f.author, bylineAutoRef.current);
      bylineAutoRef.current = next.isAuto;
      return { ...f, authorId, author: next.byline };
    });
  };

  const titleWordCount = countWords(form.title);
  // Drives the character counters and the wording of the save-time toast.
  const errors = useMemo(() => validateNewsDraft(form), [form]);
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

  const searchPlayers = useCallback(async (q: string, signal?: AbortSignal): Promise<EntityChoice[]> => {
    const res = await searchAll(q, signal);
    return res.players
      .map((player) => ({
        id: String(player.id || player.playerId || ''),
        label: player.name || player.fullName || String(player.id || ''),
      }))
      .filter((row) => row.id);
  }, []);

  const searchTeams = useCallback(async (q: string, signal?: AbortSignal): Promise<EntityChoice[]> => {
    const res = await searchAll(q, signal);
    return res.teams
      .map((team) => ({
        id: String(team.id || team.teamId || ''),
        label: team.name || team.shortName || String(team.id || ''),
      }))
      .filter((row) => row.id);
  }, []);

  const searchMatches = useCallback(
    (q: string, signal?: AbortSignal) => searchLinkedMatches(q, signal),
    [],
  );

  const searchSeries = useCallback(async (q: string, signal?: AbortSignal): Promise<EntityChoice[]> => {
    const res = await searchAll(q, signal);
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
    // One validator decides what is wrong and supplies the wording, so the toast can
    // never describe a different problem from the one the API would reject.
    const blocking = blockingNewsFields(errors);
    if (blocking.length) {
      toast.error(
        blocking.map(({ field }) => errors[field]).filter(Boolean).join(' '),
        { duration: 5000 },
      );
      return;
    }

    setSaving(true);
    const payload = buildNewsPayload(form, publish);

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
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/admin/news"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
            title="Back to News"
          >
            <ArrowLeft size={14} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold" style={{ color: 'var(--admin-text)' }}>
              {isTranslate ? `Create ${form.language === 'ur' ? 'Urdu' : 'English'} translation` : mode === 'create' ? 'Create News' : 'Edit News'}
            </h1>
            <p className="break-words text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              {isTranslate
                ? 'Headline, summary and body are machine-translated. Review the Urdu, then save. Slug stays blank so it stays unique.'
                : mode === 'create'
                  ? 'Write cricket news with rich formatting'
                  : `Editing news #${id?.slice(0, 8)}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'edit' && id && !hasOtherTranslation ? (
            <Link
              href={`/admin/news/new?translateFrom=${id}`}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-colors"
              style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
            >
              <Languages size={12} className="shrink-0" />
              Create {form.language === 'ur' ? 'English' : 'Urdu'} translation
            </Link>
          ) : null}
          <button
            type="button"
            disabled={saving}
            onClick={() => submit(false)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
          >
            {saving ? <Loader2 size={12} className="shrink-0 animate-spin" /> : <Save size={12} className="shrink-0" />}
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => submit(true)}
            className="btn-brand inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="shrink-0 animate-spin" /> : <Send size={12} className="shrink-0" />}
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
          <div className="rounded-lg p-3 sm:p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--admin-text)' }}>
                <Tag size={12} className="shrink-0" style={{ color: 'var(--admin-accent)' }} /> Category
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
          <div className="rounded-lg p-3 sm:p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2" style={{ color: 'var(--admin-text)' }}>
              <ImageIcon size={12} className="shrink-0" style={{ color: 'var(--admin-accent)' }} /> Cover Image
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

          <div className="rounded-lg p-3 space-y-3 sm:p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>Author profile</label>
              <AdminSelect value={form.authorId} onChange={(e) => selectAuthorProfile(e.target.value)}>
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
                <AdminInput
                  type="text"
                  value={form.author}
                  onChange={(e) => {
                    bylineAutoRef.current = false;
                    set('author', e.target.value);
                  }}
                  placeholder="PakCricZone Editorial"
                  style={{ paddingLeft: '2rem' }}
                />
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                {bylineAutoRef.current && form.author
                  ? 'Filled from the author profile. Type here to override it.'
                  : 'Shown on the article. Blank credits the author profile.'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--admin-text-secondary)' }}>Source</label>
              <div className="relative">
                <Globe size={12} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
                <AdminInput type="text" value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="PCB / ICC" style={{ paddingLeft: '2rem' }} />
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                Shown beside the byline on the article. Blank hides it.
              </p>
            </div>
          </div>

          <div className="rounded-lg p-3 space-y-3 sm:p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
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

          <div className="rounded-lg p-3 space-y-3 sm:p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--admin-text)' }}>
              <Search size={12} className="shrink-0" style={{ color: 'var(--admin-accent)' }} /> SEO
            </p>
            <AdminField label="SEO title">
              <AdminInput value={form.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} placeholder={placeholders.metaTitle} {...copyField} />
              <div className="mt-1 flex justify-end">
                <CharCount value={form.metaTitle} max={NEWS_META_TITLE_SUGGESTED} />
              </div>
            </AdminField>
            <AdminField label="SEO description">
              <AdminInput value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} placeholder={placeholders.metaDescription} {...copyField} />
              <div className="mt-1 flex justify-end">
                <CharCount value={form.metaDescription} max={NEWS_META_DESCRIPTION_SUGGESTED} />
              </div>
            </AdminField>
            <AdminField label="Canonical URL">
              <AdminInput value={form.canonicalUrl} onChange={(e) => set('canonicalUrl', e.target.value)} placeholder="https://…" />
            </AdminField>
            {/* What a reader will actually see in a result, using the same fallbacks the
                published page applies when the meta fields are blank. */}
            <div className="rounded-md p-3" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-bg)' }}>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                Search preview
              </p>
              <p className="truncate text-sm font-medium" style={{ color: 'var(--color-brand)' }} title={form.metaTitle.trim() || form.title.trim() || 'Headline appears here'}>
                {form.metaTitle.trim() || form.title.trim() || 'Headline appears here'}
              </p>
              <p className="break-all text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                {form.canonicalUrl.trim() ||
                  `cricapp.com/${form.language === 'ur' ? 'ur/' : ''}news/${form.slug || slugifyNews(form.title) || '…'}`}
              </p>
              <p className="mt-1 line-clamp-2 break-words text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
                {form.metaDescription.trim() || form.summary.trim() || 'Meta description appears here. Leave it blank and the summary is used.'}
              </p>
            </div>
          </div>

          {/* Push and social copy. The API has stored these columns all along, but the
              editor had no way to fill them, so they were always sent empty. */}
          <div className="rounded-lg p-3 space-y-3 sm:p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--admin-text)' }}>
              <Bell size={12} className="shrink-0" style={{ color: 'var(--admin-accent)' }} /> Push &amp; Social
            </p>
            <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Draft copy stored with the article for a later push or social post. Leave blank to skip it.
            </p>
            <AdminField label="Push title">
              <AdminInput value={form.pushNotificationTitle} onChange={(e) => set('pushNotificationTitle', e.target.value)} placeholder="Short line for the notification" {...copyField} />
              <div className="mt-1 flex justify-end">
                <CharCount value={form.pushNotificationTitle} max={NEWS_PUSH_TITLE_MAX} limitIsApi />
              </div>
            </AdminField>
            <AdminField label="Push body">
              <AdminInput value={form.pushNotificationBody} onChange={(e) => set('pushNotificationBody', e.target.value)} placeholder="One or two lines of detail" {...copyField} />
              <div className="mt-1 flex justify-end">
                <CharCount value={form.pushNotificationBody} max={NEWS_PUSH_BODY_MAX} limitIsApi />
              </div>
            </AdminField>
            <AdminField label="Social copy">
              <AdminInput value={form.socialCopy} onChange={(e) => set('socialCopy', e.target.value)} placeholder="Caption for the social post" {...copyField} />
              <div className="mt-1 flex justify-end">
                <CharCount value={form.socialCopy} max={NEWS_SOCIAL_COPY_MAX} limitIsApi />
              </div>
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

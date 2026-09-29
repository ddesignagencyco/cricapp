'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { AdminSearchField } from './AdminShared';

export interface EntityChoice {
  id: string;
  label: string;
}

type EntitySearch = (_query: string, _signal?: AbortSignal) => Promise<EntityChoice[]>;

interface Props {
  label: string;
  hint: string;
  values: EntityChoice[];
  onChange: (_next: EntityChoice[]) => void;
  search: EntitySearch;
}

const DEBOUNCE_MS = 280;

type Phase = 'idle' | 'loading' | 'error';

export default function EntityIdPicker({ label, hint, values, onChange, search }: Props) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<EntityChoice[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  /**
   * Bumped on every keystroke. A response whose id no longer matches the current
   * one is dropped, so a slow early request can never overwrite a faster later one.
   */
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    requestId.current += 1;
    const current = requestId.current;
    const isStale = () => current !== requestId.current;

    if (!q) {
      setHits([]);
      setPhase('idle');
      return;
    }

    setPhase('loading');
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      search(q, controller.signal)
        .then((rows) => {
          if (isStale()) return;
          setHits(rows);
          setPhase('idle');
        })
        .catch((err: unknown) => {
          if (isStale() || controller.signal.aborted) return;
          if ((err as { name?: string } | null)?.name === 'AbortError') return;
          setHits([]);
          setPhase('error');
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, search]);

  const add = (item: EntityChoice) => {
    if (values.some((row) => row.id === item.id)) return;
    onChange([...values, item]);
    setQuery('');
    setHits([]);
    setPhase('idle');
  };

  const addRaw = () => {
    const id = query.trim();
    if (!id) return;
    add({ id, label: id });
  };

  const showNoMatches = phase === 'idle' && query.trim().length > 0 && hits.length === 0;

  return (
    <div>
      <p className="mb-1 text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>{label}</p>
      {values.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {values.map((item) => (
            <li key={item.id}>
              <span
                className="inline-flex max-w-full items-center gap-1 rounded px-2 py-1 text-xs font-medium"
                style={{
                  background: 'var(--admin-input-bg)',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{item.id}</span>
                  {item.label && item.label !== item.id ? (
                    <span className="block truncate text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
                      {item.label}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(values.filter((row) => row.id !== item.id))}
                  aria-label={`Remove ${item.id}`}
                  className="grid h-4 w-4 shrink-0 place-items-center rounded"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  <X size={11} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-1.5">
        <AdminSearchField
          wrapperClassName="min-w-0 flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              // Only ever pick from a settled result list. Previously this fell back to
              // writing the raw typed text as an id, which the API then rejected on save.
              if (phase !== 'loading' && hits[0]) add(hits[0]);
            }
          }}
          placeholder={hint || 'Search by name'}
        />
        <button
          type="button"
          onClick={addRaw}
          disabled={!query.trim()}
          className="shrink-0 rounded-md px-2.5 text-xs font-semibold disabled:opacity-50"
          style={{
            background: 'var(--admin-input-bg)',
            color: 'var(--admin-accent)',
            border: '1px solid var(--admin-border)',
          }}
        >
          Add id
        </button>
      </div>
      {/*
        The list stays mounted while a newer search is in flight. Hiding it on
        `loading` made the dropdown blink out for the whole debounce + network
        round trip on every keystroke.
      */}
      {hits.length > 0 && (
        <ul
          role="listbox"
          aria-label={`${label} results`}
          className="mt-1 max-h-40 overflow-auto rounded-md"
          style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-input-bg)' }}
        >
          {hits.map((hit) => (
            <li key={hit.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => add(hit)}
                className="flex w-full flex-col items-start px-2.5 py-1.5 text-left text-xs hover:opacity-80"
                style={{ color: 'var(--admin-text)' }}
              >
                <span className="font-semibold">{hit.label}</span>
                <span style={{ color: 'var(--admin-text-muted)' }}>{hit.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {phase === 'loading' && (
        <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>Searching…</p>
      )}
      {phase === 'error' && (
        <p role="alert" className="mt-1 text-xs font-semibold" style={{ color: 'var(--admin-danger, #dc2626)' }}>
          Search failed. Check your connection and try again.
        </p>
      )}
      {showNoMatches && (
        <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          No matches. Use “Add id” to link a known id.
        </p>
      )}
    </div>
  );
}

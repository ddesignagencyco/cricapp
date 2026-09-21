'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AdminInput } from './AdminShared';

export interface EntityChoice {
  id: string;
  label: string;
}

interface Props {
  label: string;
  hint: string;
  values: EntityChoice[];
  onChange: (_next: EntityChoice[]) => void;
  search: (_query: string) => Promise<EntityChoice[]>;
}

export default function EntityIdPicker({ label, hint, values, onChange, search }: Props) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<EntityChoice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      search(q)
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  const add = (item: EntityChoice) => {
    if (values.some((row) => row.id === item.id)) return;
    onChange([...values, item]);
    setQuery('');
    setHits([]);
  };

  const addRaw = () => {
    const id = query.trim();
    if (!id) return;
    add({ id, label: id });
  };

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
        <AdminInput
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (hits[0]) add(hits[0]);
              else addRaw();
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
      {loading && (
        <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>Searching…</p>
      )}
      {!loading && hits.length > 0 && (
        <ul
          className="mt-1 max-h-40 overflow-auto rounded-md"
          style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-input-bg)' }}
        >
          {hits.map((hit) => (
            <li key={hit.id}>
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
    </div>
  );
}

/**
 * Share text for a tool result.
 *
 * The old behaviour copied `window.location.href`, so opening a tool from the
 * menu shared an empty calculator — the recipient saw the form, not the answer.
 * The shared text now leads with the number, and the inputs travel in the query
 * string so the recipient's copy of the page reopens already filled in where the
 * tool reads them.
 */

export type ShareInput = { label: string; value: string };

/** Values a reader should never see pasted into a public message. */
const SECRET_HINT = /(password|token|secret|api[-_ ]?key|authorization)/i;

const NOT_READY = new Set(['', '—', '–', '…', 'loading', 'n/a', 'null', 'undefined']);

export function isShareableValue(value: unknown): boolean {
  const text = String(value ?? '').trim();
  if (!text) return false;
  if (NOT_READY.has(text.toLowerCase())) return false;
  // A not-out marker or a dash is a real value ("not out"), keep it.
  return true;
}

export function cleanInputs(inputs: ShareInput[] = []): ShareInput[] {
  return inputs
    .map((row) => ({ label: String(row.label ?? '').trim(), value: String(row.value ?? '').trim() }))
    .filter((row) => row.label && row.value && isShareableValue(row.value) && !SECRET_HINT.test(row.label));
}

/**
 * The shared card. Plain text with a rule between the answer and the inputs,
 * because it has to survive WhatsApp, X, and a plain SMS.
 *
 *   🏏 DLS Calculator
 *   New target: 145
 *
 *   Overs available: 20 · Target: 160
 *   👉 pakcriczone.com/tools/dls
 */
export function buildShareText(options: {
  toolTitle: string;
  label: string;
  value: string;
  url?: string;
  inputs?: ShareInput[];
  siteName?: string;
}): string {
  const title = options.toolTitle.trim() || 'Cricket tool';
  const label = options.label.trim() || 'Result';
  const value = options.value.trim();
  const lines: string[] = [];

  lines.push(`🏏 ${title}`);
  lines.push(`${label}: ${value}`);

  const rows = cleanInputs(options.inputs);
  if (rows.length > 0) {
    lines.push('');
    lines.push(rows.map((row) => `${row.label}: ${row.value}`).join(' · '));
  }

  const url = (options.url ?? '').trim();
  if (url) {
    lines.push('');
    lines.push(`👉 ${url}`);
  }
  return lines.join('\n');
}

/**
 * The tool page with the inputs in the query string, so the link is not a blank
 * form. Keys are lowercased and de-spaced so they are predictable, and any
 * value the page did not already have is simply ignored by tools that do not
 * read it.
 */
export function buildResultUrl(base: string, toolSlug: string, inputs: ShareInput[] = []): string {
  const rows = cleanInputs(inputs);
  if (rows.length === 0) return base;
  const params = new URLSearchParams();
  rows.forEach((row) => {
    const key = row.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (key) params.set(key, row.value);
  });
  const qs = params.toString();
  if (!qs) return base;
  return base.includes('?') ? `${base}&${qs}` : `${base}?${qs}`;
}

/** Short, human label for a share sheet title. */
export function shareSheetTitle(toolTitle: string, label: string): string {
  const label2 = label.trim() || 'Result';
  return `${toolTitle.trim() || 'Cricket tool'} — ${label2}`;
}

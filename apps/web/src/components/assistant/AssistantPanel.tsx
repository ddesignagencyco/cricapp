'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { ApiError } from '../../services/api/client';
import { askAssistant, type AssistantAskBody, type AssistantAskResponse } from '../../services/assistant';
import {
  assistantRequestSlots,
  assistantSessionId,
  localAssistantReply,
  normalizeAssistantQuestion,
  type AssistantPageContext,
} from '../../lib/assistant';
import AnswerBoard from './AnswerBoard';
import SourceChips from './SourceChips';
import UnavailableBanner from './UnavailableBanner';

type ChatItem =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string; reply?: AssistantAskResponse; error?: boolean };

function failMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    return 'Too many questions just now. Try again shortly.';
  }
  if (error instanceof ApiError && error.status >= 500) {
    return 'The assistant is unavailable. No stats were invented.';
  }
  return 'Could not reach the assistant. Check your connection and try again.';
}

export default function AssistantPanel({
  open,
  onClose,
  context,
}: {
  open: boolean;
  onClose: () => void;
  context: AssistantPageContext;
}) {
  const trapRef = useFocusTrap<HTMLDivElement>(open);
  const listRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<ChatItem[]>([]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [items, busy]);

  const send = async (question: string, extra?: Pick<AssistantAskBody, 'intent'>) => {
    const text = question.trim();
    if (!text || busy) return;
    setInput('');
    setItems((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text }]);
    const local = localAssistantReply(text);
    if (local) {
      setItems((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: local }]);
      return;
    }
    setBusy(true);
    try {
      const normalized = normalizeAssistantQuestion(text);
      const reply = await askAssistant({
        question: normalized,
        sessionId: assistantSessionId(),
        ...assistantRequestSlots(context.slots, extra, normalized),
      });
      setItems((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: reply.answerText, reply },
      ]);
    } catch (error) {
      setItems((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: failMessage(error), error: true },
      ]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const lastReply = [...items].reverse().find((item) => item.role === 'assistant' && item.reply);
  const followUps =
    lastReply && lastReply.role === 'assistant' ? lastReply.reply?.followUpPrompts ?? [] : context.starters.map((s) => s.question);

  return (
    <div className="fixed inset-0 z-[60]">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="Close assistant" onClick={onClose} />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-title"
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 flex h-[min(92dvh,calc(100dvh-env(safe-area-inset-top,0px)))] max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top,0px)))] flex-col overflow-hidden overscroll-contain rounded-t-3xl border border-lborder bg-card shadow-2xl sm:inset-auto sm:bottom-6 sm:right-4 sm:h-[min(42rem,calc(100vh-4.5rem))] sm:w-[min(32rem,calc(100vw-2rem))] sm:max-h-none sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-lborder px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-accent text-white shadow-sm">
              <Sparkles size={16} />
            </span>
            <div>
              <h2 id="assistant-title" className="text-sm font-black tracking-tight text-mtext">
                Cricket assistant
              </h2>
              <p className="text-[11px] text-stext">Stored stats only · no invented numbers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-stext hover:bg-secondary hover:text-mtext"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
          {items.length === 0 ? (
            <div className="rounded-2xl bg-secondary/70 px-3 py-3 ring-1 ring-lborder">
              <p className="text-sm leading-relaxed text-mtext">
                Ask a stored question — two team names, two players, or the PSL cutoff.
              </p>
            </div>
          ) : null}

          {items.map((item) =>
            item.role === 'user' ? (
              <div key={item.id} className="flex justify-end">
                <p className="max-w-[88%] rounded-2xl btn-brand px-3 py-2 text-sm font-medium leading-snug">{item.text}</p>
              </div>
            ) : (
              <div key={item.id} className="max-w-[96%] space-y-2">
                <p
                  className={`whitespace-pre-wrap text-sm leading-relaxed ${
                    item.error ? 'rounded-2xl bg-danger-soft px-3 py-2 text-danger' : 'text-mtext'
                  }`}
                >
                  {item.text}
                </p>
                {item.reply ? (
                  <>
                    {item.reply.llmNarrative ? (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stext">Narrative from stored facts</p>
                    ) : null}
                    <AnswerBoard reply={item.reply} />
                    <UnavailableBanner items={item.reply.unavailable} answerText={item.text} />
                    <SourceChips sources={item.reply.sources} />
                  </>
                ) : null}
              </div>
            ),
          )}

          {busy ? (
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-stext">
              <Loader2 size={14} className="animate-spin text-accent" />
              Reading stored stats…
            </p>
          ) : null}
        </div>

        {followUps.length > 0 && !busy ? (
          <div className="flex shrink-0 gap-1.5 overflow-x-auto border-t border-lborder px-4 py-2">
            {followUps.slice(0, 3).map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-mtext ring-1 ring-lborder hover:text-accent"
              >
                {prompt.length > 42 ? `${prompt.slice(0, 40)}…` : prompt}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="flex shrink-0 gap-2 border-t border-lborder p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <label className="sr-only" htmlFor="assistant-question">
            Question
          </label>
          <input
            id="assistant-question"
            value={input}
            onChange={(event) => setInput(event.target.value.slice(0, 2000))}
            placeholder="Lahore vs Karachi, or two player names"
            disabled={busy}
            className="h-11 min-w-0 flex-1 rounded-2xl border border-input-border bg-input px-3 text-sm text-mtext outline-none focus:border-focus-ring"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="btn-brand grid h-11 w-11 shrink-0 place-items-center rounded-2xl disabled:cursor-default disabled:opacity-40"
            aria-label="Send"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}

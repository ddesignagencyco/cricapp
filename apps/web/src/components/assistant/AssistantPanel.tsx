'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import CricketBallIcon from './CricketBallIcon';
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
  | { id: string; role: 'user'; text: string; at: number }
  | { id: string; role: 'assistant'; text: string; at: number; reply?: AssistantAskResponse; error?: boolean };

function formatMessageTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function BallAvatar() {
  return (
    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-brand-fg">
      <CricketBallIcon size={14} strokeWidth={2.4} />
    </span>
  );
}

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
    setItems((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text, at: Date.now() }]);
    const local = localAssistantReply(text);
    if (local) {
      setItems((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: local, at: Date.now() }]);
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
        { id: crypto.randomUUID(), role: 'assistant', text: reply.answerText, at: Date.now(), reply },
      ]);
    } catch (error) {
      setItems((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: failMessage(error), at: Date.now(), error: true },
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
    <div className="fixed inset-0 z-[80]">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="Close assistant" onClick={onClose} />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-title"
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 flex h-[min(92dvh,calc(100dvh-env(safe-area-inset-top,0px)))] max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top,0px)))] flex-col overflow-hidden overscroll-contain rounded-t-[1.75rem] border border-lborder bg-card shadow-2xl sm:inset-auto sm:bottom-24 sm:right-4 sm:h-[min(40rem,calc(100vh-7.5rem))] sm:w-[min(24rem,calc(100vw-2rem))] sm:max-h-none sm:rounded-[1.75rem]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 bg-brand px-5 py-3 text-brand-fg">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-brand">
              <CricketBallIcon size={18} strokeWidth={2.25} />
            </span>
            <div>
              <h2 id="assistant-title" className="text-[15px] font-semibold tracking-tight text-brand-fg">
                PCZ Assistant
              </h2>
              <p className="flex items-center gap-1.5 text-[12px] text-brand-fg/80">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                Online
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-brand-fg/85 hover:bg-white/10 hover:text-brand-fg"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div ref={listRef} className="native-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-card px-4 py-4">
          {items.length === 0 ? (
            <div className="flex items-start gap-2">
              <BallAvatar />
              <p className="w-fit max-w-[88%] rounded-[1.15rem] bg-secondary px-3.5 py-2 text-sm leading-relaxed text-mtext">
                Ask about matches, players, or news.
              </p>
            </div>
          ) : null}

          {items.map((item) =>
            item.role === 'user' ? (
              <div key={item.id} className="ml-auto flex w-fit max-w-[80%] flex-col items-end">
                <p className="rounded-[1.15rem] bg-secondary px-3.5 py-2 text-sm font-medium leading-snug text-mtext">
                  {item.text}
                </p>
                <time className="mt-1 text-right text-[11px] text-stext" dateTime={new Date(item.at).toISOString()}>
                  {formatMessageTime(item.at)}
                </time>
              </div>
            ) : (
              <div key={item.id} className="flex items-start gap-2">
                <BallAvatar />
                <div className="min-w-0 flex-1 space-y-2">
                  <p
                    className={`w-fit max-w-full whitespace-pre-wrap rounded-[1.15rem] px-3.5 py-2 text-sm leading-relaxed ${
                      item.error ? 'bg-danger-soft text-danger' : 'bg-secondary text-mtext'
                    }`}
                  >
                    {item.text}
                  </p>
                  {item.reply ? (
                    <div className="overflow-hidden rounded-[1.15rem] bg-card ring-1 ring-lborder">
                      {item.reply.llmNarrative ? (
                        <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-stext">
                          Narrative from stored facts
                        </p>
                      ) : null}
                      <div className="p-1">
                        <AnswerBoard reply={item.reply} />
                      </div>
                      <div className="px-3 pb-2">
                        <UnavailableBanner items={item.reply.unavailable} answerText={item.text} />
                        <SourceChips sources={item.reply.sources} />
                      </div>
                    </div>
                  ) : null}
                  <time className="block text-left text-[11px] text-stext" dateTime={new Date(item.at).toISOString()}>
                    {formatMessageTime(item.at)}
                  </time>
                </div>
              </div>
            ),
          )}

          {busy ? (
            <div className="flex items-center gap-2">
              <BallAvatar />
              <p className="inline-flex items-center gap-2 text-xs font-semibold text-stext">
                <Loader2 size={14} className="animate-spin" />
                Reading stored stats…
              </p>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 bg-card px-5 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-2">
          {followUps.length > 0 && !busy ? (
            <div className="mb-3 flex gap-2 overflow-x-auto overscroll-x-contain py-0.5 [-ms-overflow-style:auto] [scrollbar-width:thin]">
              {followUps.slice(0, 3).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void send(prompt)}
                  className="shrink-0 whitespace-nowrap rounded-[9999px] border border-lborder bg-card px-4 py-2 text-xs font-medium leading-none text-mtext hover:bg-secondary"
                >
                  {prompt.length > 42 ? `${prompt.slice(0, 40)}…` : prompt}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="relative"
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
              placeholder="Ask about matches, players, news..."
              disabled={busy}
              className="h-12 w-full rounded-full border border-input-border bg-input py-2 pl-4 pr-12 text-sm text-mtext outline-none placeholder:text-stext focus:border-focus-ring"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-brand disabled:cursor-default disabled:opacity-40"
              aria-label="Send"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
          <p className="mt-1.5 text-center text-[11px] text-stext">Scores may be delayed.</p>
        </div>
      </div>
    </div>
  );
}

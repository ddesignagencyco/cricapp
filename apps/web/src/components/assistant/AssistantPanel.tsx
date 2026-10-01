'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Bot, Check, Copy, Eraser, Loader2, Send, X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { ApiError } from '../../services/api/client';
import { askAssistant, type AssistantAskBody, type AssistantAskResponse } from '../../services/assistant';
import {
  assistantClipboardText,
  assistantRequestSlots,
  assistantSessionId,
  copyToClipboard,
  localAssistantReply,
  normalizeAssistantQuestion,
  type AssistantPageContext,
  type AssistantStarter,
} from '../../lib/assistant';
import AnswerBoard from './AnswerBoard';
import SourceChips from './SourceChips';
import UnavailableBanner from './UnavailableBanner';
import VerifiedDetails from './VerifiedDetails';

type ChatItem =
  | { id: string; role: 'user'; text: string; at: number }
  | { id: string; role: 'assistant'; text: string; at: number; reply?: AssistantAskResponse; error?: boolean };

function formatMessageTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function AssistantBusyBubble() {
  return (
    <div className="flex w-fit max-w-[88%] flex-col items-start">
      <p className="inline-flex items-center gap-2 rounded-[1.15rem] bg-secondary px-3.5 py-2 text-xs font-semibold text-stext">
        <Loader2 size={14} className="animate-spin" aria-hidden />
        Reading stored stats…
      </p>
    </div>
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

/** How close to the bottom still counts as "following along" when new text lands. */
const STICK_THRESHOLD_PX = 64;

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);

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

/** Only auto-scroll while the reader is already at the bottom, so a new answer
 *  never yanks the view away from something they scrolled back to read. */
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const node = listRef.current;
    if (!node) return;
    // `scrollTo` is the only smooth option but is absent in jsdom and in very old
    // browsers; `scrollTop` is the universally supported fallback.
    if (typeof node.scrollTo === 'function') {
      node.scrollTo({ top: node.scrollHeight, behavior });
    } else {
      node.scrollTop = node.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (atBottom) scrollToBottom('smooth');
  }, [items, busy, atBottom, scrollToBottom]);

  useEffect(() => {
    if (copiedId === null) return;
    const timer = window.setTimeout(() => setCopiedId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedId]);

  const handleListScroll = () => {
    const node = listRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    setAtBottom(distance <= STICK_THRESHOLD_PX);
  };

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

  const copyAnswer = async (item: Extract<ChatItem, { role: 'assistant' }>) => {
    if (!item.reply) return;
    const ok = await copyToClipboard(
      assistantClipboardText({
        question: item.reply.question,
        answerText: item.text,
        sources: item.reply.sources ?? [],
      }),
    );
    if (ok) {
      setCopiedId(item.id);
      toast.success('Answer copied');
    } else {
      toast.error('Could not copy the answer');
    }
  };

  const clearThread = () => {
    setItems([]);
    setCopiedId(null);
  };

  if (!open) return null;

  const lastReply = [...items].reverse().find((item) => item.role === 'assistant' && item.reply);
  // Before the first question the page context supplies labelled chips; after it,
  // the API supplies follow-up sentences.
  const starters: AssistantStarter[] =
    lastReply && lastReply.role === 'assistant' && lastReply.reply?.followUpPrompts?.length
      ? lastReply.reply.followUpPrompts.map((question) => ({ label: question, question }))
      : context.starters;
  const followUps = starters.slice(0, 3);

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
        <header className="pcz-assistant-head flex shrink-0 items-center justify-between gap-3 px-5 py-3 text-brand-fg">
          <div className="flex items-center gap-3">
            <span className="pcz-assistant-head__badge grid h-9 w-9 place-items-center rounded-full text-brand">
              <Bot size={20} strokeWidth={2.15} aria-hidden />
            </span>
            <div>
              <h2 id="assistant-title" className="text-[15px] font-semibold tracking-tight">
                PCZ Assistant
              </h2>
              <p className="flex items-center gap-1.5 text-[12px] text-brand-fg/85">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden />
                Answers from stored stats only
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={clearThread}
              disabled={items.length === 0}
              className="grid h-8 w-8 place-items-center rounded-full text-brand-fg/85 hover:bg-white/15 hover:text-brand-fg disabled:opacity-35 disabled:hover:bg-transparent"
              aria-label="Clear conversation"
            >
              <Eraser size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full text-brand-fg/85 hover:bg-white/15 hover:text-brand-fg"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div
          ref={listRef}
          onScroll={handleListScroll}
          className="native-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-card px-4 py-4"
        >
          {items.length === 0 ? (
            <div className="space-y-3">
              <p className="w-fit max-w-[88%] rounded-[1.15rem] bg-secondary px-3.5 py-2 text-sm leading-relaxed text-mtext">
                Ask in your own words, or tap one of the questions below.
              </p>
              <ul className="space-y-1.5 text-xs leading-relaxed text-stext">
                <li>These are the phrasings I understand best:</li>
                <li>
                  <span className="text-mtext">&ldquo;A vs B head to head&rdquo;</span> — two named teams
                </li>
                <li>
                  <span className="text-mtext">&ldquo;Compare players X vs Y&rdquo;</span> — two named players
                </li>
                <li>
                  <span className="text-mtext">&ldquo;How has X been in PSL 2026?&rdquo;</span> — recent form
                </li>
                <li>
                  <span className="text-mtext">&ldquo;Can X make the PSL 2026 playoffs?&rdquo;</span> — qualification
                </li>
                <li>I only answer from stored results, head-to-heads, standings and leaderboards. Anything not in our data, I say so rather than guess.</li>
              </ul>
            </div>
          ) : null}

          {items.map((item) =>
            item.role === 'user' ? (
              <div key={item.id} className="ml-auto flex w-fit max-w-[80%] flex-col items-end">
                <p className="pcz-assistant-bubble-user rounded-[1.15rem] px-3.5 py-2 text-sm font-medium leading-snug">
                  {item.text}
                </p>
                <time className="mt-1 text-right text-[11px] text-stext" dateTime={new Date(item.at).toISOString()}>
                  {formatMessageTime(item.at)}
                </time>
              </div>
            ) : (
              <div key={item.id} className="flex w-fit max-w-[88%] flex-col items-start space-y-2">
                <div className="flex w-full items-start gap-2">
                  <p
                    className={`w-fit max-w-full whitespace-pre-wrap rounded-[1.15rem] px-3.5 py-2 text-sm leading-relaxed ${
                      item.error ? 'bg-danger-soft text-danger' : 'bg-secondary text-mtext'
                    }`}
                  >
                    {item.text}
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyAnswer(item)}
                    className="mt-0.5 shrink-0 rounded p-1 text-stext transition-colors hover:bg-secondary hover:text-mtext"
                    aria-label="Copy answer"
                  >
                    {copiedId === item.id ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                  </button>
                </div>
                {item.reply ? (
                  <div className="w-full overflow-hidden rounded-[1.15rem] bg-card ring-1 ring-lborder">
                    {item.reply.llmNarrative ? (
                      <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-stext">
                        Narrative from stored facts
                      </p>
                    ) : null}
                    <div className="p-1">
                      <AnswerBoard reply={item.reply} />
                    </div>
                    <div className="space-y-1 px-3 pb-2">
                      <UnavailableBanner items={item.reply.unavailable} answerText={item.text} />
                      <VerifiedDetails reply={item.reply} />
                      <SourceChips sources={item.reply.sources} />
                    </div>
                  </div>
                ) : null}
                <time className="text-left text-[11px] text-stext" dateTime={new Date(item.at).toISOString()}>
                  {formatMessageTime(item.at)}
                </time>
              </div>
            ),
          )}

          {busy ? <AssistantBusyBubble /> : null}
        </div>

        {!atBottom && !busy ? (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className="mx-auto -mt-1 mb-1 shrink-0 rounded-full bg-elevated px-3 py-1 text-[11px] font-bold text-stext shadow-sm ring-1 ring-lborder hover:text-mtext"
          >
            Jump to latest
          </button>
        ) : null}

        <div className="shrink-0 bg-card px-5 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-2">
          {/*
            Chips show the full question, never a shortened label. The point of a
            suggested question is that the user learns the phrasing the assistant
            understands, and "Explain the live %" teaches nothing about that. They
            wrap onto multiple lines instead of truncating or scrolling sideways,
            because a chip you have to scroll to finish reading is not a prompt.
          */}
          {followUps.length > 0 && !busy ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {followUps.map((starter) => (
                <button
                  key={starter.question}
                  type="button"
                  onClick={() => void send(starter.question, starter.intent ? { intent: starter.intent } : undefined)}
                  className="max-w-full rounded-[9999px] border border-lborder bg-card px-4 py-2 text-left text-xs font-medium leading-snug text-mtext transition-colors hover:bg-secondary"
                >
                  {starter.question}
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
              placeholder="Ask about matches, players, standings..."
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
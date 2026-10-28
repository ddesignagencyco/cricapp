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

function BotAvatar({ size = 28 }: { size?: number }) {
  return (
    <span
      className="pcz-chat-avatar grid shrink-0 place-items-center rounded-full text-brand-fg"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Bot size={Math.round(size * 0.55)} strokeWidth={2.2} />
    </span>
  );
}

/** "Typing" bubble while an answer is on its way, as chat agents show it. */
function AssistantBusyBubble() {
  return (
    <div className="flex items-end gap-2">
      <BotAvatar />
      <div className="pcz-chat-bubble-bot flex items-center gap-1 rounded-2xl rounded-bl-md px-4 py-3" role="status">
        <span className="sr-only">Reading stored stats…</span>
        <span className="pcz-chat-typing" />
        <span className="pcz-chat-typing" />
        <span className="pcz-chat-typing" />
      </div>
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
  const isEmpty = items.length === 0;

  const chips = (list: AssistantStarter[]) => (
    <div className="flex flex-wrap gap-2 pl-9">
      {list.map((starter) => (
        <button
          key={starter.question}
          type="button"
          onClick={() => void send(starter.question, starter.intent ? { intent: starter.intent } : undefined)}
          className="pcz-chat-chip max-w-full rounded-full px-3.5 py-1.5 text-left text-[13px] font-medium leading-snug transition-colors"
        >
          {starter.question}
        </button>
      ))}
    </div>
  );

  return (
    <div className="pcz-chat fixed inset-0 z-[80] sm:pointer-events-none">
      {/* Phones dim the page behind a full-screen chat; on wider screens the widget
          floats over the page without dimming it, like a site's support chat. */}
      <button
        type="button"
        className="absolute inset-0 bg-black/45 sm:hidden"
        aria-label="Close assistant"
        onClick={onClose}
      />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-title"
        tabIndex={-1}
        className="pcz-chat-window absolute inset-0 flex flex-col overflow-hidden overscroll-contain bg-card sm:pointer-events-auto sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[min(42rem,calc(100vh-8rem))] sm:w-[25rem] sm:rounded-2xl sm:border sm:border-lborder"
      >
        <header className="pcz-assistant-head shrink-0 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-brand-fg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative shrink-0">
                <span className="pcz-assistant-head__badge grid h-11 w-11 place-items-center rounded-full text-brand">
                  <Bot size={22} strokeWidth={2.15} aria-hidden />
                </span>
                <span className="pcz-chat-online absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 id="assistant-title" className="text-white truncate text-[15px] font-semibold tracking-tight">
                  PCZ Assistant
                </h2>
                <p className="truncate text-xs text-brand-fg/85">Online · Typically replies instantly</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={clearThread}
                disabled={isEmpty}
                className="grid h-9 w-9 place-items-center rounded-full text-brand-fg/85 transition-colors hover:bg-white/15 hover:text-brand-fg disabled:opacity-35 disabled:hover:bg-transparent"
                aria-label="Clear conversation"
                title="New conversation"
              >
                <Eraser size={17} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full text-brand-fg/85 transition-colors hover:bg-white/15 hover:text-brand-fg"
                aria-label="Close"
                title="Close"
              >
                <X size={19} />
              </button>
            </div>
          </div>
        </header>

        <div
          ref={listRef}
          onScroll={handleListScroll}
          className="pcz-chat-body native-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5"
        >
          {/* The agent opens the conversation, as support chats do. */}
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <BotAvatar />
              <div className="pcz-chat-bubble-bot max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed text-mtext">
                <p className="font-semibold">Hi there 👋</p>
                <p className="mt-1 text-stext">
                  I&apos;m the PCZ Assistant. Ask in your own words, or tap one of the questions below.
                </p>
              </div>
            </div>
            {isEmpty && context.starters.length > 0 ? chips(context.starters.slice(0, 4)) : null}
            {isEmpty ? (
              <details className="pcz-chat-tips ml-9 text-xs leading-relaxed text-stext">
                <summary className="cursor-pointer select-none font-semibold text-accent">How to ask</summary>
                <ul className="mt-2 space-y-1.5">
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
              </details>
            ) : null}
          </div>

          {items.map((item) =>
            item.role === 'user' ? (
              <div key={item.id} className="ml-auto flex w-fit max-w-[80%] flex-col items-end">
                <p className="pcz-assistant-bubble-user rounded-2xl rounded-br-md px-4 py-2.5 text-sm font-medium leading-snug">
                  {item.text}
                </p>
                <time className="mt-1 text-[11px] text-stext" dateTime={new Date(item.at).toISOString()}>
                  {formatMessageTime(item.at)}
                </time>
              </div>
            ) : (
              <div key={item.id} className="flex items-start gap-2">
                <span className="mt-auto pb-5">
                  <BotAvatar />
                </span>
                <div className="min-w-0 max-w-[88%] space-y-2">
                  <div
                    className={`rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed ${item.error ? 'bg-danger-soft text-danger' : 'pcz-chat-bubble-bot text-mtext'
                      }`}
                  >
                    <p className="whitespace-pre-wrap">{item.text}</p>
                    {item.reply ? (
                      // Hidden by CSS when every section inside renders nothing — it used
                      // to leave an empty outlined bar under the answer.
                      <div className="pcz-answer-card mt-3 overflow-hidden rounded-xl bg-card ring-1 ring-lborder">
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
                  </div>
                  <div className="flex items-center gap-2 pl-1 text-[11px] text-stext">
                    <span>PCZ Assistant</span>
                    <span aria-hidden>·</span>
                    <time dateTime={new Date(item.at).toISOString()}>{formatMessageTime(item.at)}</time>
                    {item.reply ? (
                      <button
                        type="button"
                        onClick={() => void copyAnswer(item)}
                        className="ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold transition-colors hover:bg-secondary hover:text-mtext"
                        aria-label="Copy answer"
                      >
                        {copiedId === item.id ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
                        {copiedId === item.id ? 'Copied' : 'Copy'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ),
          )}

          {busy ? <AssistantBusyBubble /> : null}

          {/* Follow-up suggestions sit under the latest answer, like quick replies.
              Chips show the full question, never a shortened label: the user learns the
              phrasing the assistant understands. They wrap instead of truncating. */}
          {!isEmpty && followUps.length > 0 && !busy ? chips(followUps) : null}
        </div>

        {!atBottom && !busy ? (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className="mx-auto -mt-11 mb-3 shrink-0 rounded-full bg-elevated px-3 py-1.5 text-[11px] font-bold text-stext shadow-md ring-1 ring-lborder hover:text-mtext"
          >
            Jump to latest
          </button>
        ) : null}

        <div className="shrink-0 border-t border-lborder bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
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
              className="h-12 w-full rounded-full border border-input-border bg-input py-2 pl-5 pr-14 text-sm text-mtext outline-none transition-shadow placeholder:text-stext focus:border-focus-ring focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_18%,transparent)]"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="pcz-chat-send absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-brand-fg transition-opacity disabled:cursor-default disabled:opacity-40"
              aria-label="Send"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="-ml-0.5" />}
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-stext">Answers from stored stats · Scores may be delayed</p>
        </div>
      </div>
    </div>
  );
}

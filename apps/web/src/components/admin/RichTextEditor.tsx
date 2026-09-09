'use client';

import React, { useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Eye,
  Edit3,
  Undo2,
  Redo2,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (_value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeMode, setActiveMode] = useState<'write' | 'preview'>('write');

  // Markdown formatting helper that wraps or prefixes selected text
  const applyFormat = (prefix: string, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || defaultText;

    const before = value.slice(0, start);
    const after = value.slice(end);

    const replacement = `${prefix}${selected}${suffix}`;
    const nextValue = `${before}${replacement}${after}`;

    onChange(nextValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 0);
  };

  const applyLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const before = value.slice(0, start);
    const lastNewline = before.lastIndexOf('\n');
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const nextValue = `${value.slice(0, lineStart)}${prefix} ${value.slice(lineStart)}`;
    onChange(nextValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length + 1, start + prefix.length + 1);
    }, 0);
  };

  const insertLink = () => {
    const url = window.prompt('Enter URL link (e.g. https://example.com):');
    if (!url) return;
    const textarea = textareaRef.current;
    const selected = textarea ? value.slice(textarea.selectionStart, textarea.selectionEnd) : '';
    applyFormat('[', `](${url})`, selected || 'link text');
  };

  const insertImage = () => {
    const url = window.prompt('Enter image URL:');
    if (!url) return;
    const alt = window.prompt('Enter image caption / alt text:', 'Match highlight');
    applyFormat('', `\n\n![${alt || 'Image'}](${url})\n\n`, '');
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-lborder bg-card shadow-sm transition-all focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/10">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-lborder bg-secondary/70 p-2">
        <div className="flex flex-wrap items-center gap-0.5">
          <ToolbarButton
            icon={<Bold size={15} />}
            label="Bold (Ctrl+B)"
            onClick={() => applyFormat('**', '**', 'bold text')}
          />
          <ToolbarButton
            icon={<Italic size={15} />}
            label="Italic (Ctrl+I)"
            onClick={() => applyFormat('*', '*', 'italic text')}
          />
          <ToolbarButton
            icon={<Underline size={15} />}
            label="Underline"
            onClick={() => applyFormat('<u>', '</u>', 'underlined text')}
          />
          <ToolbarButton
            icon={<Strikethrough size={15} />}
            label="Strikethrough"
            onClick={() => applyFormat('~~', '~~', 'strikethrough')}
          />

          <span className="mx-1 h-4 w-[1px] bg-lborder" />

          <ToolbarButton
            icon={<Heading1 size={15} />}
            label="Heading 1"
            onClick={() => applyLinePrefix('#')}
          />
          <ToolbarButton
            icon={<Heading2 size={15} />}
            label="Heading 2"
            onClick={() => applyLinePrefix('##')}
          />
          <ToolbarButton
            icon={<Heading3 size={15} />}
            label="Heading 3"
            onClick={() => applyLinePrefix('###')}
          />

          <span className="mx-1 h-4 w-[1px] bg-lborder" />

          <ToolbarButton
            icon={<List size={15} />}
            label="Bullet List"
            onClick={() => applyLinePrefix('-')}
          />
          <ToolbarButton
            icon={<ListOrdered size={15} />}
            label="Numbered List"
            onClick={() => applyLinePrefix('1.')}
          />
          <ToolbarButton
            icon={<Quote size={15} />}
            label="Blockquote"
            onClick={() => applyLinePrefix('>')}
          />
          <ToolbarButton
            icon={<Code size={15} />}
            label="Inline Code"
            onClick={() => applyFormat('`', '`', 'code')}
          />

          <span className="mx-1 h-4 w-[1px] bg-lborder" />

          <ToolbarButton
            icon={<LinkIcon size={15} />}
            label="Add Link"
            onClick={insertLink}
          />
          <ToolbarButton
            icon={<ImageIcon size={15} />}
            label="Add Image"
            onClick={insertImage}
          />
          <ToolbarButton
            icon={<Minus size={15} />}
            label="Horizontal Divider"
            onClick={() => applyFormat('\n\n---\n\n', '', '')}
          />
        </div>

        {/* View Mode Toggle: Write / Live Preview */}
        <div className="flex items-center gap-1 rounded-xl border border-lborder bg-card p-0.5">
          <button
            type="button"
            onClick={() => setActiveMode('write')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeMode === 'write'
                ? 'bg-accent text-white shadow-sm'
                : 'text-stext hover:text-mtext'
            }`}
          >
            <Edit3 size={13} />
            Write
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('preview')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeMode === 'preview'
                ? 'bg-accent text-white shadow-sm'
                : 'text-stext hover:text-mtext'
            }`}
          >
            <Eye size={13} />
            Preview
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      {activeMode === 'write' ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={14}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || 'Draft your cricket news story with formatting, headlines, and quotes…'}
            className="w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed text-mtext placeholder:text-stext/60 outline-none"
          />
          <div className="flex items-center justify-between border-t border-lborder/60 bg-secondary/30 px-4 py-2 text-[11px] text-stext">
            <span>Markdown supported (headings, bold, lists, quotes, images)</span>
            <span>{value.length} chars · {value.trim() ? value.trim().split(/\s+/).length : 0} words</span>
          </div>
        </div>
      ) : (
        <div className="min-h-[320px] max-h-[500px] overflow-y-auto p-6">
          {value.trim() ? (
            <div className="prose prose-invert max-w-none space-y-4 text-sm leading-relaxed text-mtext/90">
              {value.split('\n\n').map((block, i) => {
                const trimmed = block.trim();
                if (trimmed.startsWith('# ')) {
                  return <h1 key={i} className="text-2xl font-black text-mtext border-b border-lborder pb-2">{trimmed.slice(2)}</h1>;
                }
                if (trimmed.startsWith('## ')) {
                  return <h2 key={i} className="text-xl font-bold text-mtext">{trimmed.slice(3)}</h2>;
                }
                if (trimmed.startsWith('### ')) {
                  return <h3 key={i} className="text-lg font-bold text-accent">{trimmed.slice(4)}</h3>;
                }
                if (trimmed.startsWith('> ')) {
                  return (
                    <blockquote key={i} className="border-l-4 border-accent bg-accent/5 p-3 rounded-r-lg italic text-stext">
                      {trimmed.slice(2)}
                    </blockquote>
                  );
                }
                if (trimmed.startsWith('![')) {
                  const match = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
                  if (match) {
                    return (
                      <figure key={i} className="my-3">
                        <img src={match[2]} alt={match[1]} className="rounded-xl border border-lborder max-h-72 object-cover" />
                        {match[1] && <figcaption className="text-xs text-stext mt-1">{match[1]}</figcaption>}
                      </figure>
                    );
                  }
                }
                if (trimmed === '---') {
                  return <hr key={i} className="border-lborder my-4" />;
                }
                return (
                  <p key={i} className="whitespace-pre-wrap">
                    {trimmed}
                  </p>
                );
              })}
            </div>
          ) : (
            <p className="py-12 text-center text-sm italic text-stext">
              Nothing to preview yet. Switch to Write mode and compose your article.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-stext transition-colors hover:bg-card hover:text-mtext active:scale-95"
    >
      {icon}
    </button>
  );
}

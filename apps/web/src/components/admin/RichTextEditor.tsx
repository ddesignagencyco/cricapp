'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlock from '@tiptap/extension-code-block';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
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
  Undo2,
  Redo2,
} from 'lucide-react';
import { useEffect, useCallback } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (_value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder: placeholder || 'Start writing your article...' }),
      Underline,
      Strike,
      Link.configure({ openOnClick: false }),
      Image,
      CodeBlock,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `grid h-8 w-8 place-items-center rounded-lg transition-colors ${
      active ? 'text-white' : ''
    }`;

  const btnStyle = (active: boolean) => ({
    background: active ? 'var(--admin-accent)' : 'transparent',
    color: active ? '#fff' : 'var(--admin-text-secondary)',
  });

  return (
    <div className="tiptap-editor overflow-hidden rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b p-2" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-input-bg)' }}>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive('bold'))} style={btnStyle(editor.isActive('bold'))} title="Bold">
          <Bold size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive('italic'))} style={btnStyle(editor.isActive('italic'))} title="Italic">
          <Italic size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btnClass(editor.isActive('underline'))} style={btnStyle(editor.isActive('underline'))} title="Underline">
          <UnderlineIcon size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()}
          className={btnClass(editor.isActive('strike'))} style={btnStyle(editor.isActive('strike'))} title="Strikethrough">
          <Strikethrough size={15} />
        </button>

        <span className="mx-1 h-4 w-px" style={{ background: 'var(--admin-border)' }} />

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={btnClass(editor.isActive('heading', { level: 1 }))} style={btnStyle(editor.isActive('heading', { level: 1 }))} title="Heading 1">
          <Heading1 size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btnClass(editor.isActive('heading', { level: 2 }))} style={btnStyle(editor.isActive('heading', { level: 2 }))} title="Heading 2">
          <Heading2 size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={btnClass(editor.isActive('heading', { level: 3 }))} style={btnStyle(editor.isActive('heading', { level: 3 }))} title="Heading 3">
          <Heading3 size={15} />
        </button>

        <span className="mx-1 h-4 w-px" style={{ background: 'var(--admin-border)' }} />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive('bulletList'))} style={btnStyle(editor.isActive('bulletList'))} title="Bullet List">
          <List size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor.isActive('orderedList'))} style={btnStyle(editor.isActive('orderedList'))} title="Numbered List">
          <ListOrdered size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={btnClass(editor.isActive('blockquote'))} style={btnStyle(editor.isActive('blockquote'))} title="Blockquote">
          <Quote size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={btnClass(editor.isActive('codeBlock'))} style={btnStyle(editor.isActive('codeBlock'))} title="Code Block">
          <Code size={15} />
        </button>

        <span className="mx-1 h-4 w-px" style={{ background: 'var(--admin-border)' }} />

        <button type="button" onClick={setLink}
          className={btnClass(editor.isActive('link'))} style={btnStyle(editor.isActive('link'))} title="Add Link">
          <LinkIcon size={15} />
        </button>
        <button type="button" onClick={addImage} className={btnClass(false)} style={btnStyle(false)} title="Add Image">
          <ImageIcon size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={btnClass(false)} style={btnStyle(false)} title="Horizontal Rule">
          <Minus size={15} />
        </button>

        <span className="mx-1 h-4 w-px" style={{ background: 'var(--admin-border)' }} />

        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}
          className={btnClass(false)} style={{ ...btnStyle(false), opacity: editor.can().undo() ? 1 : 0.3 }} title="Undo">
          <Undo2 size={15} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}
          className={btnClass(false)} style={{ ...btnStyle(false), opacity: editor.can().redo() ? 1 : 0.3 }} title="Redo">
          <Redo2 size={15} />
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} className="min-h-[300px] max-h-[600px] overflow-y-auto" style={{ color: 'var(--admin-text)' }} />

      {/* Word count footer */}
      <div className="flex items-center justify-between border-t px-4 py-2 text-xs"
        style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }}>
        <span>Rich text editor • TipTap</span>
        <span>{editor.storage.characterCount?.characters?.() ?? editor.getText().length} chars • {editor.storage.characterCount?.words?.() ?? editor.getText().split(/\s+/).filter(Boolean).length} words</span>
      </div>
    </div>
  );
}

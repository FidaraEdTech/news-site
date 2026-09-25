"use client";

import { useId, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { Mark } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

const Small = Mark.create({
  name: "small", parseHTML: () => [{ tag: "small" }], renderHTML: () => ["small", 0],
});

export function StoryEditor({ initialHtml }: { initialHtml: string }) {
  const helpId = useId();
  const [html, setHtml] = useState(initialHtml);
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, link: { openOnClick: false } }), Small],
    content: initialHtml,
    immediatelyRender: false,
    editorProps: { attributes: { role: "textbox", "aria-label": "Story body", "aria-multiline": "true", "aria-describedby": helpId, class: "story-rich-text story-editor-input" } },
    onUpdate: ({ editor: updated }) => setHtml(updated.getHTML()),
  });
  const state = useEditorState({ editor, selector: ({ editor: current }) => ({
    bold: current?.isActive("bold"), italic: current?.isActive("italic"), small: current?.isActive("small"),
    quote: current?.isActive("blockquote"), list: current?.isActive("bulletList"),
    heading: current?.isActive("heading", { level: 2 }), subheading: current?.isActive("heading", { level: 3 }),
  }) });

  function uppercase() {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const transaction = editor.state.tr;
    const replacements: { from: number; to: number; text: string; marks: typeof editor.state.storedMarks }[] = [];
    editor.state.doc.nodesBetween(from, to, (node, position) => {
      if (!node.isText || !node.text) return;
      const start = Math.max(position, from), end = Math.min(position + node.nodeSize, to);
      replacements.push({ from: start, to: end, text: node.text.slice(start - position, end - position).toLocaleUpperCase(), marks: node.marks });
    });
    for (const replacement of replacements.reverse()) transaction.replaceWith(replacement.from, replacement.to, editor.schema.text(replacement.text, replacement.marks ?? undefined));
    editor.view.dispatch(transaction);
    editor.commands.focus();
  }

  const buttons = [
    { label: "Bold", active: state?.bold, run: () => editor?.chain().focus().toggleBold().run() },
    { label: "Italic", active: state?.italic, run: () => editor?.chain().focus().toggleItalic().run() },
    { label: "Smaller text", active: state?.small, run: () => editor?.chain().focus().toggleMark("small").run() },
    { label: "Heading", active: state?.heading, run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Subheading", active: state?.subheading, run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Quotation", active: state?.quote, run: () => editor?.chain().focus().toggleBlockquote().run() },
    { label: "Bullet list", active: state?.list, run: () => editor?.chain().focus().toggleBulletList().run() },
  ];
  return <div className="story-editor">
    <p id={helpId} className="editor-help-text">Select text to format it. Use headings for sections and quotations for quoted passages. Ctrl/Cmd+B: bold; Ctrl/Cmd+I: italic.</p>
    <div role="group" aria-label="Story formatting" className="story-editor-toolbar">
      {buttons.map(({ label, active, run }) => <button key={label} type="button" disabled={!editor} aria-pressed={Boolean(active)} onClick={run}>{label}</button>)}
      <button type="button" disabled={!editor} onClick={uppercase}>UPPERCASE</button>
      <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}>Clear formatting</button>
      <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().undo().run()}>Undo</button>
      <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().redo().run()}>Redo</button>
    </div>
    <input type="hidden" name="content_format" value="html" />
    <input type="hidden" name="content" value={html} />
    {!editor && <p role="status">Loading story editor…</p>}
    <EditorContent editor={editor} />
  </div>;
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDigestEdition, type DigestStoryItem } from "@/lib/newsletter";

type DigestBuilderProps = {
  stories: DigestStoryItem[];
  newsletterUrl: string | null;
  siteUrl: string;
};

export function DigestBuilder({ stories, newsletterUrl, siteUrl }: DigestBuilderProps) {
  const defaultSelectedIds = useMemo(
    () => stories.slice(0, 5).map((story) => story.id),
    [stories]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelectedIds);
  const [editionTitle, setEditionTitle] = useState(
    "The Curator’s Digest — Frontline Daily"
  );
  const [introNote, setIntroNote] = useState(
    "Good Sunday from the Frontline Daily newsroom. Here is our curated selection of essential reporting and analysis from the week. Select any headline below to read the full report on Frontline Daily."
  );
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const selectedStories = useMemo(
    () => stories.filter((story) => selectedIds.includes(story.id)),
    [stories, selectedIds]
  );

  const formatted = useMemo(
    () =>
      formatDigestEdition({
        title: editionTitle,
        introNote,
        stories: selectedStories,
        siteUrl,
      }),
    [editionTitle, introNote, selectedStories, siteUrl]
  );

  function toggleStory(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function copyRichDigest(): Promise<boolean> {
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const htmlBlob = new Blob([formatted.html], { type: "text/html" });
        const textBlob = new Blob([formatted.text], { type: "text/plain" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": htmlBlob,
            "text/plain": textBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(formatted.text);
      }
      setCopyStatus("Digest copied! Paste (Ctrl+V) into your Substack post editor.");
      return true;
    } catch {
      setCopyStatus("Unable to copy automatically. Please select and copy from the preview below.");
      return false;
    }
  }

  async function copySubjectLine() {
    try {
      await navigator.clipboard.writeText(formatted.subject);
      setCopyStatus("Email subject line copied to clipboard.");
    } catch {
      setCopyStatus("Could not copy subject line.");
    }
  }

  async function handleCopyAndOpenSubstack() {
    await copyRichDigest();
    const targetUrl = newsletterUrl
      ? `${newsletterUrl}/publish/post`
      : "https://substack.com/publish/post";
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <section
      id="curators-digest-studio"
      aria-labelledby="digest-studio-heading"
      className="bg-surface p-5 sm:p-8 rounded border border-border mt-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border pb-6 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
            Sunday Newsletter Workflow
          </p>
          <h3 id="digest-studio-heading" className="font-headline text-2xl sm:text-3xl font-bold">
            The Curator’s Digest Studio
          </h3>
          <p className="text-sm text-muted mt-1">
            Curate your weekly edition here on the website. Every story in the email includes a teaser and directs subscribers straight back to{" "}
            <strong>FrontlineDaily.org</strong> to read the full report.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {newsletterUrl ? (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-success-soft text-success text-xs font-bold border border-success/30">
              Connected: {newsletterUrl.replace(/^https?:\/\//, "")}
            </span>
          ) : (
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-warning-soft text-warning text-xs font-bold border border-warning/30 underline"
            >
              Connect Substack URL in Settings →
            </Link>
          )}
          <Link
            href="/newsletter"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded border border-border text-xs font-bold uppercase tracking-wider hover:bg-surface-muted"
          >
            View Public Digest Page ↗
          </Link>
        </div>
      </div>

      {copyStatus && (
        <div
          role="status"
          className="p-4 mb-6 rounded border-l-4 border-primary bg-surface-muted text-sm font-bold text-on-surface"
        >
          {copyStatus}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Edition Setup & Story Selection */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="field">
            <label htmlFor="digest-edition-title" className="block text-xs font-bold uppercase tracking-wider mb-2">
              Edition Subject / Title
            </label>
            <div className="flex gap-2">
              <input
                id="digest-edition-title"
                type="text"
                value={editionTitle}
                onChange={(e) => setEditionTitle(e.target.value)}
                className="w-full min-h-11 px-3 py-2 border border-border rounded bg-white text-sm"
              />
              <button
                type="button"
                onClick={copySubjectLine}
                className="min-h-11 px-4 py-2 border border-border rounded text-xs font-bold uppercase tracking-wider hover:bg-surface-muted flex-shrink-0"
              >
                Copy Subject
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="digest-intro-note" className="block text-xs font-bold uppercase tracking-wider mb-2">
              Editor’s Note (Opening Paragraph)
            </label>
            <textarea
              id="digest-intro-note"
              rows={4}
              value={introNote}
              onChange={(e) => setIntroNote(e.target.value)}
              className="w-full p-3 border border-border rounded bg-white text-sm leading-relaxed"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">
                Select Published Stories ({selectedStories.length} selected)
              </span>
              <div className="flex items-center gap-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedIds(stories.slice(0, 5).map((s) => s.id))}
                  className="text-primary hover:underline"
                >
                  Latest 5
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-muted hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            {stories.length === 0 ? (
              <p className="text-sm text-muted p-4 border border-border rounded bg-surface-muted">
                No published stories yet. Publish a story in the Story Desk to include it in The Curator’s Digest.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto border border-border rounded divide-y divide-border bg-white">
                {stories.slice(0, 20).map((story) => {
                  const checked = selectedIds.includes(story.id);
                  const checkboxId = `digest-story-${story.id}`;
                  return (
                    <label
                      key={story.id}
                      htmlFor={checkboxId}
                      className="flex items-start gap-3 p-3.5 cursor-pointer hover:bg-surface-muted transition-colors"
                    >
                      <input
                        id={checkboxId}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStory(story.id)}
                        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-primary">
                          {story.category}
                        </span>
                        <span className="block font-headline font-bold text-sm text-on-surface leading-snug">
                          {story.title}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={copyRichDigest}
              disabled={selectedStories.length === 0}
              className="button min-h-11 px-5 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              1. Copy Formatted Digest
            </button>
            <button
              type="button"
              onClick={handleCopyAndOpenSubstack}
              disabled={selectedStories.length === 0}
              className="min-h-11 px-5 py-2.5 rounded border-2 border-primary text-primary bg-white hover:bg-surface-muted text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              2. Copy &amp; Open Substack Editor ↗
            </button>
          </div>
        </div>

        {/* Right Column: Live Email Preview */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Subscriber Email Preview (Links Back to Frontline Daily)
            </span>
          </div>
          <div className="border border-border rounded bg-surface-muted p-5 sm:p-6 flex-1 max-h-[540px] overflow-y-auto">
            <div className="bg-white border border-border rounded p-5 sm:p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">
                Frontline Daily · Every Sunday
              </p>
              <h4 className="font-headline text-xl sm:text-2xl font-bold mb-4 pb-3 border-b border-border">
                {formatted.subject}
              </h4>
              <p className="text-sm text-on-surface leading-relaxed whitespace-pre-line mb-6">
                {introNote}
              </p>

              {selectedStories.length === 0 ? (
                <p className="text-sm text-muted italic py-6 text-center border-t border-border">
                  Select at least one published story on the left to preview the email edition.
                </p>
              ) : (
                <div className="divide-y divide-border border-t border-border">
                  {selectedStories.map((story) => {
                    const storyUrl = `${siteUrl.replace(/\/+$/, "")}/story/${story.id}`;
                    return (
                      <article key={story.id} className="py-5">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">
                          {story.category}
                          {story.byline ? ` · By ${story.byline}` : ""}
                        </p>
                        <h5 className="font-headline text-lg font-bold leading-snug mb-2">
                          <a
                            href={storyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {story.title}
                          </a>
                        </h5>
                        {story.excerpt && (
                          <p className="text-sm text-muted leading-relaxed mb-3">
                            {story.excerpt}
                          </p>
                        )}
                        <a
                          href={storyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                        >
                          Read the full story on Frontline Daily →
                        </a>
                      </article>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border text-xs text-muted italic">
                Thank you for reading The Curator’s Digest. Visit{" "}
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-primary underline"
                >
                  FrontlineDaily.org
                </a>{" "}
                for breaking updates and daily independent journalism.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { addSubscribersFromDashboardAction } from "@/app/actions/newsletter";
import { uploadDigestImageAction } from "@/app/dashboard/actions";
import {
  formatDigestEdition,
  resolveDigestStoryImage,
  type DigestStoryItem,
} from "@/lib/newsletter";

type SubscriberEntry = {
  email: string;
  created_at: string;
};

type DigestBuilderProps = {
  stories: DigestStoryItem[];
  newsletterUrl: string | null;
  siteUrl: string;
  initialSubscribers?: SubscriberEntry[];
};

export function DigestBuilder({
  stories,
  newsletterUrl,
  siteUrl,
  initialSubscribers = [],
}: DigestBuilderProps) {
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
  const [headerImageUrl, setHeaderImageUrl] = useState("");
  const [includeStoryImages, setIncludeStoryImages] = useState(true);
  const [excludedImageStoryIds, setExcludedImageStoryIds] = useState<string[]>([]);
  const [storyImageOverrides, setStoryImageOverrides] = useState<Record<string, string>>({});
  const [editingImageStoryId, setEditingImageStoryId] = useState<string | null>(null);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const [subscribers, setSubscribers] = useState<SubscriberEntry[]>(initialSubscribers);
  const [newSubscriberInput, setNewSubscriberInput] = useState("");
  const [isAddingSubscribers, startSubscriberTransition] = useTransition();

  const selectedStories = useMemo(
    () => stories.filter((story) => selectedIds.includes(story.id)),
    [stories, selectedIds]
  );

  const formatted = useMemo(
    () =>
      formatDigestEdition({
        title: editionTitle,
        introNote,
        headerImageUrl,
        includeStoryImages,
        excludedImageStoryIds,
        storyImageOverrides,
        stories: selectedStories,
        siteUrl,
      }),
    [
      editionTitle,
      introNote,
      headerImageUrl,
      includeStoryImages,
      excludedImageStoryIds,
      storyImageOverrides,
      selectedStories,
      siteUrl,
    ]
  );

  function toggleStory(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleStoryImage(id: string) {
    setExcludedImageStoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleAddSubscribers(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newSubscriberInput.trim()) return;

    const formData = new FormData();
    formData.set("emails", newSubscriberInput);

    startSubscriberTransition(async () => {
      const res = await addSubscribersFromDashboardAction(formData);
      setCopyStatus(res.message);
      if (res.ok) {
        const now = new Date().toISOString();
        const addedEmails = newSubscriberInput
          .split(/[\s,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.includes("@"));
        setSubscribers((prev) => {
          const existing = new Set(prev.map((item) => item.email));
          const fresh = addedEmails
            .filter((email) => !existing.has(email))
            .map((email) => ({ email, created_at: now }));
          return [...fresh, ...prev];
        });
        setNewSubscriberInput("");
      }
    });
  }

  async function copySubscriberEmails() {
    if (subscribers.length === 0) {
      setCopyStatus("No subscriber emails to copy yet.");
      return;
    }
    try {
      const list = subscribers.map((s) => s.email).join(", ");
      await navigator.clipboard.writeText(list);
      setCopyStatus(`Copied ${subscribers.length} subscriber email(s) to clipboard!`);
    } catch {
      setCopyStatus("Unable to copy subscriber emails automatically.");
    }
  }

  async function handleUploadImage(file: File, target: "header" | string) {
    setUploadingTarget(target);
    setCopyStatus("Uploading image...");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const result = await uploadDigestImageAction(formData);
      if (!result.ok || !result.url) {
        setCopyStatus(result.error || "Could not upload image.");
        return;
      }
      if (target === "header") {
        setHeaderImageUrl(result.url);
        setCopyStatus("Edition cover image uploaded and added to the digest.");
      } else {
        setStoryImageOverrides((prev) => ({ ...prev, [target]: result.url! }));
        setExcludedImageStoryIds((prev) => prev.filter((id) => id !== target));
        setCopyStatus("Story image uploaded and added to the digest.");
      }
    } catch {
      setCopyStatus("Image upload failed. Please try again.");
    } finally {
      setUploadingTarget(null);
    }
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
      setCopyStatus(
        "Digest (with images & story links) copied! Paste (Ctrl+V) into your email or Substack editor."
      );
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
      : "https://frontlinedaily.substack.com/publish/post";
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }

  async function handleSendViaGmail() {
    await copyRichDigest();
    const bccList = subscribers.map((s) => s.email).join(",");
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(
      bccList
    )}&su=${encodeURIComponent(formatted.subject)}`;
    window.open(gmailUrl, "_blank", "noopener,noreferrer");
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
            Manage subscribers directly on your website, curate story photos and teasers, and send via Gmail or Substack. Every story links straight back to{" "}
            <strong>FrontlineDaily.org</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/frontline-daily-logo.png"
            download="frontline-daily-logo.png"
            className="button secondary button-compact text-xs"
          >
            Download Brand Logo (PNG) ↓
          </a>
          <Link
            href="/newsletter"
            target="_blank"
            rel="noopener noreferrer"
            className="button secondary button-compact text-xs"
          >
            View Public Subscribe Page ↗
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

      {/* Website Subscribers Panel */}
      <div className="p-5 rounded border border-border bg-surface-muted mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h4 className="font-headline text-xl font-bold text-on-surface">
              Website Subscribers ({subscribers.length})
            </h4>
            <p className="text-xs text-muted mt-0.5">
              Anyone who subscribes on <strong>frontlinedaily.org/newsletter</strong> is saved here automatically—with no Substack redirect or confirmation delay.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copySubscriberEmails}
              disabled={subscribers.length === 0}
              className="button secondary button-compact text-xs"
            >
              Copy All {subscribers.length} Emails
            </button>
            {newsletterUrl && (
              <a
                href={`${newsletterUrl}/publish/subscribers`}
                target="_blank"
                rel="noopener noreferrer"
                className="button secondary button-compact text-xs"
              >
                Open Substack Subscribers (@frontlinedaily) ↗
              </a>
            )}
          </div>
        </div>

        <form onSubmit={handleAddSubscribers} className="flex flex-col sm:flex-row gap-2.5 mb-4">
          <input
            type="text"
            placeholder="Add subscriber email(s) directly (comma-separated, e.g. reader1@gmail.com, reader2@gmail.com)..."
            value={newSubscriberInput}
            onChange={(e) => setNewSubscriberInput(e.target.value)}
            disabled={isAddingSubscribers}
            className="flex-1 min-h-11 px-3.5 py-2 border border-border rounded bg-white text-sm"
          />
          <button
            type="submit"
            disabled={isAddingSubscribers || !newSubscriberInput.trim()}
            className="button button-compact text-xs"
          >
            {isAddingSubscribers ? "Adding…" : "+ Add Subscribers"}
          </button>
        </form>

        {subscribers.length > 0 ? (
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 rounded border border-border bg-white">
            {subscribers.map((sub) => (
              <span
                key={sub.email}
                className="inline-flex items-center px-2.5 py-1 rounded bg-surface-muted border border-border text-xs font-semibold text-on-surface"
              >
                {sub.email}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted italic">
            No subscribers recorded yet. Test subscribing on{" "}
            <Link href="/newsletter" className="text-primary underline">
              /newsletter
            </Link>{" "}
            or add emails above.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Edition Setup, Image Controls & Story Selection */}
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
                className="button secondary button-compact text-xs flex-shrink-0"
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
              rows={3}
              value={introNote}
              onChange={(e) => setIntroNote(e.target.value)}
              className="w-full p-3 border border-border rounded bg-white text-sm leading-relaxed"
            />
          </div>

          {/* Optional Edition Cover / Banner Image */}
          <div className="field p-4 rounded border border-border bg-surface-muted">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label htmlFor="digest-header-image" className="text-xs font-bold uppercase tracking-wider">
                Edition Cover / Banner Image (Optional)
              </label>
              <div className="flex items-center gap-2">
                <label className="button secondary button-compact text-xs cursor-pointer">
                  {uploadingTarget === "header" ? "Uploading..." : "+ Upload Image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingTarget !== null}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleUploadImage(file, "header");
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
                {headerImageUrl && (
                  <button
                    type="button"
                    onClick={() => setHeaderImageUrl("")}
                    className="button danger button-compact text-xs"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input
              id="digest-header-image"
              type="url"
              placeholder="Paste an image URL (https://...) or click '+ Upload Image' above"
              value={headerImageUrl}
              onChange={(e) => setHeaderImageUrl(e.target.value)}
              className="w-full min-h-10 px-3 py-2 border border-border rounded bg-white text-xs"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">
                Select Published Stories ({selectedStories.length} selected)
              </span>
              <div className="flex items-center gap-4 text-xs font-bold">
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-on-surface">
                  <input
                    type="checkbox"
                    checked={includeStoryImages}
                    onChange={(e) => setIncludeStoryImages(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  <span>Include Story Images</span>
                </label>
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
              <div className="max-h-96 overflow-y-auto border border-border rounded divide-y divide-border bg-white">
                {stories.slice(0, 20).map((story) => {
                  const checked = selectedIds.includes(story.id);
                  const checkboxId = `digest-story-${story.id}`;
                  const resolvedImage = resolveDigestStoryImage(
                    story,
                    siteUrl,
                    storyImageOverrides[story.id]
                  );
                  const imageIncluded =
                    includeStoryImages &&
                    !excludedImageStoryIds.includes(story.id) &&
                    Boolean(resolvedImage);
                  const isEditingImage = editingImageStoryId === story.id;

                  return (
                    <div key={story.id} className="p-3.5 hover:bg-surface-muted transition-colors">
                      <div className="flex items-start gap-3">
                        <input
                          id={checkboxId}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStory(story.id)}
                          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                        {resolvedImage && (
                          <img
                            src={resolvedImage}
                            alt=""
                            className={`w-14 h-11 object-cover rounded border border-border flex-shrink-0 ${
                              checked && !imageIncluded ? "opacity-40 grayscale" : ""
                            }`}
                          />
                        )}
                        <label htmlFor={checkboxId} className="min-w-0 flex-1 cursor-pointer">
                          <span className="block text-[10px] font-bold uppercase tracking-widest text-primary">
                            {story.category}
                          </span>
                          <span className="block font-headline font-bold text-sm text-on-surface leading-snug">
                            {story.title}
                          </span>
                        </label>
                      </div>

                      {checked && includeStoryImages && (
                        <div className="mt-2.5 pl-7 flex flex-wrap items-center gap-3 text-xs">
                          {resolvedImage ? (
                            <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-muted">
                              <input
                                type="checkbox"
                                checked={!excludedImageStoryIds.includes(story.id)}
                                onChange={() => toggleStoryImage(story.id)}
                                className="h-3.5 w-3.5 rounded border-border text-primary"
                              />
                              <span>Show image in email</span>
                            </label>
                          ) : (
                            <span className="text-muted italic">No image on story</span>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setEditingImageStoryId(isEditingImage ? null : story.id)
                            }
                            className="font-bold text-primary underline"
                          >
                            {resolvedImage ? "Change image" : "+ Add image"}
                          </button>

                          {storyImageOverrides[story.id] && (
                            <button
                              type="button"
                              onClick={() =>
                                setStoryImageOverrides((prev) => {
                                  const next = { ...prev };
                                  delete next[story.id];
                                  return next;
                                })
                              }
                              className="font-bold text-danger underline"
                            >
                              Reset image
                            </button>
                          )}
                        </div>
                      )}

                      {checked && includeStoryImages && isEditingImage && (
                        <div className="mt-2.5 ml-7 p-2.5 rounded border border-border bg-surface-muted flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="url"
                              placeholder="Paste custom image URL (https://...)"
                              value={storyImageOverrides[story.id] ?? ""}
                              onChange={(e) =>
                                setStoryImageOverrides((prev) => ({
                                  ...prev,
                                  [story.id]: e.target.value,
                                }))
                              }
                              className="flex-1 min-h-9 px-2.5 py-1.5 border border-border rounded bg-white text-xs"
                            />
                            <label className="button secondary button-compact text-xs cursor-pointer flex-shrink-0">
                              {uploadingTarget === story.id ? "Uploading..." : "Upload File"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingTarget !== null}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    void handleUploadImage(file, story.id);
                                    e.target.value = "";
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSendViaGmail}
                disabled={selectedStories.length === 0}
                className="button text-xs"
              >
                1. Copy Digest &amp; Send via Gmail ({subscribers.length} Subscribers) ↗
              </button>
              <button
                type="button"
                onClick={handleCopyAndOpenSubstack}
                disabled={selectedStories.length === 0}
                className="button secondary text-xs"
              >
                2. Copy &amp; Open Substack (@frontlinedaily) ↗
              </button>
              <button
                type="button"
                onClick={copyRichDigest}
                disabled={selectedStories.length === 0}
                className="button secondary text-xs"
              >
                Copy Formatted Digest Only
              </button>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              <strong>Tip:</strong> Clicking <strong>Send via Gmail</strong> copies the formatted digest (including images and links) and opens Gmail with all {subscribers.length} website subscribers in BCC—just press <strong>Ctrl+V</strong> in the email body and hit Send! Or use <strong>Open Substack Editor</strong> and make sure <em>&ldquo;Deliver this post via email&rdquo;</em> is checked before clicking <em>&ldquo;Send to everyone now&rdquo;</em>.
            </p>
          </div>
        </div>

        {/* Right Column: Live Email Preview */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Subscriber Email Preview (Images + Links Back to Frontline Daily)
            </span>
          </div>
          <div className="border border-border rounded bg-surface-muted p-5 sm:p-6 flex-1 max-h-[680px] overflow-y-auto">
            <div className="bg-white border border-border rounded p-5 sm:p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">
                Frontline Daily · Every Sunday
              </p>
              <h4 className="font-headline text-xl sm:text-2xl font-bold mb-4 pb-3 border-b border-border">
                {formatted.subject}
              </h4>

              {headerImageUrl.trim() && (
                <div className="mb-4">
                  <img
                    src={headerImageUrl.trim()}
                    alt={formatted.subject}
                    className="w-full max-h-56 object-cover rounded border border-border"
                  />
                </div>
              )}

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
                    const storyImageUrl =
                      includeStoryImages && !excludedImageStoryIds.includes(story.id)
                        ? resolveDigestStoryImage(
                            story,
                            siteUrl,
                            storyImageOverrides[story.id]
                          )
                        : null;

                    return (
                      <article key={story.id} className="py-5">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">
                          {story.category}
                          {story.byline ? ` · By ${story.byline}` : ""}
                        </p>
                        <h5 className="font-headline text-lg font-bold leading-snug mb-2.5">
                          <a
                            href={storyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {story.title}
                          </a>
                        </h5>
                        {storyImageUrl && (
                          <a
                            href={storyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mb-3"
                          >
                            <img
                              src={storyImageUrl}
                              alt={story.title}
                              className="w-full max-h-52 object-cover rounded border border-border"
                            />
                          </a>
                        )}
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

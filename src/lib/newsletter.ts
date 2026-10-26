/** Accept only publication origins; derive embeds and subscription paths here. */
export function normalizeSubstackUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.port || url.username || url.password ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.substack\.com$/.test(url.hostname)) return null;
    return url.origin;
  } catch { return null; }
}

export function validGoogleVerification(value: string): boolean {
  return /^[A-Za-z0-9_-]{10,256}$/.test(value);
}

export type DigestStoryPhotoItem = {
  image_url?: string;
  order?: number;
};

export type DigestStoryItem = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  byline?: string | null;
  featured_image_url?: string | null;
  photo_desk_items?: DigestStoryPhotoItem[] | string | null;
  published_at?: string | null;
  created_at?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeAbsoluteImageUrl(rawUrl: string | null | undefined, baseUrl: string): string | null {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${baseUrl}${normalizedPath}`;
}

export function resolveDigestStoryImage(
  story: DigestStoryItem,
  siteUrl = "https://frontlinedaily.org",
  overrideUrl?: string | null,
): string | null {
  const baseUrl = (siteUrl.trim() || "https://frontlinedaily.org").replace(/\/+$/, "");

  const override = normalizeAbsoluteImageUrl(overrideUrl, baseUrl);
  if (override) return override;

  const featured = normalizeAbsoluteImageUrl(story.featured_image_url, baseUrl);
  if (featured) return featured;

  if (story.photo_desk_items) {
    let items: DigestStoryPhotoItem[] = [];
    if (Array.isArray(story.photo_desk_items)) {
      items = story.photo_desk_items;
    } else if (typeof story.photo_desk_items === "string") {
      try {
        const parsed = JSON.parse(story.photo_desk_items);
        if (Array.isArray(parsed)) items = parsed;
      } catch {
        items = [];
      }
    }
    const firstItem = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
    const photoDeskUrl = normalizeAbsoluteImageUrl(firstItem?.image_url, baseUrl);
    if (photoDeskUrl) return photoDeskUrl;
  }

  return null;
}

/**
 * Formats selected website stories into a Substack-ready Curator's Digest edition
 * where every story teaser (and optional image) directs subscribers back to Frontline Daily to read the full report.
 */
export function formatDigestEdition(options: {
  title?: string;
  introNote?: string;
  headerImageUrl?: string | null;
  includeStoryImages?: boolean;
  excludedImageStoryIds?: string[];
  storyImageOverrides?: Record<string, string>;
  stories: DigestStoryItem[];
  siteUrl?: string;
}): { subject: string; html: string; text: string } {
  const baseUrl = (options.siteUrl?.trim() || "https://frontlinedaily.org").replace(/\/+$/, "");
  const subject = options.title?.trim() || "The Curator’s Digest — Frontline Daily";
  const intro = options.introNote?.trim() ||
    "A curated selection of this week’s essential reporting and analysis from the Frontline Daily newsroom. Click any story below to read the full report on Frontline Daily.";
  const includeImages = options.includeStoryImages ?? true;
  const excludedSet = new Set(options.excludedImageStoryIds ?? []);
  const overrides = options.storyImageOverrides ?? {};

  const headerImage = normalizeAbsoluteImageUrl(options.headerImageUrl, baseUrl);
  const headerImageHtml = headerImage
    ? `<p><img src="${escapeHtml(headerImage)}" alt="${escapeHtml(subject)}" /></p>`
    : "";

  const introParagraphsHtml = intro
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");

  const storiesHtml = options.stories
    .map((story) => {
      const storyUrl = `${baseUrl}/story/${encodeURIComponent(story.id)}`;
      const category = escapeHtml(story.category || "News");
      const title = escapeHtml(story.title);
      const excerpt = escapeHtml(story.excerpt || "");
      const byline = story.byline?.trim() ? ` · By ${escapeHtml(story.byline.trim())}` : "";
      const storyImageUrl =
        includeImages && !excludedSet.has(story.id)
          ? resolveDigestStoryImage(story, baseUrl, overrides[story.id])
          : null;

      return [
        `<hr>`,
        `<p><strong>${category.toUpperCase()}</strong>${byline}</p>`,
        `<h2><a href="${storyUrl}">${title}</a></h2>`,
        storyImageUrl
          ? `<p><a href="${storyUrl}"><img src="${escapeHtml(storyImageUrl)}" alt="${title}" /></a></p>`
          : "",
        excerpt ? `<p>${excerpt}</p>` : "",
        `<p><a href="${storyUrl}"><strong>Read the full story on Frontline Daily →</strong></a></p>`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const footerHtml = [
    `<hr>`,
    `<p><em>Thank you for reading The Curator’s Digest. Visit <a href="${baseUrl}"><strong>FrontlineDaily.org</strong></a> for breaking updates and daily independent journalism.</em></p>`,
  ].join("\n");

  const html = [headerImageHtml, introParagraphsHtml, storiesHtml, footerHtml].filter(Boolean).join("\n\n");

  const storiesText = options.stories
    .map((story) => {
      const storyUrl = `${baseUrl}/story/${encodeURIComponent(story.id)}`;
      const byline = story.byline?.trim() ? ` (${story.byline.trim()})` : "";
      return [
        `[${(story.category || "News").toUpperCase()}]${byline}`,
        story.title,
        story.excerpt?.trim() || "",
        `Read the full story on Frontline Daily: ${storyUrl}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n----------------------------------------\n\n");

  const text = [
    subject,
    "",
    intro,
    "",
    "----------------------------------------",
    "",
    storiesText,
    "",
    "----------------------------------------",
    `Explore more reporting on Frontline Daily: ${baseUrl}`,
  ]
    .filter((line, idx, arr) => !(line === "" && arr[idx - 1] === ""))
    .join("\n");

  return { subject, html, text };
}

export function buildStoriesRssFeed(stories: DigestStoryItem[], siteUrl = "https://frontlinedaily.org"): string {
  const baseUrl = siteUrl.trim().replace(/\/+$/, "");
  const itemsXml = stories
    .map((story) => {
      const storyUrl = `${baseUrl}/story/${encodeURIComponent(story.id)}`;
      const pubDateValue = story.published_at || story.created_at;
      const pubDate = pubDateValue && !Number.isNaN(new Date(pubDateValue).getTime())
        ? new Date(pubDateValue).toUTCString()
        : new Date().toUTCString();

      const storyImageUrl = resolveDigestStoryImage(story, baseUrl);

      return [
        "    <item>",
        `      <title>${escapeHtml(story.title)}</title>`,
        `      <link>${storyUrl}</link>`,
        `      <guid isPermaLink="true">${storyUrl}</guid>`,
        `      <category>${escapeHtml(story.category || "News")}</category>`,
        `      <description>${escapeHtml(story.excerpt || story.title)}</description>`,
        storyImageUrl ? `      <enclosure url="${escapeHtml(storyImageUrl)}" type="image/jpeg" />` : "",
        `      <pubDate>${pubDate}</pubDate>`,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    "    <title>Frontline Daily</title>",
    `    <link>${baseUrl}</link>`,
    "    <description>Independent Nigerian digital journalism covering public affairs, accountability, business, technology, and culture.</description>",
    "    <language>en</language>",
    `    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />`,
    itemsXml,
    "  </channel>",
    "</rss>",
  ]
    .filter(Boolean)
    .join("\n");
}

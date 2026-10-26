export const CATEGORIES = [
  "Politics", "Government & Governance", "National", "Security", "Humanitarian Affairs",
  "Economy & Business", "Health", "World", "Public Policy", "Special Reports", "Opinion", "Procurement",
] as const;

export function categorySlug(value: string): string {
  return value.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const CATEGORY_ALIASES: Record<string, string> = {
  government: "Government & Governance", governance: "Government & Governance",
  business: "Economy & Business", economy: "Economy & Business", economics: "Economy & Business",
  humanitarian: "Humanitarian Affairs", international: "World", policy: "Public Policy",
  investigation: "Special Reports", investigations: "Special Reports", "special-report": "Special Reports",
  political: "Politics", "world-news": "World", "national-news": "National",
  "politics-and-governance": "Politics", "procurement-article": "Procurement",
  "development-humanitarian-affairs": "Humanitarian Affairs",
  "governance-humanitarian-affairs": "Humanitarian Affairs",
  "government-humanitarian-affairs": "Humanitarian Affairs",
  "public-humanitarian-affairs": "Humanitarian Affairs",
  "government-health": "Health", "government-national-news": "National",
  "government-ossap-tvee": "Government & Governance", "government-youth-affairs": "Government & Governance",
  "institutional-government-report": "Government & Governance",
  "national-news-security": "Security", "national-security": "Security", "security-national-news": "Security",
  "economy-monetary-policy": "Economy & Business", "public-affairs-consumer-economy-news": "Economy & Business",
  "public-policy-social-protection": "Public Policy",
};

// Unknown or custom categories are preserved.
export function normalizeCategory(value: string): string {
  const slug = categorySlug(value);
  return CATEGORIES.find((category) => categorySlug(category) === slug) ?? CATEGORY_ALIASES[slug] ?? value.trim();
}

export function isMainCategory(value: string): boolean {
  return CATEGORIES.some((category) => category === value);
}

export function isValidCategoryName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= 60;
}

/**
 * Parses a single or comma-separated multi-category string into normalized, deduplicated category labels.
 */
export function parseStoryCategories(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  const rawParts = value.includes(",") ? value.split(",") : [value];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of rawParts) {
    const trimmed = part.trim().replace(/\s+/g, " ");
    if (!trimmed) continue;
    const normalized = normalizeCategory(trimmed);
    const key = categorySlug(normalized);
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }

  return result;
}

/**
 * Formats an array of categories into a clean comma-separated string for storage in stories.category.
 */
export function formatStoryCategories(categories: string[]): string {
  return parseStoryCategories(categories.join(", ")).join(", ");
}

/**
 * Checks whether a story belongs to a given category (matching any of its assigned categories or tags).
 */
export function storyMatchesCategory(
  story: { category?: string | null; tags?: string[] | null },
  selectedCategory: string,
): boolean {
  const targetSlug = categorySlug(normalizeCategory(selectedCategory.replace(/-/g, " ")));
  if (!targetSlug) return true;

  const storyCats = parseStoryCategories(story.category);
  if (storyCats.some((cat) => categorySlug(cat) === targetSlug)) {
    return true;
  }

  if (Array.isArray(story.tags)) {
    if (
      story.tags.some(
        (tag) =>
          categorySlug(normalizeCategory(tag)) === targetSlug ||
          categorySlug(tag) === targetSlug,
      )
    ) {
      return true;
    }
  }

  return false;
}

export function parseTags(value: string): string[] {
  const tags = [...new Set(value.split(",").map((tag) => tag.trim().replace(/\s+/g, " ").toLowerCase()).filter(Boolean))];
  if (tags.length > 10 || tags.some((tag) => tag.length > 40)) throw new Error("Use up to 10 tags, each no longer than 40 characters.");
  return tags;
}

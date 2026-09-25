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

// Unknown legacy categories are preserved until an editor chooses their replacement.
export function normalizeCategory(value: string): string {
  const slug = categorySlug(value);
  return CATEGORIES.find((category) => categorySlug(category) === slug) ?? CATEGORY_ALIASES[slug] ?? value.trim();
}

export function isMainCategory(value: string): boolean {
  return CATEGORIES.some((category) => category === value);
}

export function parseTags(value: string): string[] {
  const tags = [...new Set(value.split(",").map((tag) => tag.trim().replace(/\s+/g, " ").toLowerCase()).filter(Boolean))];
  if (tags.length > 10 || tags.some((tag) => tag.length > 40)) throw new Error("Use up to 10 tags, each no longer than 40 characters.");
  return tags;
}

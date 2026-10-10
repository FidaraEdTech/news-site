import type { MetadataRoute } from "next";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCanonicalUrl } from "@/lib/site";
import { categorySlug, isMainCategory, normalizeCategory } from "@/lib/categories";

export const dynamic = "force-dynamic";
const routes = ["/", "/about", "/contact", "/newsletter", "/privacy", "/terms", "/corrections", "/editorial-standards"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = routes.map((route) => ({ url: getCanonicalUrl(route) }));
  if (!hasSupabaseEnv()) return entries;
  const client = await createSupabaseServerClient();
  const categories = new Set<string>();
  // Page explicitly so the database response limit does not hide older stories.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("stories").select("id, category, updated_at, published_at")
      .eq("status", "published").order("id").range(offset, offset + 499);
    if (error) throw new Error("Unable to generate the published-story sitemap");
    for (const story of data ?? []) {
      const modified = story.updated_at || story.published_at;
      entries.push({ url: getCanonicalUrl(`/story/${story.id}`), ...(modified ? { lastModified: new Date(modified) } : {}) });
      const category = normalizeCategory(story.category);
      if (isMainCategory(category)) categories.add(category);
    }
    if (!data || data.length < 500) break;
  }
  for (const category of categories) entries.push({ url: getCanonicalUrl(`/?category=${categorySlug(category)}`) });
  return entries;
}

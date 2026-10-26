import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildStoriesRssFeed, type DigestStoryItem } from "@/lib/newsletter";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const siteUrl = getSiteUrl();
  let stories: DigestStoryItem[] = [];

  if (hasSupabaseEnv()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from("stories")
        .select("id, title, category, excerpt, byline, published_at, created_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30);

      stories = (data ?? []) as DigestStoryItem[];
    } catch {
      stories = [];
    }
  }

  const xml = buildStoriesRssFeed(stories, siteUrl);

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, stale-while-revalidate=1800",
    },
  });
}

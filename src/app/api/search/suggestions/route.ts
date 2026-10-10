import { NextResponse } from "next/server";
import { CATEGORIES, categorySlug } from "@/lib/categories";
import { searchTerms, type SearchSuggestion } from "@/lib/search";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const terms = searchTerms(new URL(request.url).searchParams.get("q") ?? "");
  const q = terms.join(" ");
  const response = (suggestions: SearchSuggestion[], status = 200) => NextResponse.json({ suggestions }, { status, headers: { "Cache-Control": "private, no-store" } });
  if (q.length < 2) return response([]);
  const suggestions: SearchSuggestion[] = CATEGORIES.filter(category => terms.every(term => category.toLowerCase().includes(term.toLowerCase()))).slice(0, 3)
    .map(category => ({ label: category, href: `/?category=${categorySlug(category)}`, kind: "Category" }));
  if (!hasSupabaseEnv()) return response(suggestions);
  const client = await createSupabaseServerClient();
  const [headlines, authors] = await Promise.all([
    client.from("stories").select("id,title").eq("status", "published").ilike("title", `%${terms.join("%")}%`).order("published_at", { ascending: false }).limit(5),
    client.from("stories").select("byline").eq("status", "published").ilike("byline", `%${terms.join("%")}%`).order("published_at", { ascending: false }).limit(10),
  ]);
  if (headlines.error || authors.error) return response(suggestions, 503);
  for (const story of headlines.data ?? []) suggestions.push({ label: story.title, href: `/story/${story.id}`, kind: "Story" });
  const bylines = [...new Set((authors.data ?? []).map(row => row.byline).filter((name): name is string => Boolean(name)))];
  for (const author of bylines.slice(0, 2)) suggestions.push({ label: author, href: `/search?author=${encodeURIComponent(author)}`, kind: "Author" });
  return response(suggestions.slice(0, 8));
}

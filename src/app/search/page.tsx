import Link from "next/link";
import { StoryCard } from "@/components/StoryCard";
import { CATEGORIES } from "@/lib/categories";
import { pageMetadata } from "@/lib/metadata";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Story } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { ...pageMetadata("Search stories", "Search Frontline Daily headlines, stories, categories and authors.", "/search"), robots: { index: false, follow: true } };
const first = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

export default async function SearchPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const q = (first(searchParams?.q) ?? "").trim().slice(0, 200);
  const category = (first(searchParams?.category) ?? "").slice(0, 80);
  const tag = (first(searchParams?.tag) ?? "").trim().toLowerCase().slice(0, 40);
  const page = Math.min(1000, Math.max(1, Number.parseInt(first(searchParams?.page) ?? "1", 10) || 1));
  const pageSize = 20;
  let stories: Story[] = [], count = 0, unavailable = !hasSupabaseEnv();
  if (!unavailable) {
    let query = createSupabaseServerClient().from("stories").select("*", { count: "exact" }).eq("status", "published");
    if (q) query = query.textSearch("search_vector", q, { type: "websearch", config: "english" });
    if (category) query = query.eq("category", category);
    if (tag) query = query.contains("tags", [tag]);
    const result = await query.order("published_at", { ascending: false }).order("id").range((page - 1) * pageSize, page * pageSize - 1);
    unavailable = Boolean(result.error);
    stories = result.data ?? [];
    count = result.count ?? 0;
  }
  function pageLink(next: number) {
    const params = new URLSearchParams({ ...(q ? { q } : {}), ...(category ? { category } : {}), ...(tag ? { tag } : {}), page: String(next) });
    return `/search?${params}`;
  }
  return <main className="search-page max-w-screen-xl mx-auto px-4 sm:px-6 py-10">
    <h1 className="font-headline text-4xl font-bold">Search the newsroom</h1>
    <p className="my-4">Find stories by keyword, headline, category or author.</p>
    <form action="/search" role="search" className="story-search-form">
      <div><label htmlFor="search-query">Search stories</label><input id="search-query" type="search" name="q" defaultValue={q} maxLength={200} placeholder="Keyword, headline or author" /></div>
      <div><label htmlFor="search-category">Category</label><select id="search-category" name="category" defaultValue={category}><option value="">All categories</option>{CATEGORIES.map((name) => <option key={name}>{name}</option>)}</select></div>
      {tag && <input type="hidden" name="tag" value={tag} />}
      <button type="submit">Search</button>
    </form>
    {tag && <p className="my-4">Topic: <strong>{tag}</strong> · <Link href="/search">Clear topic</Link></p>}
    <p role="status" className="my-6">{unavailable ? "Search is temporarily unavailable. Please try again later." : count === 0 ? "No stories found. Try a different keyword or category." : `${count} ${count === 1 ? "story" : "stories"} found`}</p>
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{stories.map((story) => <StoryCard key={story.id} story={story} variant="grid" />)}</div>
    {!unavailable && <nav aria-label="Search results pages" className="flex justify-between my-8">
      {page > 1 ? <Link href={pageLink(page - 1)}>Previous page</Link> : <span />}
      {page * pageSize < count && <Link href={pageLink(page + 1)}>Next page</Link>}
    </nav>}
  </main>;
}

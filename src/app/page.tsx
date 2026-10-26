import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { normalizeCategory, categorySlug, isMainCategory, storyMatchesCategory } from "@/lib/categories";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import Link from "next/link";
import { StatePanel } from "@/components/StatePanel";
import { SubscribeForm } from "@/components/SubscribeForm";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { StoryCard } from "@/components/StoryCard";
import { PhotoDeskCard } from "@/components/PhotoDeskCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Story, StoryWithGallery } from "@/lib/types";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: HomePageProps): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const raw = readParam(searchParams?.category);
  if (!raw) return pageMetadata(SITE_NAME, SITE_DESCRIPTION, "/", true);
  const category = normalizeCategory(raw);
  const known = isMainCategory(category);
  return { ...pageMetadata(known ? category : "News archive", known ? `Latest ${category.toLowerCase()} reporting from ${SITE_NAME}.` : SITE_DESCRIPTION, `/?category=${encodeURIComponent(categorySlug(category))}`), ...(known ? {} : { robots: { index: false, follow: true } }) };
}

type BreakingStory = Pick<Story, "id" | "title" | "breaking_label">;

const LATEST_NEWS_WINDOW_HOURS = 72;
const LATEST_NEWS_LIMIT = 8;
const MORE_STORIES_LIMIT = 6;

async function getPublishedStories(): Promise<{
  error: boolean;
  stories: StoryWithGallery[];
}> {
  if (!hasSupabaseEnv()) {
    return {
      error: false,
      stories: [],
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return {
      error: Boolean(error),
      stories: data ?? [],
    };
  }

  const storyIds = data.map((story) => story.id);
  const { data: mediaRows } = await supabase
    .from("story_media")
    .select("story_id")
    .in("story_id", storyIds);

  const galleryCounts = (mediaRows ?? []).reduce<Record<string, number>>((counts, row) => {
    counts[row.story_id] = (counts[row.story_id] ?? 0) + 1;
    return counts;
  }, {});

  return {
    error: false,
    stories: data.map((story) => ({
      ...story,
      gallery_count: galleryCounts[story.id] ?? 0,
    })),
  };
}

async function getActiveBreakingStories(): Promise<BreakingStory[]> {
  if (!hasSupabaseEnv()) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("stories")
    .select("id, title, breaking_label")
    .eq("status", "published")
    .eq("is_breaking", true)
    .or(`breaking_expires_at.is.null,breaking_expires_at.gt.${now}`)
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
}

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getStoryDateValue(story: Pick<Story, "published_at" | "created_at">): number {
  return new Date(story.published_at ?? story.created_at).getTime();
}

function isWithinLatestWindow(story: Pick<Story, "published_at" | "created_at">, cutoff: number): boolean {
  const storyDateValue = getStoryDateValue(story);
  return Number.isFinite(storyDateValue) && storyDateValue >= cutoff;
}

export default async function HomePage(props: HomePageProps) {
  const searchParams = await props.searchParams;
  const { error: storiesLoadFailed, stories } = await getPublishedStories();
  const breakingStories = await getActiveBreakingStories();
  const activeBreakingIds = new Set(breakingStories.map((story) => story.id));
  const latestCutoff = Date.now() - LATEST_NEWS_WINDOW_HOURS * 60 * 60 * 1000;
  const selectedCategory = readParam(searchParams?.category);
  const categoryLabel = selectedCategory
    ? normalizeCategory(selectedCategory.replace(/-/g, " "))
    : null;
  const visibleStories = selectedCategory
    ? stories.filter((story) => storyMatchesCategory(story, selectedCategory))
    : stories;

  const editorialStories = visibleStories.filter(
    (story) => !activeBreakingIds.has(story.id) && story.story_type !== "photo_desk",
  );
  const featuredStory = editorialStories[0] ?? null;
  const featuredStoryId = featuredStory?.id;
  const recentStories = editorialStories
    .filter((story) => story.id !== featuredStoryId)
    .filter((story) => isWithinLatestWindow(story, latestCutoff));
  const latestNewsStories = recentStories.slice(0, LATEST_NEWS_LIMIT);
  const latestNewsIds = new Set(latestNewsStories.map((story) => story.id));
  const olderStories = editorialStories.filter(
    (story) =>
      story.id !== featuredStoryId &&
      !latestNewsIds.has(story.id) &&
      !isWithinLatestWindow(story, latestCutoff),
  );
  const spotlightStories = latestNewsStories.slice(0, 3);
  const latestGridStories = latestNewsStories.slice(3);
  const moreStories = olderStories.slice(0, MORE_STORIES_LIMIT);
  const remainingStories = olderStories.slice(MORE_STORIES_LIMIT);
  const photoDeskStories = visibleStories.filter((s) => s.story_type === "photo_desk");

  if (!hasSupabaseEnv()) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <StatePanel
          description="The publishing backend is not configured yet, so the homepage cannot load live stories right now."
          eyebrow="Newsroom Offline"
          title="Stories are temporarily unavailable"
          titleAs="h1"
          tone="warning"
        />
      </div>
    );
  }

  if (storiesLoadFailed) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <StatePanel
          description="Published stories could not be loaded from the newsroom database just now. Please refresh and try again."
          eyebrow="Load Failed"
          title="The front page is temporarily unavailable"
          titleAs="h1"
          tone="error"
        />
      </div>
    );
  }

  if (visibleStories.length === 0) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <StatePanel
          actions={selectedCategory ? <Link className="bg-primary text-white px-4 py-2 uppercase font-bold text-xs" href="/">Return to all stories</Link> : undefined}
          description={selectedCategory ? "There are no published stories in this section right now." : "The editor can sign in, create a story, and publish it to make it appear here for readers."}
          eyebrow={selectedCategory ? "No Section Stories" : "No Stories Yet"}
          title={selectedCategory ? `${categoryLabel} is empty right now` : "No published stories are live right now"}
          titleAs="h1"
        />
      </div>
    );
  }

  if (editorialStories.length === 0) {
    return (
      <>

        <div className="bg-primary-container text-on-primary py-2 overflow-hidden flex items-center">
          <div className="px-3 sm:px-5 flex-shrink-0 flex items-center gap-2 border-r border-white/20 mr-3 sm:mr-4">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-on-primary"></span>
            <span className="font-label font-bold text-xs uppercase tracking-widest">Breaking</span>
          </div>
          <div className="marquee-container flex-1 min-h-5">
            {breakingStories.length > 0 && (
              <div className="marquee-content inline-flex gap-8 sm:gap-12 text-xs sm:text-sm font-medium">
                {[...breakingStories, ...breakingStories].map((story, index) => (
                  <Link
                    className="max-w-[72vw] sm:max-w-none overflow-hidden text-ellipsis hover:underline"
                    href={`/story/${story.id}`}
                    key={`${story.id}-${index}`}
                  >
                    {story.breaking_label?.trim() || story.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="max-w-screen-xl mx-auto px-6 py-12">
          <StatePanel
            description="Active breaking updates are running in the strip above. Other published stories will appear here once they are no longer part of the breaking window."
            eyebrow="Breaking Updates"
            title="The homepage is focused on live breaking coverage right now"
            titleAs="h1"
          />
        </div>
      </>
    );
  }

  return (
    <>


      {/* Breaking News Marquee */}
      {breakingStories.length > 0 && (
      <div className="bg-primary-container text-on-primary py-2 overflow-hidden flex items-center">
        <div className="px-3 sm:px-5 flex-shrink-0 flex items-center gap-2 border-r border-white/20 mr-3 sm:mr-4">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-on-primary"></span>
          <span className="font-label font-bold text-xs uppercase tracking-widest">Breaking</span>
        </div>
        <div className="marquee-container flex-1 min-h-5">
          {breakingStories.length > 0 && (
            <div className="marquee-content inline-flex gap-8 sm:gap-12 text-xs sm:text-sm font-medium">
              {[...breakingStories, ...breakingStories].map((story, index) => (
                <Link
                  className="max-w-[72vw] sm:max-w-none overflow-hidden text-ellipsis hover:underline"
                  href={`/story/${story.id}`}
                  key={`${story.id}-${index}`}
                >
                  {story.breaking_label?.trim() || story.title}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      )}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 md:py-12 overflow-hidden">
        {!categoryLabel && <h1 className="sr-only">Frontline Daily — latest news</h1>}
        {categoryLabel && (
          <div className="mb-8 md:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6 border-b-2 border-primary/20 pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Section</p>
              <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">{categoryLabel}</h1>
            </div>
            <Link href="/" className="min-h-10 inline-flex items-center font-label text-xs font-extrabold uppercase tracking-widest text-zinc-500 hover:text-primary">
              All Stories &rarr;
            </Link>
          </div>
        )}

        {/* Hero & Sidebar Section */}
        {featuredStory && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
            {/* Lead Story */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <StoryCard story={featuredStory} variant="lead" />
            </div>

            {/* Latest News Sidebar */}
            <aside className="lg:col-span-4 flex flex-col gap-7 md:gap-8 border-t-2 lg:border-t-0 lg:border-l-2 border-outline-variant/30 pt-8 lg:pt-0 lg:pl-8">
              <div>
                <h3 className="font-headline text-xl font-bold tracking-tight text-primary">Latest News</h3>
                <p className="mt-2 text-xs text-on-surface-variant font-medium">Published in the last {LATEST_NEWS_WINDOW_HOURS} hours.</p>
              </div>

              <div className="flex flex-col gap-6 divide-y divide-outline-variant/20">
                {spotlightStories.map((story) => (
                  <StoryCard key={story.id} story={story} variant="sidebar" />
                ))}
                {spotlightStories.length === 0 && (
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    No additional recent updates in this section yet.
                  </p>
                )}
              </div>

              <SubscribeForm />
            </aside>
          </div>
        )}

        {/* Photo Desk Stories Grid */}
        {photoDeskStories.length > 0 && (
          <section className="mt-16 md:mt-20 pt-10 md:pt-12 border-t-2 border-outline-variant/30">
            <div className="flex items-end justify-between gap-4 sm:gap-6 mb-8 md:mb-10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Visual Reporting</p>
                <h3 className="font-headline text-3xl font-bold tracking-tight">Photo Desk</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7 md:gap-8">
              {photoDeskStories.map(story => (
                <PhotoDeskCard key={story.id} story={story} />
              ))}
            </div>
          </section>
        )}

        {/* Latest Stories Grid */}
        {latestGridStories.length > 0 && (
          <section className="mt-16 md:mt-20 pt-10 md:pt-12 border-t-2 border-outline-variant/30">
            <div className="flex items-end justify-between gap-4 sm:gap-6 mb-8 md:mb-10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Recent reporting</p>
                <h3 className="font-headline text-3xl font-bold tracking-tight">Latest News</h3>
              </div>
              <Link href="#archive" className="min-h-10 font-label text-xs font-extrabold uppercase tracking-widest flex items-center gap-1 group text-zinc-500 hover:text-primary">
                View Archive
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">&rarr;</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7 md:gap-8">
              {latestGridStories.map(story => (
                <StoryCard key={story.id} story={story} variant="grid" />
              ))}
            </div>
          </section>
        )}

        {/* More Stories */}
        {moreStories.length > 0 && (
          <section id="more-stories" className="mt-16 md:mt-20 pt-10 md:pt-12 border-t-2 border-outline-variant/30">
            <div className="flex items-end justify-between gap-4 sm:gap-6 mb-8 md:mb-10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">From the newsroom</p>
                <h3 className="font-headline text-3xl font-bold tracking-tight">More Stories</h3>
              </div>
              <Link href="#archive" className="min-h-10 font-label text-xs font-extrabold uppercase tracking-widest flex items-center gap-1 group text-zinc-500 hover:text-primary">
                View Archive
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">&rarr;</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7 md:gap-8">
              {moreStories.map(story => (
                <StoryCard key={story.id} story={story} variant="grid" />
              ))}
            </div>
          </section>
        )}

        {/* Top News Density List */}
        {remainingStories.length > 0 && (
          <section id="archive" className="mt-16 md:mt-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-10 md:pt-12 border-t border-outline-variant/30">
            <div className="lg:col-span-4">
              <h3 className="font-headline text-3xl sm:text-4xl font-bold text-primary leading-none mb-4 tracking-tight">The Archive</h3>
              <p className="text-on-surface-variant text-sm font-medium leading-relaxed mb-8">Older reporting and context from the Frontline Daily desk.</p>
              {remainingStories[0] && (
                <div className="bg-surface-container-lowest p-6 rounded-sm border border-outline-variant/30">
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Featured from Archive</h5>
                  <div className="flex flex-col gap-2">
                    <h6 className="font-headline text-xl font-bold leading-tight">{remainingStories[0].title}</h6>
                    {remainingStories[0].excerpt?.trim() && (
                      <p className="text-xs text-on-surface-variant line-clamp-3">{remainingStories[0].excerpt}</p>
                    )}
                    <Link href={`/story/${remainingStories[0].id}`} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline mt-2 inline-block">
                      Read Story &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-8">
              <div className="divide-y divide-outline-variant/20 border-y border-outline-variant/20">
                {remainingStories.map(story => (
                  <StoryCard key={story.id} story={story} variant="archive" />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

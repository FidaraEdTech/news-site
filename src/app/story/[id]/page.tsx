import Link from "next/link";
import { cache } from "react";
import { storyHtml } from "@/lib/story-content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommentSection } from "@/components/CommentSection";
import { ShareStoryButton } from "@/components/ShareStoryButton";
import { PhotoDeskViewer } from "@/components/PhotoDeskViewer";
import { ArticlePhotoSlider } from "@/components/ArticlePhotoSlider";
import { StatePanel } from "@/components/StatePanel";
import { SubscribeForm } from "@/components/SubscribeForm";
import { ViewTracker } from "@/components/ViewTracker";
import { getCurrentAdminSession } from "@/lib/auth";
import { categorySlug, parseStoryCategories } from "@/lib/categories";
import { getCanonicalUrl, getSiteUrl, SITE_NAME, toJsonLd } from "@/lib/site";
import {
  getStoryGalleryCount,
  getStoryImageUrl,
  getStoryVideoUrl,
  sortStoryMedia,
} from "@/lib/story-media";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Comment, Story, StoryMedia, StoryWithGallery } from "@/lib/types";

export const dynamic = "force-dynamic";

type StoryPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type StoryPageData = {
  comments: Comment[];
  commentsError: boolean;
  gallery: StoryMedia[];
  relatedStories: StoryWithGallery[];
  story: StoryWithGallery | null;
  storyError: boolean;
  isAdmin: boolean;
};

const storyMessages: Record<string, string> = {
  "comment-posted": "Your comment has been posted.",
  "comment-save-failed": "The comment could not be saved right now.",
  "comment-story": "This story is no longer accepting comments.",
  "comment-validation": "Please enter both your name and a message.",
  "missing-config": "The newsroom is temporarily unavailable.",
};

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const getPublishedStory = cache(async (id: string): Promise<Story | null> => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .single();

  return data;
});

export async function generateMetadata(props: StoryPageProps): Promise<Metadata> {
  const params = await props.params;
  const story = await getPublishedStory(params.id);

  if (!story) {
    return {
      title: "Story not found",
      robots: { index: false, follow: false },
    };
  }

  const canonicalUrl = getCanonicalUrl(`/story/${story.id}`);
  const imageUrl = getStoryImageUrl(story);
  const siteUrl = getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: story.title,
    description: story.excerpt || story.title,
    authors: [{ name: story.byline || SITE_NAME }],
    keywords: story.tags ?? [],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      title: story.title,
      description: story.excerpt || story.title,
      url: canonicalUrl,
      siteName: SITE_NAME,
      publishedTime: story.published_at ?? story.created_at,
      modifiedTime: story.updated_at,
      section: story.category,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: story.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: story.title,
      description: story.excerpt || story.title,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

async function getStoryPageData(id: string): Promise<StoryPageData> {
  const { isAdmin } = await getCurrentAdminSession();
  const supabase = await createSupabaseServerClient();
  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (storyError && storyError.code !== "PGRST116") {
    return {
      comments: [],
      commentsError: false,
      gallery: [],
      relatedStories: [],
      story: null,
      storyError: true,
      isAdmin,
    };
  }

  if (!story) {
    return {
      comments: [],
      commentsError: false,
      gallery: [],
      relatedStories: [],
      story: null,
      storyError: false,
      isAdmin,
    };
  }

  const { data: comments, error: commentsError } = await supabase
    .from("comments")
    .select("*")
    .eq("story_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data: relatedStories } = await supabase
    .from("stories")
    .select("*")
    .neq("id", id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3);

  const { data: galleryRows } = await supabase
    .from("story_media")
    .select("*")
    .eq("story_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const relatedStoryIds = (relatedStories ?? []).map((relatedStory) => relatedStory.id);
  const { data: relatedMediaRows } =
    relatedStoryIds.length > 0
      ? await supabase
          .from("story_media")
          .select("story_id")
          .in("story_id", relatedStoryIds)
      : { data: [] };

  const relatedGalleryCounts = (relatedMediaRows ?? []).reduce<Record<string, number>>((counts, row) => {
    counts[row.story_id] = (counts[row.story_id] ?? 0) + 1;
    return counts;
  }, {});

  return {
    comments: comments ?? [],
    commentsError: Boolean(commentsError),
    gallery: sortStoryMedia((galleryRows ?? []) as StoryMedia[]),
    relatedStories: (relatedStories ?? []).map((relatedStory) => ({
      ...relatedStory,
      gallery_count: relatedGalleryCounts[relatedStory.id] ?? 0,
    })),
    story: {
      ...story,
      gallery_count: (galleryRows ?? []).length,
    },
    storyError: false,
    isAdmin,
  };
}

export default async function StoryPage(props: StoryPageProps) {
  const params = await props.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) notFound();
  if (!hasSupabaseEnv()) {
    return (
      <div className="max-w-4xl mx-auto py-14 sm:py-20 px-4 sm:px-6">
        <StatePanel
          description="The publishing backend is not configured correctly yet."
          eyebrow="Newsroom Offline"
          title="This story is temporarily unavailable"
          titleAs="h1"
          tone="warning"
        />
      </div>
    );
  }

  const {
    story,
    gallery,
    comments,
    commentsError,
    relatedStories,
    storyError,
    isAdmin,
  } = await getStoryPageData(params.id);

  if (storyError || !story) {
    return (
      <div className="max-w-4xl mx-auto py-14 sm:py-20 px-4 sm:px-6">
        {storyError ? (
          <StatePanel
            actions={<Link className="bg-primary text-white px-4 py-2 uppercase font-bold text-xs" href="/">Return to front page</Link>}
            description="The article could not be loaded from the newsroom database right now. Please refresh and try again."
            eyebrow="Load Failed"
            title="This report is temporarily unavailable"
            titleAs="h1"
            tone="error"
          />
        ) : (
          notFound()
        )}
      </div>
    );
  }

  const primaryDate = new Date(story.published_at ?? story.created_at);
  const storyUrl = getCanonicalUrl(`/story/${story.id}`);
  const imageUrl = getStoryImageUrl(story);
  const videoUrl = getStoryVideoUrl(story);
  const newsArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: story.title,
    description: story.excerpt,
    datePublished: story.published_at ?? story.created_at,
    dateModified: story.updated_at,
    mainEntityOfPage: storyUrl,
    url: storyUrl,
    articleSection: story.category,
    author: {
      "@type": story.byline ? "Person" : "Organization",
      name: story.byline || SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: getSiteUrl(),
    },
    inLanguage: "en",
    keywords: (story.tags ?? []).join(", "),
    image: imageUrl ? [imageUrl] : undefined,
  };
  if (story.story_type === "photo_desk") {
    return <main>
      <h1 className="sr-only">{story.title}</h1>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(newsArticleJsonLd) }} />
      <PhotoDeskViewer story={story} comments={comments} isAdmin={isAdmin} />
    </main>;
  }
  return (
    <div className="bg-surface text-on-surface scroll-smooth min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(newsArticleJsonLd) }}
      />
      <ViewTracker storyId={story.id} />

      <main className="pt-10 sm:pt-14 lg:pt-16 pb-16 sm:pb-20 px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden">
        {/* Article Header Section */}
        <header className="max-w-4xl mx-auto mb-8 sm:mb-12">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-5 sm:mb-6">
            {parseStoryCategories(story.category).map((cat) => (
              <Link key={cat} href={`/?category=${encodeURIComponent(categorySlug(cat))}`} className="bg-primary text-on-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest hover:opacity-90">
                {cat}
              </Link>
            ))}
            {story.location && (
              <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
                {story.location}
              </span>
            )}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black font-headline leading-[1.05] tracking-tight mb-6 sm:mb-8">
            {story.title}
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-5 sm:gap-8 items-end border-t border-outline-variant/20 pt-6 sm:pt-8">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary font-headline flex-shrink-0">
                {SITE_NAME.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-sans text-sm font-bold">{story.byline || "Newsroom Desk"}</p>
                <p className="font-sans text-xs text-on-surface-variant uppercase tracking-widest">Editorial Team</p>
              </div>
            </div>
            <div className="text-left sm:text-right flex flex-col gap-1">
              <p className="font-sans text-[10px] text-on-surface-variant uppercase tracking-widest">Published {dateFormatter.format(primaryDate)}</p>
              {story.updated_at && story.updated_at !== story.created_at && (
                <p className="font-sans text-[10px] text-primary font-bold uppercase tracking-widest">Updated</p>
              )}
            </div>
          </div>
        </header>

        {/* Lead Visual & Photo Slider */}
        <div className="max-w-4xl mx-auto">
          <ArticlePhotoSlider
            featuredImageUrl={imageUrl}
            featuredAlt={story.title}
            gallery={gallery}
            videoUrl={videoUrl}
            videoCaption={story.video_caption}
          />
        </div>

        {/* Article Content */}
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-12 lg:gap-14">
          <article className="flex-1 min-w-0 max-w-3xl">
            {story.excerpt && story.excerpt.trim() !== "" && (
              <div className="font-headline text-xl sm:text-2xl font-medium leading-relaxed mb-8 sm:mb-10 text-on-surface/90 border-l-4 border-primary pl-5 sm:pl-8 italic">
                {story.excerpt}
              </div>
            )}
            {story.content && story.content.trim() !== "" && (
              <div className="story-rich-text text-on-surface text-base sm:text-lg font-body leading-relaxed sm:leading-loose" dangerouslySetInnerHTML={{ __html: storyHtml(story.content, story.content_format) }} />
            )}
            {!!story.tags?.length && <nav aria-label="Story topics" className="story-tags">{story.tags.map((tag) => <Link key={tag} href={`/search?tag=${encodeURIComponent(tag)}`}>{tag}</Link>)}</nav>}

            <div className="mt-10 sm:mt-12 border-t border-outline-variant/20 pt-6 sm:pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <ShareStoryButton title={story.title} text={story.excerpt} />
              <Link href="/newsletter" className="newsletter-link">
                Get Sunday updates in The Curator’s Digest <span aria-hidden="true">→</span>
              </Link>
            </div>

            {/* Comments Section */}
            <section className="mt-14 sm:mt-20 pt-8 sm:pt-10 border-t border-outline-variant/20">
              <CommentSection storyId={story.id} initialComments={comments} isAdmin={isAdmin} />
            </section>
          </article>

          {/* Sidebar: Related Stories */}
          <aside className="w-full lg:w-80 flex flex-col gap-10 lg:flex-shrink-0">
            <div>
              <h4 className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-primary mb-6 border-b-2 border-primary pb-2 inline-block">Recommended</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 lg:gap-8">
                {relatedStories.map((relStory) => (
                  <article className="group" key={relStory.id}>
                    <Link href={`/story/${relStory.id}`}>
                      {(() => {
                        const relatedImageUrl = getStoryImageUrl(relStory);
                        const galleryCount = getStoryGalleryCount(relStory);
                        return relatedImageUrl ? (
                          <div className="aspect-[4/3] w-full overflow-hidden bg-surface-container-highest mb-3 relative">
                            <img src={relatedImageUrl} alt={relStory.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            {galleryCount > 0 ? (
                              <span className="gallery-count-badge gallery-count-badge-overlay">
                                +{galleryCount} {galleryCount === 1 ? "photo" : "photos"}
                              </span>
                            ) : null}
                          </div>
                        ) : galleryCount > 0 ? (
                          <span className="gallery-count-badge">
                            +{galleryCount} {galleryCount === 1 ? "photo" : "photos"}
                          </span>
                        ) : null;
                      })()}
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{relStory.category}</span>
                      <h5 className="font-headline text-lg sm:text-xl font-bold leading-tight group-hover:underline mt-1">{relStory.title}</h5>
                    </Link>
                  </article>
                ))}
              </div>
            </div>

            {/* Newsletter Card */}
            <SubscribeForm />
          </aside>
        </div>
      </main>
    </div>
  );
}

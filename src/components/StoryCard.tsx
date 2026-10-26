import Link from "next/link";
import { parseStoryCategories } from "@/lib/categories";
import { getStoryGalleryCount, getStoryImageUrl } from "@/lib/story-media";
import type { StoryWithGallery } from "@/lib/types";

type StoryCardVariant = "lead" | "sidebar" | "grid" | "archive" | "search";

type StoryCardProps = {
  story: StoryWithGallery;
  variant: StoryCardVariant;
};

export function GalleryBadge({ count, overlay = false }: { count: number; overlay?: boolean }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span className={overlay ? "gallery-count-badge gallery-count-badge-overlay" : "gallery-count-badge"}>
      +{count} {count === 1 ? "photo" : "photos"}
    </span>
  );
}

export function formatDate(dateString: string | null) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(dateString));
}

export function formatTime(dateString: string | null) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(dateString));
}

export function StoryCard({ story, variant }: StoryCardProps) {
  const imageUrl = getStoryImageUrl(story);
  const galleryCount = story.gallery_count ?? getStoryGalleryCount(story);
  const storyUrl = `/story/${story.id}`;
  const categoryDisplay = parseStoryCategories(story.category).join(" · ") || story.category;

  if (variant === "search") {
    return <article className="search-result">
      {imageUrl && <Link href={storyUrl} tabIndex={-1} aria-hidden="true" className="search-result-image"><img src={imageUrl} alt="" loading="lazy" /></Link>}
      <div className="search-result-copy">
        <p className="search-result-meta">{categoryDisplay} <span aria-hidden="true">·</span> {formatDate(story.published_at || story.created_at)}</p>
        <h2><Link href={storyUrl}>{story.title}</Link></h2>
        {story.excerpt?.trim() && <p className="search-result-excerpt">{story.excerpt}</p>}
        {story.byline && <p className="search-result-author">By {story.byline}</p>}
      </div>
    </article>;
  }

  if (variant === "lead") {
    const featuredTitleClassName = imageUrl
      ? "font-headline text-3xl sm:text-4xl lg:text-5xl font-bold text-on-surface leading-[1.08] tracking-tight group-hover:text-primary transition-colors"
      : "font-headline text-2xl sm:text-3xl lg:text-4xl font-bold text-on-surface leading-[1.12] tracking-tight group-hover:text-primary transition-colors";

    return (
      <Link href={storyUrl} className="group cursor-pointer flex flex-col gap-4">
        {imageUrl ? (
          <div className="w-full bg-surface-container-highest overflow-hidden rounded-sm aspect-[16/9] relative">
            <img
              src={imageUrl}
              alt={story.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <GalleryBadge count={galleryCount} overlay />
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-primary font-label text-xs font-bold uppercase tracking-widest">
              {categoryDisplay}
            </span>
            <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
            <span className="text-zinc-500 font-label text-xs font-bold uppercase tracking-widest">
              {formatDate(story.published_at || story.created_at)}
            </span>
            {!imageUrl ? <GalleryBadge count={galleryCount} /> : null}
          </div>
          <h2 className={featuredTitleClassName}>
            {story.title}
          </h2>
          {story.excerpt?.trim() && (
            <p className="font-body text-on-surface-variant text-base sm:text-lg leading-relaxed max-w-3xl">
              {story.excerpt}
            </p>
          )}
        </div>
      </Link>
    );
  }

  if (variant === "sidebar") {
    return (
      <Link href={storyUrl} className="group cursor-pointer flex flex-col gap-3 pt-6 first:pt-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-primary font-label text-[11px] font-bold uppercase tracking-widest">{categoryDisplay}</span>
          <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
          <span className="text-zinc-500 font-label text-[11px] font-bold uppercase tracking-widest">
            {formatTime(story.published_at || story.created_at)}
          </span>
          {!imageUrl ? <GalleryBadge count={galleryCount} /> : null}
        </div>
        <div className="flex gap-4">
          <h4 className="font-headline text-lg sm:text-xl font-bold leading-tight group-hover:text-primary transition-colors flex-1">{story.title}</h4>
          {imageUrl ? (
            <div className="w-20 h-20 flex-shrink-0 overflow-hidden bg-surface-container-low rounded-sm relative">
              <img
                src={imageUrl}
                alt={story.title}
                className="w-full h-full object-cover transition-all duration-500"
              />
              <GalleryBadge count={galleryCount} overlay />
            </div>
          ) : null}
        </div>
      </Link>
    );
  }

  if (variant === "grid") {
    return (
      <Link href={storyUrl} className="flex flex-col group cursor-pointer">
        {imageUrl ? (
          <div className="aspect-[4/3] overflow-hidden rounded-sm mb-4 bg-surface-container-highest relative">
            <img
              src={imageUrl}
              alt={story.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <GalleryBadge count={galleryCount} overlay />
          </div>
        ) : <GalleryBadge count={galleryCount} />}
        
        <span className="text-primary font-label text-[11px] font-bold uppercase tracking-widest mb-2">{categoryDisplay}</span>
        <h4 className="font-headline text-lg font-bold leading-snug mb-2 group-hover:text-primary transition-colors">{story.title}</h4>
        {story.excerpt?.trim() && (
          <p className="text-xs text-on-surface-variant line-clamp-2">{story.excerpt}</p>
        )}
      </Link>
    );
  }

  if (variant === "archive") {
    return (
      <Link href={storyUrl} className="py-5 flex justify-between items-start gap-4 group cursor-pointer block hover:bg-surface-container-lowest transition-colors px-2 -mx-2">
        <div className="max-w-2xl">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2 block">
            {formatDate(story.published_at || story.created_at)} &bull; {categoryDisplay}
          </span>
          <GalleryBadge count={galleryCount} />
          <h4 className="font-headline text-lg sm:text-xl font-bold group-hover:text-primary transition-colors leading-snug">{story.title}</h4>
        </div>
        <span aria-hidden="true" className="hidden sm:inline text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-1">&rarr;</span>
      </Link>
    );
  }

  return null;
}

import Link from "next/link";
import { InlineMessage } from "@/components/InlineMessage";
import { ShareStoryButton } from "@/components/ShareStoryButton";
import { StatePanel } from "@/components/StatePanel";
import { StatusBadge } from "@/components/StatusBadge";
import { StoryForm } from "@/components/StoryForm";
import { AutoScroller } from "@/components/AutoScroller";
import { SubmitButton } from "@/components/SubmitButton";
import { requireAdminUser } from "@/lib/auth";
import { parseStoryCategories } from "@/lib/categories";
import { getCanonicalUrl } from "@/lib/site";
import { getStoryImageUrl } from "@/lib/story-media";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StoryMedia } from "@/lib/types";

import { deleteStoryAction, saveStoryAction } from "../actions";

export const dynamic = "force-dynamic";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

async function getStoriesData(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: stories, error: storiesError } = await supabase
    .from("stories")
    .select("*")
    .eq("author_id", userId)
    .order("updated_at", { ascending: false });

  if (storiesError || !stories || stories.length === 0) {
    return { stories: [], commentCountsByStory: {}, mediaByStory: {}, commentsLoadFailed: false, storiesLoadFailed: !!storiesError };
  }

  const storyIds = stories.map((story) => story.id);
  const { data: commentRows, error: commentsError } = await supabase
    .from("comments")
    .select("story_id")
    .is("deleted_at", null)
    .in("story_id", storyIds);

  const commentCountsByStory = (commentRows || []).reduce<Record<string, number>>((counts, row) => {
    counts[row.story_id] = (counts[row.story_id] ?? 0) + 1;
    return counts;
  }, {});

  const { data: mediaRows } = await supabase
    .from("story_media")
    .select("*")
    .in("story_id", storyIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const mediaByStory = ((mediaRows ?? []) as StoryMedia[]).reduce<Record<string, StoryMedia[]>>((groups, media) => {
    groups[media.story_id] = [...(groups[media.story_id] ?? []), media];
    return groups;
  }, {});

  return { stories, commentCountsByStory, mediaByStory, commentsLoadFailed: !!commentsError, storiesLoadFailed: false };
}

type StoriesPageProps = {
  searchParams?: Promise<{ notice?: string; error?: string }>;
};

const noticeMessages: Record<string, string> = {
  "draft-saved": "Draft saved successfully",
  "story-published": "Story published successfully",
  "story-deleted": "Story deleted",
};

const errorMessages: Record<string, string> = {
  "story-validation": "Story failed to save. Please make sure title (>3 chars), excerpt (>10 chars), and content (>20 chars) are long enough.",
  "image-type": "The featured image is not a supported file type.",
  "gallery-image-type": "One or more gallery images is not a supported file type.",
  "image-size": "The featured image exceeds the maximum file size.",
  "gallery-image-size": "One or more gallery images exceeds the maximum file size.",
  "missing-config": "The database connection is not configured.",
  "story-save-failed": "A database error occurred while saving the story.",
  "gallery-save-failed": "A database error occurred while saving the gallery.",
  "gallery-upload-failed": "Failed to upload one or more gallery images.",
};

export default async function StoriesPage(props: StoriesPageProps) {
  const searchParams = await props.searchParams;
  const user = await requireAdminUser();
  const { stories, storiesLoadFailed, commentsLoadFailed, commentCountsByStory, mediaByStory } = await getStoriesData(user.id);

  const noticeText = searchParams?.notice ? noticeMessages[searchParams.notice] : undefined;
  const errorText = searchParams?.error ? (errorMessages[searchParams.error] || "An unexpected error occurred.") : undefined;

  return (
    <>
      <AutoScroller />
      {noticeText && (
        <div className="mb-6">
          <InlineMessage tone="success" title="Success">{noticeText}</InlineMessage>
        </div>
      )}
      {errorText && (
        <div className="mb-6">
          <InlineMessage tone="error" title="Action Failed">{errorText}</InlineMessage>
        </div>
      )}
      <div id="new-story" className="w-full mb-10">
        <div className="bg-surface p-4 sm:p-6 lg:p-8 pb-4 rounded-t border border-b-0 border-border border-l-4 border-l-primary flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-2xl sm:text-3xl font-black mb-2">Create a New Story</h2>
            <p className="text-sm text-muted font-medium">Drafts are saved to the editorial workspace.</p>
          </div>
          <Link
            href="/dashboard/categories"
            className="button secondary button-compact text-xs"
          >
            Manage Categories →
          </Link>
        </div>
        <div className="bg-surface p-4 sm:p-6 lg:p-8 pt-0 rounded-b border border-t-0 border-border border-l-4 border-l-primary">
          <StoryForm action={saveStoryAction} title="" description="" />
        </div>
      </div>

      <div className="bg-surface p-4 sm:p-6 lg:p-8 rounded border border-border">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 sm:mb-6 border-b border-border pb-4">
          <h2 className="font-headline text-xl sm:text-2xl font-bold italic">Story Library</h2>
          <Link
            href="/dashboard/categories"
            className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
          >
            Edit Categories Across Stories →
          </Link>
        </div>

        {storiesLoadFailed ? (
          <StatePanel title="Unavailable" description="Stories failed to load" eyebrow="Error" tone="error" />
        ) : stories.length === 0 ? (
          <StatePanel title="No stories yet" description="Start a draft below." eyebrow="Empty" tone="default" />
        ) : (
          <div className="flex flex-col gap-4">
            {stories.map((story) => {
              const storyCategories = parseStoryCategories(story.category);
              const editPageHref =
                story.story_type === "photo_desk"
                  ? `/dashboard/photo-desk/${story.id}`
                  : `/dashboard/stories/${story.id}`;

              return (
                <details key={story.id} className="group bg-surface-muted border border-border rounded">
                  <summary className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 cursor-pointer hover:bg-surface-strong transition-colors list-none">
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
                        <StatusBadge status={story.status} />
                        {story.story_type === "photo_desk" && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-accent-soft text-primary border border-border flex-shrink-0">
                            Photo Desk
                          </span>
                        )}
                        <span className="font-bold text-lg font-headline truncate block min-w-0">{story.title}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted font-medium">
                        <span>Updated {dateTimeFormatter.format(new Date(story.updated_at))}</span>
                        {storyCategories.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-on-surface font-semibold">
                              {storyCategories.join(", ")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-primary group-open:hidden flex-shrink-0 md:ml-4">
                      Edit Options v
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-primary hidden group-open:block flex-shrink-0 md:ml-4">
                      Close ^
                    </div>
                  </summary>
                  <div className="p-4 sm:p-6 border-t border-border bg-white flex flex-col gap-6">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 bg-surface-muted p-4 rounded">
                      <div className="text-xs text-muted flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <span><strong>Comments:</strong> {commentsLoadFailed ? "-" : commentCountsByStory[story.id] ?? 0}</span>
                        <span><strong>Media:</strong> {getStoryImageUrl(story) ? "Featured image" : "No featured image"}</span>
                        <span><strong>Gallery:</strong> {mediaByStory[story.id]?.length ?? 0}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <Link
                          href={editPageHref}
                          className="min-h-11 px-4 py-2 bg-primary text-white text-xs font-bold uppercase hover:opacity-90 inline-flex items-center justify-center rounded"
                        >
                          Edit on Separate Page →
                        </Link>
                        {story.status === "published" && (
                          <>
                            <Link
                              href={`/story/${story.id}`}
                              className="min-h-11 px-4 py-2 border border-border text-xs font-bold uppercase hover:bg-surface-strong inline-flex items-center justify-center"
                            >
                              View Live
                            </Link>
                            <ShareStoryButton
                              title={story.title}
                              text={story.excerpt}
                              url={getCanonicalUrl(`/story/${story.id}`)}
                              label="Copy Link"
                              copiedLabel="Link copied"
                              preferNativeShare={false}
                              className="min-h-11 w-full sm:w-auto px-4 py-2 border border-border text-xs font-bold uppercase hover:bg-surface-strong inline-flex items-center justify-center text-primary"
                            />
                          </>
                        )}
                        {story.status !== "published" && (
                          <span className="min-h-11 px-4 py-2 border border-border text-xs font-bold uppercase text-muted inline-flex items-center justify-center">
                            Publish to share
                          </span>
                        )}
                        <form action={deleteStoryAction}>
                          <input type="hidden" name="story_id" value={story.id} />
                          <SubmitButton
                            className="min-h-11 w-full sm:w-auto px-4 py-2 bg-danger-soft text-danger text-xs font-bold uppercase hover:opacity-80"
                            pendingLabel="Deleting..."
                          >
                            Delete
                          </SubmitButton>
                        </form>
                      </div>
                    </div>

                    <StoryForm action={saveStoryAction} story={story} gallery={mediaByStory[story.id] ?? []} title="Edit Story" description="" />
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

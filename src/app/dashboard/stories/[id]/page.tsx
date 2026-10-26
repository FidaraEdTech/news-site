import Link from "next/link";
import { notFound } from "next/navigation";
import { InlineMessage } from "@/components/InlineMessage";
import { ShareStoryButton } from "@/components/ShareStoryButton";
import { StatusBadge } from "@/components/StatusBadge";
import { StoryForm } from "@/components/StoryForm";
import { SubmitButton } from "@/components/SubmitButton";
import { requireAdminUser } from "@/lib/auth";
import { parseStoryCategories } from "@/lib/categories";
import { getCanonicalUrl } from "@/lib/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StoryMedia } from "@/lib/types";
import { deleteStoryAction, saveStoryAction } from "../../actions";

export const dynamic = "force-dynamic";

type EditStoryPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ notice?: string; error?: string }>;
};

const noticeMessages: Record<string, string> = {
  "draft-saved": "Draft saved successfully",
  "story-published": "Story published successfully",
};

const errorMessages: Record<string, string> = {
  "story-validation":
    "Story failed to save. Please make sure title (>3 chars), category, and content are valid.",
  "image-type": "The featured image is not a supported file type.",
  "gallery-image-type": "One or more gallery images is not a supported file type.",
  "image-size": "The featured image exceeds the maximum file size.",
  "gallery-image-size": "One or more gallery images exceeds the maximum file size.",
  "missing-config": "The database connection is not configured.",
  "story-save-failed": "A database error occurred while saving the story.",
  "gallery-save-failed": "A database error occurred while saving the gallery.",
  "gallery-upload-failed": "Failed to upload one or more gallery images.",
};

export default async function EditStoryPage(props: EditStoryPageProps) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const user = await requireAdminUser();
  const supabase = await createSupabaseServerClient();

  const { data: story, error } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .eq("author_id", user.id)
    .single();

  if (error || !story) {
    notFound();
  }

  const { data: mediaRows } = await supabase
    .from("story_media")
    .select("*")
    .eq("story_id", story.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const gallery = (mediaRows ?? []) as StoryMedia[];
  const categories = parseStoryCategories(story.category);

  const noticeText = searchParams?.notice ? noticeMessages[searchParams.notice] : undefined;
  const errorText = searchParams?.error
    ? errorMessages[searchParams.error] || "An unexpected error occurred."
    : undefined;

  return (
    <div className="dashboard-stories-stack">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Link
              href="/dashboard/stories"
              className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
            >
              ← Back to Story Library
            </Link>
            <span className="text-muted">•</span>
            <Link
              href="/dashboard/categories"
              className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
            >
              Manage Categories
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={story.status} />
            <h1 className="font-headline text-2xl sm:text-3xl font-black text-on-surface">
              Edit Story: {story.title}
            </h1>
          </div>
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-xs font-semibold text-muted mr-1">Categories:</span>
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="text-xs font-bold px-2 py-0.5 rounded bg-accent-soft text-primary"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {story.status === "published" && (
            <>
              <Link
                href={`/story/${story.id}`}
                className="min-h-11 px-4 py-2 border border-border text-xs font-bold uppercase hover:bg-surface-strong inline-flex items-center justify-center rounded"
              >
                View Live Story
              </Link>
              <ShareStoryButton
                title={story.title}
                text={story.excerpt}
                url={getCanonicalUrl(`/story/${story.id}`)}
                label="Copy Link"
                copiedLabel="Link copied"
                preferNativeShare={false}
                className="min-h-11 px-4 py-2 border border-border text-xs font-bold uppercase hover:bg-surface-strong inline-flex items-center justify-center text-primary rounded"
              />
            </>
          )}
          <form action={deleteStoryAction}>
            <input type="hidden" name="story_id" value={story.id} />
            <SubmitButton
              className="min-h-11 px-4 py-2 bg-danger-soft text-danger text-xs font-bold uppercase hover:opacity-80 rounded"
              pendingLabel="Deleting..."
            >
              Delete Story
            </SubmitButton>
          </form>
        </div>
      </div>

      {noticeText && (
        <div className="mb-6">
          <InlineMessage tone="success" title="Success">
            {noticeText}
          </InlineMessage>
        </div>
      )}
      {errorText && (
        <div className="mb-6">
          <InlineMessage tone="error" title="Action Failed">
            {errorText}
          </InlineMessage>
        </div>
      )}

      <div className="bg-surface p-4 sm:p-6 lg:p-8 rounded border border-border border-l-4 border-l-primary">
        <StoryForm
          action={saveStoryAction}
          story={story}
          gallery={gallery}
          title="Edit Story & Categories"
          description="Update the headline, assign one or multiple categories, edit the story body, or manage media."
        />
      </div>
    </div>
  );
}

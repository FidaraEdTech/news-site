import Link from "next/link";
import { DigestBuilder } from "@/components/DigestBuilder";
import { requireAdminUser } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";
import { getNewsletterUrl } from "@/lib/site-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const dashboardMessages: Record<string, string> = {
  "admin-setup": "Add the admin email to public.admin_users in Supabase before using dashboard write actions.",
  "gallery-image-size": "Gallery images must be 5 MB or smaller.",
  "gallery-image-type": "Gallery uploads must use supported image files.",
  "gallery-save-failed": "Gallery images could not be saved. Make sure the story_media migration has been applied.",
  "gallery-upload-failed": "A gallery image could not be uploaded. Check your bucket policies and try again.",
  "image-size": "Featured image files must be 5 MB or smaller.",
  "image-type": "Featured image uploads must use an image file.",
  "image-url": "Featured image fallback URLs must start with http:// or https://.",
  "missing-config": "Supabase environment values are missing.",
  "storage-delete-failed": "A media file could not be removed from storage. The story was left unchanged.",
  "storage-upload-failed": "A media upload failed. Check your bucket policies and try again.",
  "story-deleted": "Story deleted successfully.",
  "story-delete-failed": "The story could not be deleted.",
  "story-not-found": "That story was not found for this admin account.",
  "story-save-failed": "The story could not be saved.",
  "story-saved": "Story changes saved successfully.",
  "story-validation": "Title, category, excerpt, and content are all required.",
  "video-caption": "Video captions must be 200 characters or fewer.",
  "video-size": "Video files must be 80 MB or smaller.",
  "video-type": "Video uploads must use a video file.",
};

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

async function getDashboardData(userId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: stories, error: storiesError }, { data: subscriberRows }] = await Promise.all([
    supabase
      .from("stories")
      .select("*")
      .eq("author_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("contact_messages")
      .select("id, email, created_at")
      .eq("name", "NEWSLETTER_SUBSCRIBER")
      .order("created_at", { ascending: false }),
  ]);

  const seenEmails = new Set<string>();
  const subscribers: Array<{ email: string; created_at: string }> = [];
  for (const row of subscriberRows ?? []) {
    const email = row.email?.trim().toLowerCase();
    if (!email || email === "test-verify@frontlinedaily.org" || seenEmails.has(email)) {
      continue;
    }
    seenEmails.add(email);
    subscribers.push({ email, created_at: row.created_at });
  }

  if (storiesError || !stories) {
    return { stories: [], commentsLoadFailed: false, totalComments: 0, subscribers };
  }
  if (stories.length === 0) {
    return { stories, commentsLoadFailed: false, totalComments: 0, subscribers };
  }

  const storyIds = stories.map((story) => story.id);
  const { data: commentRows, error: commentsError } = await supabase
    .from("comments")
    .select("story_id")
    .is("deleted_at", null)
    .in("story_id", storyIds);

  if (commentsError || !commentRows) {
    return { stories, commentsLoadFailed: true, totalComments: 0, subscribers };
  }

  return {
    stories,
    commentsLoadFailed: false,
    totalComments: commentRows.length,
    subscribers,
  };
}

export default async function DashboardPage(props: DashboardPageProps) {
  const searchParams = await props.searchParams;
  const user = await requireAdminUser();
  const [{ stories, commentsLoadFailed, totalComments, subscribers }, newsletterUrl] = await Promise.all([
    getDashboardData(user.id),
    getNewsletterUrl(),
  ]);

  const publishedStories = stories.filter((story) => story.status === "published");
  const draftStories = stories.filter((story) => story.status === "draft");

  const noticeCode = readParam(searchParams?.notice);
  const errorCode = readParam(searchParams?.error);
  const fileName = readParam(searchParams?.file);
  const bannerText = dashboardMessages[noticeCode ?? errorCode ?? ""];
  const isError = Boolean(errorCode);

  return (
    <>
      {bannerText && (
         <div className={`p-4 border-l-4 font-bold text-sm mb-8 ${isError ? 'bg-danger-soft text-danger border-danger' : 'bg-success-soft text-success border-success'}`}>
           {bannerText}
           {fileName ? ` (${fileName})` : ""}
         </div>
      )}

      <div className="bg-surface p-5 sm:p-8 rounded border border-border mb-6 sm:mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-2xl sm:text-3xl font-bold mb-2">Editorial Dashboard</h2>
          <p className="text-sm text-muted">Welcome back. Manage your stories, categories, and newsletter below.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/stories#new-story"
            className="px-4 py-2.5 rounded bg-primary text-white text-xs font-bold uppercase tracking-wider hover:opacity-90"
          >
            + Create New Story
          </Link>
          <Link
            href="/dashboard/categories"
            className="px-4 py-2.5 rounded border border-primary bg-accent-soft text-primary text-xs font-bold uppercase tracking-wider hover:opacity-90"
          >
            Edit &amp; Manage Categories
          </Link>
          <Link
            href="/dashboard/stories"
            className="px-4 py-2.5 rounded border border-border bg-white text-on-surface text-xs font-bold uppercase tracking-wider hover:border-primary"
          >
            Story Library
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
         <div className="bg-surface p-5 sm:p-8 rounded border border-border flex flex-col justify-center relative overflow-hidden min-h-32">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-muted mb-2">Total Stories</h4>
            <div className="font-headline text-5xl sm:text-6xl font-black text-on-surface">{stories.length}</div>
         </div>
         <div className="bg-surface p-5 sm:p-8 rounded border border-border flex flex-col justify-center border-b-4 border-success min-h-32">
            <h4 className="font-bold text-xs uppercase tracking-widest text-muted mb-2">Published Live</h4>
            <div className="font-headline text-4xl sm:text-5xl font-black text-on-surface">{publishedStories.length}</div>
         </div>
         <div className="bg-surface p-5 sm:p-8 rounded border border-border flex flex-col justify-center border-b-4 border-warning min-h-32">
            <h4 className="font-bold text-xs uppercase tracking-widest text-muted mb-2">Drafts Waiting</h4>
            <div className="font-headline text-4xl sm:text-5xl font-black text-on-surface">{draftStories.length}</div>
         </div>
         <div className="bg-surface p-5 sm:p-8 rounded border border-border flex flex-col justify-center min-h-32">
            <h4 className="font-bold text-xs uppercase tracking-widest text-muted mb-2">Engagement</h4>
            <div className="font-headline text-4xl sm:text-5xl font-black text-primary">
               {commentsLoadFailed ? "-" : totalComments}
            </div>
         </div>
      </div>

      <DigestBuilder
        stories={publishedStories}
        newsletterUrl={newsletterUrl}
        siteUrl={getSiteUrl()}
        initialSubscribers={subscribers}
      />
    </>
  );
}

import Link from "next/link";
import { CategoriesManagerClient } from "@/components/CategoriesManagerClient";
import { requireAdminUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardCategoriesPage() {
  const user = await requireAdminUser();
  const supabase = await createSupabaseServerClient();

  const { data: stories } = await supabase
    .from("stories")
    .select("id, title, category, status, story_type, updated_at")
    .eq("author_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="dashboard-stories-stack">
      <div className="dashboard-page-intro flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Taxonomy &amp; Sections</span>
          <h1 className="dashboard-page-title">Categories Manager</h1>
          <p className="text-sm text-muted mt-1">
            Add new categories, rename or delete existing categories, and assign multiple categories to any news story.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/stories" className="button secondary button-compact">
            ← Back to Stories
          </Link>
        </div>
      </div>

      <CategoriesManagerClient initialStories={stories ?? []} />
    </div>
  );
}

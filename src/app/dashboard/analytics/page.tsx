import { requireAdminUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

async function getAnalyticsData(userId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: stories, error: storiesError } = await supabase
    .from("stories")
    .select("*")
    .eq("author_id", userId)
    .order("updated_at", { ascending: false });

  if (storiesError || !stories) {
    return { stories: [], commentCountsByStory: {}, totalComments: 0, totalViews: 0, failed: true };
  }

  if (stories.length === 0) {
    return { stories: [], commentCountsByStory: {}, totalComments: 0, totalViews: 0, failed: false };
  }

  const totalViews = stories.reduce((sum, s) => sum + (s.views ?? 0), 0);

  const storyIds = stories.map((s) => s.id);
  const { data: commentRows } = await supabase
    .from("comments")
    .select("story_id")
    .is("deleted_at", null)
    .in("story_id", storyIds);

  const commentCountsByStory = (commentRows || []).reduce<Record<string, number>>((acc, row) => {
    acc[row.story_id] = (acc[row.story_id] ?? 0) + 1;
    return acc;
  }, {});

  const totalComments = commentRows?.length ?? 0;

  return { stories, commentCountsByStory, totalComments, totalViews, failed: false };
}

export default async function AnalyticsPage() {
  const user = await requireAdminUser();
  const { stories, commentCountsByStory, totalComments, totalViews, failed } = await getAnalyticsData(user.id);

  const publishedStories = stories.filter((s) => s.status === "published");
  const draftStories = stories.filter((s) => s.status === "draft");
  const avgViews = stories.length > 0 ? Math.round(totalViews / stories.length) : 0;

  // Sort by a trending score: views * 1 + comments * 5
  const rankedStories = [...stories]
    .map((s) => ({
      ...s,
      commentCount: commentCountsByStory[s.id] ?? 0,
      trendingScore: (s.views ?? 0) + (commentCountsByStory[s.id] ?? 0) * 5,
    }))
    .sort((a, b) => b.trendingScore - a.trendingScore);

  const topPerformer = rankedStories[0] ?? null;

  if (failed) {
    return (
      <div className="analytics-error-panel">
        <p>Analytics data could not be loaded. Please try again.</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="analytics-header">
        <h2>Platform Analytics</h2>
        <p>Deep-dive into your editorial performance and reader engagement.</p>
      </div>

      {/* KPI Cards */}
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi-card">
          <span className="analytics-kpi-label">Total Views</span>
          <span className="analytics-kpi-value">{totalViews.toLocaleString()}</span>
        </div>
        <div className="analytics-kpi-card">
          <span className="analytics-kpi-label">Total Comments</span>
          <span className="analytics-kpi-value">{totalComments.toLocaleString()}</span>
        </div>
        <div className="analytics-kpi-card">
          <span className="analytics-kpi-label">Avg. Views / Story</span>
          <span className="analytics-kpi-value">{avgViews.toLocaleString()}</span>
        </div>
        <div className="analytics-kpi-card">
          <span className="analytics-kpi-label">Published</span>
          <span className="analytics-kpi-value analytics-kpi-accent">{publishedStories.length}</span>
        </div>
        <div className="analytics-kpi-card">
          <span className="analytics-kpi-label">Drafts</span>
          <span className="analytics-kpi-value">{draftStories.length}</span>
        </div>
      </div>

      {/* Top Performer Highlight */}
      {topPerformer && (
        <div className="analytics-top-performer">
          <div className="analytics-top-performer-badge">Top Performer</div>
          <h3 className="analytics-top-performer-title">{topPerformer.title}</h3>
          <div className="analytics-top-performer-stats">
            <span>{(topPerformer.views ?? 0).toLocaleString()} views</span>
            <span className="analytics-dot">/</span>
            <span>{topPerformer.commentCount} comments</span>
            <span className="analytics-dot">/</span>
            <span className="analytics-top-performer-score">Score: {topPerformer.trendingScore}</span>
          </div>
        </div>
      )}

      {/* Story Performance Table */}
      <div className="analytics-table-wrapper">
        <h3 className="analytics-table-heading">Story Performance</h3>
        <div className="analytics-table-scroll">
          <table className="analytics-table">
            <thead>
              <tr>
                <th className="analytics-th analytics-th-rank">#</th>
                <th className="analytics-th">Title</th>
                <th className="analytics-th analytics-th-num">Views</th>
                <th className="analytics-th analytics-th-num">Comments</th>
                <th className="analytics-th analytics-th-num">Score</th>
                <th className="analytics-th">Status</th>
                <th className="analytics-th">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rankedStories.map((story, idx) => (
                <tr key={story.id} className={`analytics-tr ${idx === 0 ? "analytics-tr-top" : ""}`}>
                  <td className="analytics-td analytics-td-rank">{idx + 1}</td>
                  <td className="analytics-td analytics-td-title">{story.title}</td>
                  <td className="analytics-td analytics-td-num">{(story.views ?? 0).toLocaleString()}</td>
                  <td className="analytics-td analytics-td-num">{story.commentCount}</td>
                  <td className="analytics-td analytics-td-num analytics-td-score">{story.trendingScore}</td>
                  <td className="analytics-td">
                    <span className={`analytics-status ${story.status === "published" ? "analytics-status-live" : "analytics-status-draft"}`}>
                      {story.status === "published" ? "Live" : "Draft"}
                    </span>
                  </td>
                  <td className="analytics-td analytics-td-date">{dateFormatter.format(new Date(story.updated_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

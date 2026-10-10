import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const { storyId } = await request.json();
    if (!storyId || typeof storyId !== "string" || !UUID_PATTERN.test(storyId)) {
      return NextResponse.json({ error: "Missing storyId" }, { status: 400 });
    }

    // Prevent DoS / view inflation: check if this device already viewed this story recently.
    const cookieName = `viewed_${storyId}`;
    if (request.cookies.get(cookieName)?.value === "true") {
      return NextResponse.json({ ok: true, skipped: true }); // Acknowledge smoothly without incrementing
    }

    if (!hasSupabaseEnv()) {
      return NextResponse.json({ ok: true, skipped: true, reason: "missing-config" });
    }

    const supabase = await createSupabaseServerClient();

    // Try RPC first (atomic), fall back to direct update
    const { error: rpcError } = await (supabase as any).rpc("increment_views", { story_id_input: storyId });
    
    if (rpcError) {
      // Fallback: direct update if RPC function doesn't exist yet
      const { data: story } = await supabase
        .from("stories")
        .select("views")
        .eq("id", storyId)
        .eq("status", "published")
        .single();
      
      if (story) {
        await supabase
          .from("stories")
          .update({ views: (story.views ?? 0) + 1 })
          .eq("id", storyId);
      }
    }

    // Set cookie to prevent immediate re-viewing for a duration (e.g. 1 hour)
    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieName, "true", {
      path: "/",
      maxAge: 60 * 60, // 1 hour
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Failed to record view" }, { status: 500 });
  }
}

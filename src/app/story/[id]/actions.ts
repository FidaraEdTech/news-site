"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth";
import {
  enforceSubmissionThrottle,
  enforceDurableSubmissionThrottle,
  moderateSubmissionText,
  normalizeSubmissionText,
} from "@/lib/abuse-protection";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export type CommentActionState = {
  status: "idle" | "success" | "error";
  message: string;
  newComment?: {
    id: string;
    story_id: string;
    author_name: string;
    body: string;
    parent_id: string | null;
    created_at: string;
  };
};

export async function addCommentAction(
  _prevState: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  const storyId = readText(formData, "story_id");
  const authorName = normalizeSubmissionText(readText(formData, "author_name"));
  const body = normalizeSubmissionText(readText(formData, "body"));
  const parentId = readText(formData, "parent_id") || null;

  if (!isUuid(storyId)) {
    return { status: "error", message: "Invalid story." };
  }

  if (parentId && !isUuid(parentId)) {
    return { status: "error", message: "The comment you're replying to is invalid." };
  }

  if (!hasSupabaseEnv()) {
    return { status: "error", message: "The newsroom backend is not configured." };
  }

  if (authorName.length < 2 || authorName.length > 80) {
    return { status: "error", message: "Name must be between 2 and 80 characters." };
  }

  if (body.length < 2 || body.length > 1000) {
    return { status: "error", message: "Comment must be between 2 and 1000 characters." };
  }

  const moderation = moderateSubmissionText(`${authorName}\n${body}`, { maxLinks: 2 });
  if (!moderation.ok) {
    return { status: "error", message: moderation.message };
  }

  const throttle = await enforceSubmissionThrottle({
    scope: "comment",
    normalizedText: `${storyId}:${parentId ?? ""}:${authorName}:${body}`,
    cooldownSeconds: 45,
    windowSeconds: 10 * 60,
    maxSubmissions: 5,
  });

  if (!throttle.ok) {
    return { status: "error", message: throttle.message };
  }

  const supabase = await createSupabaseServerClient();

  const durableThrottle = await enforceDurableSubmissionThrottle({
    supabase,
    scope: "comment",
    normalizedText: `${storyId}:${parentId ?? ""}:${authorName}:${body}`,
    cooldownSeconds: 45,
    windowSeconds: 10 * 60,
    maxSubmissions: 5,
  });

  if (!durableThrottle.ok) {
    return { status: "error", message: durableThrottle.message };
  }

  // Verify story exists and is published
  try {
    const { data: story } = await supabase
      .from("stories")
      .select("id")
      .eq("id", storyId)
      .eq("status", "published")
      .single();

    if (!story) {
      return { status: "error", message: "This story is no longer accepting comments." };
    }

    // If replying, verify the parent is a top-level comment on this story.
    if (parentId) {
      const { data: parentComment } = await supabase
        .from("comments")
        .select("id, parent_id")
        .eq("id", parentId)
        .eq("story_id", storyId)
        .is("parent_id", null)
        .single();

      if (!parentComment) {
        return { status: "error", message: "The comment you're replying to no longer exists." };
      }
    }

    const { data: newComment, error } = await supabase
      .from("comments")
      .insert({
        story_id: storyId,
        author_name: authorName,
        body,
        parent_id: parentId,
      })
      .select("*")
      .single();

    if (error || !newComment) {
      return { status: "error", message: "Your comment could not be saved. IMPORTANT: Have you run the schema-replies-migration.sql script in your Supabase SQL editor? The parent_id column might be missing." };
    }

    revalidatePath(`/story/${storyId}`);

    return {
      status: "success",
      message: "Your comment has been posted.",
      newComment,
    };
  } catch (err) {
    console.error("Comment submission error:", err);
    return { status: "error", message: "An unexpected database error occurred. Ensure your Supabase migrations are up to date." };
  }
}

export async function deleteCommentAction(commentId: string, storyId: string) {
  if (!hasSupabaseEnv()) {
    return { status: "error", message: "Backend not configured" };
  }

  if (!isUuid(commentId) || !isUuid(storyId)) {
    return { status: "error", message: "Invalid comment." };
  }

  const supabase = await createSupabaseServerClient();
  const user = await requireAdminUser();
  const removedAt = new Date().toISOString();
  const { data: removedRows, error } = await supabase
    .from("comments")
    .update({
      deleted_at: removedAt,
      deleted_by: user.id,
      moderation_reason: "Removed by newsroom moderator",
    })
    .eq("story_id", storyId)
    .or(`id.eq.${commentId},parent_id.eq.${commentId}`)
    .select("id");

  if (error) {
    console.error("Delete comment error:", error);
    if (/deleted_at|deleted_by|moderation_reason/i.test(error.message)) {
      return {
        status: "error",
        message: "Comment moderation fields are missing in the database. Apply the comment hardening migration.",
      };
    }

    return { status: "error", message: "Failed to delete comment. Check the admin comment moderation policy." };
  }

  if (!removedRows || removedRows.length === 0) {
    return {
      status: "error",
      message: "Comment was not found for this story, or the admin moderation policy is not applied.",
    };
  }

  revalidatePath(`/story/${storyId}`);
  return { status: "success" };
}

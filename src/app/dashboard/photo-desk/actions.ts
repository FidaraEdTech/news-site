"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeCategory, isMainCategory } from "@/lib/categories";
import { requireAdminUser } from "@/lib/auth";
import {
  MAX_IMAGE_FILE_SIZE,
  STORY_IMAGE_BUCKET,
  hasAllowedImageSignature,
  isAllowedImageType,
} from "@/lib/media";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PhotoDeskItem } from "@/lib/types";

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(formData: FormData, key: string): string | null {
  const value = readText(formData, key);
  return value.length > 0 ? value : null;
}

function isProvidedFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

function sanitizeFileName(fileName: string): string {
  return (
    fileName
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/^\.+/, "") || "upload"
  );
}

function isPermissionError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "42501" ||
    error.message?.toLowerCase().includes("row-level security") === true
  );
}

function redirectToDashboard(search: string): never {
  redirect(`/dashboard/photo-desk?${search}`);
}

export async function savePhotoDeskAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectToDashboard("error=missing-config");
  }

  const user = await requireAdminUser();
  const supabase = createSupabaseServerClient();

  const storyId = readText(formData, "story_id");
  const intent = readText(formData, "intent");
  const title = readText(formData, "title");
  const category = normalizeCategory(readText(formData, "category"));
  const location = readOptionalText(formData, "location");
  const isBreaking = formData.get("is_breaking") === "on";
  const breakingLabel = readOptionalText(formData, "breaking_label");

  if (!title || title.length < 3 || !isMainCategory(category)) {
    redirectToDashboard("error=validation");
  }

  const existingItemsJson = readOptionalText(formData, "existing_items");
  let existingItems: PhotoDeskItem[] = [];
  if (existingItemsJson) {
    try {
      existingItems = JSON.parse(existingItemsJson);
    } catch (e) {
      existingItems = [];
    }
  }

  const newPhotoFiles = formData.getAll("photo_file").filter(isProvidedFile);
  const rawCaptions = formData.getAll("photo_caption") as string[];

  // If publishing, must have at least one photo
  if (intent === "publish" && existingItems.length === 0 && newPhotoFiles.length === 0) {
    redirectToDashboard("error=validation");
  }

  // Validate new photo files
  for (const file of newPhotoFiles) {
    if (!isAllowedImageType(file.type)) {
      redirectToDashboard("error=image-type");
    }
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      redirectToDashboard("error=image-size");
    }
    if (!(await hasAllowedImageSignature(file))) {
      redirectToDashboard("error=image-type");
    }
  }

  const nextStatus = intent === "publish" ? "published" : "draft";

  const storyPayload: any = {
    title,
    category,
    location,
    excerpt: "",
    content: "",
    status: nextStatus,
    story_type: "photo_desk",
    is_breaking: isBreaking,
    breaking_label: isBreaking ? breakingLabel : null,
    breaking_expires_at: null,
  };

  let selectedStoryId = storyId;

  if (selectedStoryId) {
    const { data: existing, error: loadError } = await supabase.from("stories")
      .select("published_at").eq("id", selectedStoryId).eq("author_id", user.id).single();
    if (loadError || !existing) redirectToDashboard("error=save-failed");
    storyPayload.published_at = nextStatus === "published" ? existing.published_at ?? new Date().toISOString() : null;

    const { error: updateError } = await supabase
      .from("stories")
      .update(storyPayload)
      .eq("id", selectedStoryId)
      .eq("author_id", user.id);

    if (updateError) {
      if (isPermissionError(updateError)) {
        redirectToDashboard("error=admin-setup");
      }
      console.error("Supabase Update Error:", updateError);
      redirectToDashboard("error=save-failed");
    }
  } else {
    storyPayload.published_at = nextStatus === "published" ? new Date().toISOString() : null;
    storyPayload.author_id = user.id;

    const { data, error } = await supabase
      .from("stories")
      .insert(storyPayload)
      .select("id")
      .single();

    if (error || !data) {
      if (error && isPermissionError(error)) {
        redirectToDashboard("error=admin-setup");
      }
      console.error("Supabase Insert Error:", error);
      redirectToDashboard("error=save-failed");
    }

    selectedStoryId = data.id;
  }

  // Upload new photos
  const newItems: PhotoDeskItem[] = [];
  let existingCount = existingItems.length;

  for (let i = 0; i < newPhotoFiles.length; i++) {
    const file = newPhotoFiles[i];
    // For new files, the caption is placed at the end of the rawCaptions array 
    // after existing items' captions if we were handling edits perfectly, but for now 
    // we assume rawCaptions aligns with all slots (both existing and new).
    // Actually, in the frontend we'll render hidden inputs for ALL slots.
    // Let's rely on the frontend sending them in order.
    // We'll process them in order of the rawCaptions.
  }

  // A cleaner approach: frontend sends a list of existing item indexes and new files.
  // We'll simplify: newPhotoFiles is in order, we'll match them with the captions.
  // Actually, we'll iterate through `rawCaptions`. The frontend will submit 1 file input per slot.
  // Wait, formData.getAll("photo_file") only returns entries that are files OR empty files.
  // If we have an empty file (user didn't change it, or existing item), we'll use existing item.

  const allFiles = formData.getAll("photo_file");
  const finalItems: PhotoDeskItem[] = [];
  let existingItemIndex = 0;

  for (let i = 0; i < allFiles.length; i++) {
    const fileEntry = allFiles[i];
    const caption = typeof rawCaptions[i] === "string" ? rawCaptions[i].trim().slice(0, 280) : "";

    if (isProvidedFile(fileEntry)) {
      // New upload
      try {
        const file = fileEntry;
        const objectPath = `${user.id}/${selectedStoryId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
        const { error } = await supabase.storage.from(STORY_IMAGE_BUCKET).upload(objectPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

        if (error) throw new Error(error.message);

        const { data: { publicUrl } } = supabase.storage.from(STORY_IMAGE_BUCKET).getPublicUrl(objectPath);

        finalItems.push({
          image_url: publicUrl,
          image_path: objectPath,
          caption,
          order: i,
        });
      } catch (err) {
        console.error("Upload error", err);
        redirectToDashboard("error=upload-failed");
      }
    } else {
      // It's an existing item (or empty slot that we ignore if not existing, but UI won't send empty slot without file unless it's an existing item).
      if (existingItemIndex < existingItems.length) {
        const existing = existingItems[existingItemIndex];
        finalItems.push({
          ...existing,
          caption,
          order: i,
        });
        existingItemIndex++;
      }
    }
  }

  const { error: updateError2 } = await supabase
    .from("stories")
    .update({ photo_desk_items: finalItems as any })
    .eq("id", selectedStoryId)
    .eq("author_id", user.id);

  if (updateError2) {
    console.error("Final update error", updateError2);
    redirectToDashboard("error=save-failed");
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stories");
  revalidatePath("/dashboard/photo-desk");
  revalidatePath(`/story/${selectedStoryId}`);

  if (nextStatus === "published") {
    redirect(`/dashboard/photo-desk?notice=published`);
  } else {
    redirect(`/dashboard/photo-desk?notice=draft-saved`);
  }
}

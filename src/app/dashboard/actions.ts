"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/auth";
import { categorySlug, formatStoryCategories, isValidCategoryName, normalizeCategory, parseStoryCategories, parseTags } from "@/lib/categories";
import { sanitizeStoryHtml, storyText } from "@/lib/story-content";
import {
  MAX_IMAGE_FILE_SIZE,
  MAX_VIDEO_FILE_SIZE,
  STORY_IMAGE_BUCKET,
  STORY_VIDEO_BUCKET,
  hasAllowedImageSignature,
  hasAllowedVideoSignature,
  isAllowedImageType,
  isAllowedVideoType,
  isValidHttpUrl,
} from "@/lib/media";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, StoryMedia, StoryStatus } from "@/lib/types";

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(formData: FormData, key: string): string | null {
  const value = readText(formData, key);
  return value.length > 0 ? value : null;
}

function readOptionalDateTime(formData: FormData, key: string): string | null {
  const value = readOptionalText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    redirectToDashboard("error=story-validation");
  }

  return parsed.toISOString();
}

function readOptionalIndexedText(formData: FormData, prefix: string, id: string): string | null {
  return readOptionalText(formData, `${prefix}_${id}`);
}

function readIndexedNumber(formData: FormData, prefix: string, id: string, fallback: number): number {
  const value = readText(formData, `${prefix}_${id}`);

  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function addHours(date: Date, hours: number): string {
  return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function getDefaultBreakingExpiry(input: {
  nextStatus: StoryStatus;
  existingPublishedAt?: string | null;
  publishedAt?: string | null;
}): string {
  if (input.nextStatus === "published" && input.existingPublishedAt) {
    return addHours(new Date(), 24);
  }

  return addHours(new Date(input.publishedAt ?? new Date().toISOString()), 24);
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

function redirectToDashboard(search: string): never {
  redirect(`/dashboard/stories?${search}`);
}

function redirectToDashboardWithFile(error: string, fileName: string): never {
  redirectToDashboard(`error=${error}&file=${encodeURIComponent(fileName)}`);
}

function isPermissionError(error: { code?: string | null; message?: string | null }) {
  return (
    error.code === "42501" ||
    error.message?.toLowerCase().includes("row-level security") === true
  );
}

function getProvidedFiles(formData: FormData, key: string): File[] {
  return formData.getAll(key).filter(isProvidedFile);
}

async function removeStorageObject(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  bucket: string,
  path?: string | null,
) {
  if (!path) {
    return;
  }

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(error.message);
  }
}

async function uploadStorageObject(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  bucket: string,
  storyId: string,
  userId: string,
  file: File,
  existingPath?: string | null,
) {
  if (existingPath) {
    await removeStorageObject(supabase, bucket, existingPath);
  }

  const objectPath = `${userId}/${storyId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(objectPath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(objectPath);

  return {
    path: objectPath,
    url: publicUrl,
  };
}

async function validateGalleryImage(file: File) {
  if (!isAllowedImageType(file.type)) {
    redirectToDashboardWithFile("gallery-image-type", file.name);
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    redirectToDashboardWithFile("gallery-image-size", file.name);
  }

  if (!(await hasAllowedImageSignature(file))) {
    redirectToDashboardWithFile("gallery-image-type", file.name);
  }
}

async function updateStoryGallery(input: {
  formData: FormData;
  storyId: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}) {
  const { formData, storyId, supabase, userId } = input;
  const galleryUploads = getProvidedFiles(formData, "gallery_images");
  const submittedMediaIds = formData
    .getAll("gallery_media_id")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (galleryUploads.length === 0 && submittedMediaIds.length === 0) {
    return;
  }

  for (const file of galleryUploads) {
    await validateGalleryImage(file);
  }

  const { data: existingMedia, error: mediaLoadError } = await supabase
    .from("story_media")
    .select("*")
    .eq("story_id", storyId);

  if (mediaLoadError) {
    if (isPermissionError(mediaLoadError)) {
      redirectToDashboard("error=admin-setup");
    }

    redirectToDashboard("error=gallery-save-failed");
  }

  const mediaRows = (existingMedia ?? []) as StoryMedia[];

  for (const media of mediaRows) {
    if (!submittedMediaIds.includes(media.id)) {
      continue;
    }

    if (formData.get(`gallery_remove_${media.id}`) === "on") {
      try {
        await removeStorageObject(supabase, STORY_IMAGE_BUCKET, media.storage_path);
      } catch {
        redirectToDashboard("error=storage-delete-failed");
      }

      const { error } = await supabase
        .from("story_media")
        .delete()
        .eq("id", media.id)
        .eq("story_id", storyId);

      if (error) {
        redirectToDashboard("error=gallery-save-failed");
      }

      continue;
    }

    const caption = readOptionalIndexedText(formData, "gallery_caption", media.id);
    const altText = readOptionalIndexedText(formData, "gallery_alt", media.id);

    if ((caption && caption.length > 240) || (altText && altText.length > 180)) {
      redirectToDashboard("error=gallery-save-failed");
    }

    const { error } = await supabase
      .from("story_media")
      .update({
        caption,
        alt_text: altText,
        sort_order: readIndexedNumber(formData, "gallery_sort", media.id, media.sort_order),
      })
      .eq("id", media.id)
      .eq("story_id", storyId);

    if (error) {
      redirectToDashboard("error=gallery-save-failed");
    }
  }

  const maxSortOrder = mediaRows.reduce(
    (highest, media) => Math.max(highest, media.sort_order),
    -1,
  );

  for (const [index, file] of galleryUploads.entries()) {
    let upload: Awaited<ReturnType<typeof uploadStorageObject>>;

    try {
      upload = await uploadStorageObject(
        supabase,
        STORY_IMAGE_BUCKET,
        storyId,
        userId,
        file,
      );
    } catch {
      redirectToDashboardWithFile("gallery-upload-failed", file.name);
    }

    const { error } = await supabase.from("story_media").insert({
      story_id: storyId,
      url: upload.url,
      storage_path: upload.path,
      media_type: "image",
      alt_text: sanitizeFileName(file.name).replace(/\.[^.]+$/, "").replace(/-/g, " "),
      sort_order: maxSortOrder + index + 1,
    });

    if (error) {
      try {
        await removeStorageObject(supabase, STORY_IMAGE_BUCKET, upload.path);
      } catch {
        // The database write failed; the editor-facing save error is the useful signal.
      }

      redirectToDashboardWithFile("gallery-save-failed", file.name);
    }
  }
}

function validateStoryFields(input: {
  title: string;
  category: string;
  location: string | null;
  excerpt: string;
  content: string;
  featuredImageUrlInput: string | null;
  videoCaptionInput: string | null;
}) {
  const {
    title,
    category,
    location,
    excerpt,
    content,
    featuredImageUrlInput,
    videoCaptionInput,
  } = input;

  if (
    title.length < 3 ||
    title.length > 180 ||
    category.length < 2 ||
    category.length > 240 ||
    (location !== null && location.length > 120) ||
    excerpt.length > 280
  ) {
    redirectToDashboard("error=story-validation");
  }

  if (featuredImageUrlInput && !isValidHttpUrl(featuredImageUrlInput)) {
    redirectToDashboard("error=image-url");
  }

  if (videoCaptionInput && videoCaptionInput.length > 200) {
    redirectToDashboard("error=video-caption");
  }
}

export async function signOutAction() {
  if (!hasSupabaseEnv()) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  redirect("/login?notice=signed-out");
}

export async function saveStoryAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectToDashboard("error=missing-config");
  }

  const user = await requireAdminUser();
  const supabase = await createSupabaseServerClient();

  const storyId = readText(formData, "story_id");
  const nextStatus: StoryStatus =
    readText(formData, "intent") === "publish" ? "published" : "draft";

  const title = readText(formData, "title");
  const rawCategory = readText(formData, "category") || readText(formData, "category_picker");
  const parsedCategories = parseStoryCategories(rawCategory);
  const category = formatStoryCategories(parsedCategories);
  const excerpt = readText(formData, "excerpt");
  const contentFormat = readText(formData, "content_format") === "html" ? "html" : "plain";
  const rawContent = readText(formData, "content");
  if (rawContent.length > 200000) redirectToDashboard("error=story-validation");
  const content = contentFormat === "html" ? sanitizeStoryHtml(rawContent) : rawContent;
  const byline = readOptionalText(formData, "byline");
  const rawTagsText = readText(formData, "tags");
  let tags: string[] = [];
  try {
    tags = parseTags(rawTagsText);
  } catch {
    const fallbackTags = rawTagsText.split(",").map((t) => t.trim().slice(0, 40)).filter(Boolean).slice(0, 10).join(", ");
    try { tags = parseTags(fallbackTags); } catch { tags = []; }
  }
  if (parsedCategories.length === 0 || !parsedCategories.every(isValidCategoryName) || (byline && byline.length > 120)) {
    redirectToDashboard("error=story-validation");
  }

  if (!title || !category) {
    redirectToDashboard("error=story-validation");
  }

  const location = readOptionalText(formData, "location");
  const featuredImageUrlInput = readOptionalText(formData, "featured_image_url");
  const featuredImageFile = formData.get("featured_image_file");
  const videoFile = formData.get("video_file");
  const removeFeaturedImage = formData.get("remove_featured_image") === "on";
  const removeVideo = formData.get("remove_video") === "on";
  const videoCaptionInput = readOptionalText(formData, "video_caption");
  const isBreaking = formData.get("is_breaking") === "on";
  const breakingLabelInput = readOptionalText(formData, "breaking_label");
  const breakingExpiryInput = readOptionalDateTime(formData, "breaking_expires_at");

  if (breakingLabelInput && breakingLabelInput.length > 160) {
    redirectToDashboard("error=story-validation");
  }

  validateStoryFields({
    title,
    category,
    location,
    excerpt,
    content,
    featuredImageUrlInput,
    videoCaptionInput,
  });

  if (isProvidedFile(featuredImageFile)) {
    if (!isAllowedImageType(featuredImageFile.type)) {
      redirectToDashboard("error=image-type");
    }

    if (featuredImageFile.size > MAX_IMAGE_FILE_SIZE) {
      redirectToDashboard("error=image-size");
    }

    if (!(await hasAllowedImageSignature(featuredImageFile))) {
      redirectToDashboard("error=image-type");
    }
  }

  if (isProvidedFile(videoFile)) {
    if (!isAllowedVideoType(videoFile.type)) {
      redirectToDashboard("error=video-type");
    }

    if (videoFile.size > MAX_VIDEO_FILE_SIZE) {
      redirectToDashboard("error=video-size");
    }

    if (!(await hasAllowedVideoSignature(videoFile))) {
      redirectToDashboard("error=video-type");
    }
  }

  const storyPayload: Database["public"]["Tables"]["stories"]["Update"] = {
    tags,
    byline,
    content_format: contentFormat,
    title,
    category,
    location,
    excerpt,
    content,
    status: nextStatus,
    is_breaking: isBreaking,
    breaking_label: isBreaking ? breakingLabelInput : null,
    breaking_expires_at: null,
  };

  type EditableStory = {
    id: string;
    story_type?: string;
    published_at: string | null;
    featured_image_path: string | null;
    video_path: string | null;
  };

  let selectedStory: EditableStory;

  if (storyId) {
    const { data, error } = await supabase
      .from("stories")
      .select("id, story_type, published_at, featured_image_path, video_path")
      .eq("id", storyId)
      .eq("author_id", user.id)
      .single();

    if (error || !data) {
      redirectToDashboard("error=story-not-found");
    }

    selectedStory = data;
    if (nextStatus === "published" && selectedStory.story_type !== "photo_desk" && !storyText(content)) {
      redirectToDashboard("error=story-validation");
    }
    storyPayload.published_at =
      nextStatus === "published"
        ? selectedStory.published_at ?? new Date().toISOString()
        : null;
    storyPayload.breaking_expires_at = isBreaking
      ? breakingExpiryInput ??
        (nextStatus === "published"
          ? getDefaultBreakingExpiry({
              nextStatus,
              existingPublishedAt: selectedStory.published_at,
              publishedAt: storyPayload.published_at,
            })
          : null)
      : null;

    const { error: updateError } = await supabase
      .from("stories")
      .update(storyPayload)
      .eq("id", storyId)
      .eq("author_id", user.id);

    if (updateError) {
      if (isPermissionError(updateError)) {
        redirectToDashboard("error=admin-setup");
      }
      console.error("Supabase Update Error:", updateError);
      redirectToDashboard("error=story-save-failed");
    }
  } else {
    if (nextStatus === "published" && !storyText(content)) redirectToDashboard("error=story-validation");
    storyPayload.published_at =
      nextStatus === "published" ? new Date().toISOString() : null;
    storyPayload.breaking_expires_at = isBreaking
      ? breakingExpiryInput ??
        (nextStatus === "published"
          ? getDefaultBreakingExpiry({
              nextStatus,
              publishedAt: storyPayload.published_at,
            })
          : null)
      : null;

    const { data, error } = await supabase
      .from("stories")
      .insert({
        author_id: user.id,
        tags,
        byline,
        content_format: contentFormat,
        title,
        category,
        location,
        excerpt,
        content,
        status: nextStatus,
        published_at: storyPayload.published_at,
        is_breaking: storyPayload.is_breaking,
        breaking_label: storyPayload.breaking_label,
        breaking_expires_at: storyPayload.breaking_expires_at,
      })
      .select("id, published_at, featured_image_path, video_path")
      .single();

    if (error || !data) {
      if (error && isPermissionError(error)) {
        redirectToDashboard("error=admin-setup");
      }
      console.error("Supabase Insert Error:", error);
      redirectToDashboard("error=story-save-failed");
    }

    selectedStory = data;
  }

  const mediaUpdate: Database["public"]["Tables"]["stories"]["Update"] = {};

  try {
    if (removeFeaturedImage) {
      await removeStorageObject(
        supabase,
        STORY_IMAGE_BUCKET,
        selectedStory.featured_image_path,
      );
      selectedStory.featured_image_path = null;
      mediaUpdate.featured_image_path = null;
      mediaUpdate.featured_image_url = null;
    }

    if (isProvidedFile(featuredImageFile)) {
      try {
        const upload = await uploadStorageObject(
          supabase,
          STORY_IMAGE_BUCKET,
          selectedStory.id,
          user.id,
          featuredImageFile,
          selectedStory.featured_image_path,
        );

        selectedStory.featured_image_path = upload.path;
        mediaUpdate.featured_image_path = upload.path;
        mediaUpdate.featured_image_url = upload.url;
      } catch {
        redirectToDashboard("error=storage-upload-failed");
      }
    } else if (featuredImageUrlInput) {
      if (selectedStory.featured_image_path) {
        await removeStorageObject(
          supabase,
          STORY_IMAGE_BUCKET,
          selectedStory.featured_image_path,
        );
        selectedStory.featured_image_path = null;
      }

      mediaUpdate.featured_image_path = null;
      mediaUpdate.featured_image_url = featuredImageUrlInput;
    }

    if (removeVideo) {
      await removeStorageObject(supabase, STORY_VIDEO_BUCKET, selectedStory.video_path);
      selectedStory.video_path = null;
      mediaUpdate.video_path = null;
      mediaUpdate.video_url = null;
    }

    if (isProvidedFile(videoFile)) {
      try {
        const upload = await uploadStorageObject(
          supabase,
          STORY_VIDEO_BUCKET,
          selectedStory.id,
          user.id,
          videoFile,
          selectedStory.video_path,
        );

        selectedStory.video_path = upload.path;
        mediaUpdate.video_path = upload.path;
        mediaUpdate.video_url = upload.url;
      } catch {
        redirectToDashboard("error=storage-upload-failed");
      }
    }
  } catch {
    redirectToDashboard("error=storage-delete-failed");
  }

  mediaUpdate.video_caption =
    removeVideo && !isProvidedFile(videoFile) ? null : videoCaptionInput;

  if (Object.keys(mediaUpdate).length > 0) {
    const { error } = await supabase
      .from("stories")
      .update(mediaUpdate)
      .eq("id", selectedStory.id)
      .eq("author_id", user.id);

    if (error) {
      if (isPermissionError(error)) {
        redirectToDashboard("error=admin-setup");
      }

      redirectToDashboard("error=story-save-failed");
    }
  }

  await updateStoryGallery({
    formData,
    storyId: selectedStory.id,
    supabase,
    userId: user.id,
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stories");
  revalidatePath(`/story/${selectedStory.id}`);

  if (nextStatus === "published") {
    redirect(`/dashboard/stories?notice=story-published`);
  } else {
    redirect(`/dashboard/stories?notice=draft-saved`);
  }
}

export async function deleteStoryAction(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectToDashboard("error=missing-config");
  }

  const user = await requireAdminUser();
  const supabase = await createSupabaseServerClient();
  const storyId = readText(formData, "story_id");

  if (!storyId) {
    redirectToDashboard("error=story-not-found");
  }

  const { data, error } = await supabase
    .from("stories")
    .select("id, featured_image_path, video_path")
    .eq("id", storyId)
    .eq("author_id", user.id)
    .single();

  if (error || !data) {
    redirectToDashboard("error=story-not-found");
  }

  const ensuredData = data;
  const { data: galleryMedia } = await supabase
    .from("story_media")
    .select("storage_path")
    .eq("story_id", storyId);

  try {
    for (const media of galleryMedia ?? []) {
      await removeStorageObject(
        supabase,
        STORY_IMAGE_BUCKET,
        media.storage_path,
      );
    }
    await removeStorageObject(
      supabase,
      STORY_IMAGE_BUCKET,
      ensuredData.featured_image_path,
    );
    await removeStorageObject(
      supabase,
      STORY_VIDEO_BUCKET,
      ensuredData.video_path,
    );
  } catch {
    redirectToDashboard("error=storage-delete-failed");
  }

  const { error: deleteError } = await supabase
    .from("stories")
    .delete()
    .eq("id", storyId)
    .eq("author_id", user.id);

  if (deleteError) {
    if (isPermissionError(deleteError)) {
      redirectToDashboard("error=admin-setup");
    }

    redirectToDashboard("error=story-delete-failed");
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stories");
  revalidatePath(`/story/${storyId}`);

  redirect(`/dashboard/stories?notice=story-deleted`);
}


export async function uploadDigestImageAction(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const user = await requireAdminUser();

  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Supabase storage is not configured." };
  }

  const rawFile = formData.get("image");
  if (!isProvidedFile(rawFile)) {
    return { ok: false, error: "Please choose an image file to upload." };
  }

  if (!isAllowedImageType(rawFile.type)) {
    return { ok: false, error: "Please upload a valid image file (PNG, JPG, WebP, or GIF)." };
  }

  if (rawFile.size > MAX_IMAGE_FILE_SIZE) {
    return { ok: false, error: "Image file must be 5 MB or smaller." };
  }

  if (!(await hasAllowedImageSignature(rawFile))) {
    return { ok: false, error: "Unsupported image file signature." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const uploaded = await uploadStorageObject(
      supabase,
      STORY_IMAGE_BUCKET,
      "digest",
      user.id,
      rawFile,
    );
    return { ok: true, url: uploaded.url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to upload image.",
    };
  }
}


export async function updateStoryCategoriesAction(
  formData: FormData,
): Promise<{ ok: boolean; category?: string; error?: string }> {
  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const user = await requireAdminUser();
  const supabase = await createSupabaseServerClient();
  const storyId = readText(formData, "story_id");
  const rawCategory = readText(formData, "category");
  const parsedCategories = parseStoryCategories(rawCategory);

  if (!storyId) {
    return { ok: false, error: "Story ID is required." };
  }

  if (parsedCategories.length === 0 || !parsedCategories.every(isValidCategoryName)) {
    return { ok: false, error: "Please assign at least one valid category (2-60 characters each)." };
  }

  const formattedCategory = formatStoryCategories(parsedCategories);

  const { error } = await supabase
    .from("stories")
    .update({ category: formattedCategory })
    .eq("id", storyId)
    .eq("author_id", user.id);

  if (error) {
    return { ok: false, error: error.message || "Failed to update story categories." };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stories");
  revalidatePath("/dashboard/categories");
  revalidatePath(`/dashboard/stories/${storyId}`);
  revalidatePath(`/story/${storyId}`);

  return { ok: true, category: formattedCategory };
}

export async function renameCategoryAcrossStoriesAction(
  formData: FormData,
): Promise<{ ok: boolean; updatedCount?: number; newCategory?: string; error?: string }> {
  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const user = await requireAdminUser();
  const supabase = await createSupabaseServerClient();
  const oldCategory = readText(formData, "old_category");
  const newCategoryRaw = readText(formData, "new_category");
  const newCategory = normalizeCategory(newCategoryRaw);

  if (!oldCategory || !isValidCategoryName(newCategory)) {
    return { ok: false, error: "Please provide a valid category name (2-60 characters)." };
  }

  const oldSlug = categorySlug(oldCategory);
  if (!oldSlug) {
    return { ok: false, error: "Invalid source category." };
  }

  const { data: stories, error: fetchError } = await supabase
    .from("stories")
    .select("id, category")
    .eq("author_id", user.id);

  if (fetchError) {
    return { ok: false, error: fetchError.message || "Failed to load stories." };
  }

  let updatedCount = 0;
  for (const story of stories ?? []) {
    const cats = parseStoryCategories(story.category);
    if (cats.some((c) => categorySlug(c) === oldSlug)) {
      const updatedCats = cats.map((c) => (categorySlug(c) === oldSlug ? newCategory : c));
      const formatted = formatStoryCategories(updatedCats);
      const { error: updateErr } = await supabase
        .from("stories")
        .update({ category: formatted })
        .eq("id", story.id)
        .eq("author_id", user.id);
      if (!updateErr) {
        updatedCount += 1;
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stories");
  revalidatePath("/dashboard/categories");

  return { ok: true, updatedCount, newCategory };
}

export async function deleteCategoryAcrossStoriesAction(
  formData: FormData,
): Promise<{ ok: boolean; updatedCount?: number; error?: string }> {
  if (!hasSupabaseEnv()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const user = await requireAdminUser();
  const supabase = await createSupabaseServerClient();
  const targetCategory = readText(formData, "target_category");
  const fallbackCategory = normalizeCategory(readText(formData, "fallback_category") || "Public Affairs");

  const targetSlug = categorySlug(targetCategory);
  if (!targetSlug) {
    return { ok: false, error: "Invalid category to delete." };
  }

  const { data: stories, error: fetchError } = await supabase
    .from("stories")
    .select("id, category")
    .eq("author_id", user.id);

  if (fetchError) {
    return { ok: false, error: fetchError.message || "Failed to load stories." };
  }

  let updatedCount = 0;
  for (const story of stories ?? []) {
    const cats = parseStoryCategories(story.category);
    if (cats.some((c) => categorySlug(c) === targetSlug)) {
      const remaining = cats.filter((c) => categorySlug(c) !== targetSlug);
      const nextCats = remaining.length > 0 ? remaining : [fallbackCategory];
      const formatted = formatStoryCategories(nextCats);
      const { error: updateErr } = await supabase
        .from("stories")
        .update({ category: formatted })
        .eq("id", story.id)
        .eq("author_id", user.id);
      if (!updateErr) {
        updatedCount += 1;
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/stories");
  revalidatePath("/dashboard/categories");

  return { ok: true, updatedCount };
}
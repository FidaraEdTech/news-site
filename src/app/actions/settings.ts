"use server";

import { requireAdminUser } from "@/lib/auth";
import { isValidHttpUrl } from "@/lib/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { normalizeSubstackUrl, validGoogleVerification } from "@/lib/newsletter";

function readOptionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key)?.toString().trim() ?? "";
  return value.length > 0 ? value : null;
}

function readOptionalUrl(formData: FormData, key: string): string | null {
  const value = readOptionalText(formData, key);

  if (!value) {
    return null;
  }

  if (value.length > 2048 || !isValidHttpUrl(value)) {
    throw new Error("invalid-url");
  }

  return value;
}

export async function saveSettingsAction(formData: FormData) {
  await requireAdminUser();

  try {
    const author_bio = readOptionalText(formData, "author_bio");
    const social_twitter = readOptionalUrl(formData, "social_twitter");
    const social_linkedin = readOptionalUrl(formData, "social_linkedin");
    const social_instagram = readOptionalUrl(formData, "social_instagram");
    const publicationInput = readOptionalText(formData, "newsletter_url");
    const newsletter_url = normalizeSubstackUrl(publicationInput);
    const google_site_verification = readOptionalText(formData, "google_site_verification");
    if (publicationInput && !newsletter_url) return { error: "Enter your publication’s https://name.substack.com address." };
    if (google_site_verification && !validGoogleVerification(google_site_verification)) return { error: "Paste only the content value from Google’s verification meta tag, without the HTML." };

    if (author_bio && author_bio.length > 4000) {
      return { error: "Author bio must be 4,000 characters or fewer." };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await (supabase as any)
      .from("site_settings")
      .update({
        author_bio,
        social_twitter,
        social_linkedin,
        social_instagram,
        newsletter_url,
        google_site_verification,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1)
      .select("id")
      .single();

    if (error) {
      return { error: "Failed to save settings. Please try again." };
    }

    revalidatePath("/", "layout");
    return { error: null, success: true };
  } catch (err: any) {
    if (err?.message === "invalid-url") {
      return { error: "Social links must be valid http:// or https:// URLs." };
    }

    return { error: "An unexpected error occurred." };
  }
}

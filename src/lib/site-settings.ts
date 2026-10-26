import { cache } from "react";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeSubstackUrl } from "@/lib/newsletter";

import type { SiteSettings } from "@/lib/types";
export type { SiteSettings } from "@/lib/types";

export const getSiteSettings = cache(async (): Promise<SiteSettings | null> => {
  if (!hasSupabaseEnv()) return null;
  const client = await createSupabaseServerClient();
  const { data, error } = await client.from("site_settings").select("*").eq("id", 1).maybeSingle();
  return error ? null : data as SiteSettings | null;
});

export async function getNewsletterUrl() {
  const settings = await getSiteSettings();
  const configured =
    normalizeSubstackUrl(settings?.newsletter_url) ??
    normalizeSubstackUrl(process.env.NEXT_PUBLIC_SUBSTACK_EMBED_URL);
  if (configured === "https://frontlinedailynewsroom.substack.com") {
    return "https://frontlinedaily.substack.com";
  }
  return configured;
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SubscribeResult = {
  ok: boolean;
  email?: string;
  message: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function subscribeToDigestAction(
  formData: FormData,
): Promise<SubscribeResult> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

  if (!email || email.length < 5 || email.length > 254 || !EMAIL_REGEX.test(email)) {
    return {
      ok: false,
      message: "Please enter a valid email address.",
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      ok: false,
      message: "Subscription service is temporarily unavailable. Please try again shortly.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("contact_messages").insert({
      name: "NEWSLETTER_SUBSCRIBER",
      email,
      message: "Subscribed to The Curator's Digest via Frontline Daily.",
    });

    if (error) {
      return {
        ok: false,
        message: "Could not complete your subscription right now. Please try again.",
      };
    }

    return {
      ok: true,
      email,
      message: "You’re subscribed to The Curator’s Digest! Your email is now on our Sunday reading list.",
    };
  } catch {
    return {
      ok: false,
      message: "Could not complete your subscription right now. Please try again.",
    };
  }
}

export async function addSubscribersFromDashboardAction(
  formData: FormData,
): Promise<{ ok: boolean; added: number; message: string }> {
  await requireAdminUser();

  const rawInput = formData.get("emails");
  const text = typeof rawInput === "string" ? rawInput : "";
  const candidates = text
    .split(/[\s,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length >= 5 && item.length <= 254 && EMAIL_REGEX.test(item));

  const uniqueEmails = Array.from(new Set(candidates));

  if (uniqueEmails.length === 0) {
    return {
      ok: false,
      added: 0,
      message: "Please enter at least one valid email address.",
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      ok: false,
      added: 0,
      message: "Supabase environment is not configured.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const rows = uniqueEmails.map((email) => ({
      name: "NEWSLETTER_SUBSCRIBER",
      email,
      message: "Added by editor in The Curator's Digest Studio.",
    }));

    const { error } = await supabase.from("contact_messages").insert(rows);
    if (error) {
      return {
        ok: false,
        added: 0,
        message: "Could not save subscriber emails. Please try again.",
      };
    }

    revalidatePath("/dashboard");
    return {
      ok: true,
      added: uniqueEmails.length,
      message: `Added ${uniqueEmails.length} subscriber${uniqueEmails.length === 1 ? "" : "s"} to your mailing list.`,
    };
  } catch {
    return {
      ok: false,
      added: 0,
      message: "Could not save subscriber emails. Please try again.",
    };
  }
}

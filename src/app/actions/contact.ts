"use server";

import {
  enforceSubmissionThrottle,
  enforceDurableSubmissionThrottle,
  moderateSubmissionText,
  normalizeSubmissionText,
} from "@/lib/abuse-protection";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContactAction(formData: FormData) {
  const name = normalizeSubmissionText(formData.get("name")?.toString() ?? "");
  const email = normalizeSubmissionText(formData.get("email")?.toString() ?? "");
  const message = normalizeSubmissionText(formData.get("message")?.toString() ?? "", true);

  if (!name || !email || !message) {
    return { error: "Please fill out all fields." };
  }

  if (name.length > 120 || !EMAIL_PATTERN.test(email) || email.length > 254) {
    return { error: "Please enter a valid name and email address." };
  }

  if (message.length < 10 || message.length > 4000) {
    return { error: "Message must be between 10 and 4,000 characters." };
  }

  const moderation = moderateSubmissionText(`${name}\n${message}`, { maxLinks: 4 });
  if (!moderation.ok) {
    return { error: moderation.message };
  }

  const throttle = await enforceSubmissionThrottle({
    scope: "contact",
    normalizedText: `${email}:${name}:${message}`,
    cooldownSeconds: 120,
    windowSeconds: 60 * 60,
    maxSubmissions: 3,
  });

  if (!throttle.ok) {
    return { error: throttle.message };
  }

  if (!hasSupabaseEnv()) {
    return {
      error:
        "The newsroom backend is not configured yet. Add the required Supabase environment variables before using the contact desk.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const durableThrottle = await enforceDurableSubmissionThrottle({
    supabase,
    scope: "contact",
    normalizedText: `${email}:${name}:${message}`,
    cooldownSeconds: 120,
    windowSeconds: 60 * 60,
    maxSubmissions: 3,
  });

  if (!durableThrottle.ok) {
    return { error: durableThrottle.message };
  }

  const { error } = await (supabase as any).from("contact_messages").insert({ name, email, message });

  if (error) {
    return { error: "An unexpected error occurred. Please try again." };
  }

  return { error: null, success: true };
}

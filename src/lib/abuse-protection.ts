import { createHash } from "crypto";
import { cookies } from "next/headers";
import { headers } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ModerationOptions = {
  maxLinks: number;
  bannedTerms?: string[];
};

type ThrottleOptions = {
  scope: string;
  normalizedText: string;
  cooldownSeconds: number;
  windowSeconds: number;
  maxSubmissions: number;
};

type DurableThrottleOptions = ThrottleOptions & {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
};

const DEFAULT_BANNED_TERMS = [
  "kill yourself",
  "go kill yourself",
  "death threat",
  "doxx",
  "doxxing",
  "crypto giveaway",
  "forex signal",
  "whatsapp hack",
  "loan approval",
  "casino bonus",
  "viagra",
];

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;
const CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const ZERO_WIDTH_PATTERN = /[\u200b-\u200f\ufeff]/g;

function getConfiguredBannedTerms(): string[] {
  const configuredTerms =
    process.env.NEWSROOM_BANNED_TERMS?.split(",")
      .map((term) => normalizeForMatching(term))
      .filter(Boolean) ?? [];

  return [...DEFAULT_BANNED_TERMS, ...configuredTerms];
}

function normalizeForMatching(value: string): string {
  return value
    .toLowerCase()
    .replace(ZERO_WIDTH_PATTERN, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function hashForStorage(value: string): string {
  const salt = process.env.NEWSROOM_RATE_LIMIT_SALT ?? "newsroom-rate-limit-v1";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

function buildCookieName(scope: string, suffix: string): string {
  const safeScope = scope.replace(/[^a-z0-9_-]/gi, "_").slice(0, 48);
  return `newsroom_${safeScope}_${suffix}`;
}

async function getNumberCookie(name: string): Promise<number | null> {
  const value = (await cookies()).get(name)?.value;
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function setThrottleCookie(name: string, value: string, maxAge: number) {
  (await cookies()).set(name, value, {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function normalizeSubmissionText(value: string, preserveLineBreaks = false): string {
  const withoutControls = value.replace(CONTROL_CHARS_PATTERN, "").replace(ZERO_WIDTH_PATTERN, "");

  if (preserveLineBreaks) {
    return withoutControls
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return withoutControls.replace(/\s+/g, " ").trim();
}

export function moderateSubmissionText(
  value: string,
  { maxLinks, bannedTerms = getConfiguredBannedTerms() }: ModerationOptions,
): { ok: true } | { ok: false; message: string } {
  const normalizedForMatching = normalizeForMatching(value);
  const linkCount = value.match(URL_PATTERN)?.length ?? 0;

  if (linkCount > maxLinks) {
    return {
      ok: false,
      message: "Please reduce the number of links before submitting.",
    };
  }

  if (linkCount > 0 && value.length < linkCount * 45) {
    return {
      ok: false,
      message: "Please add more context and reduce link-heavy content.",
    };
  }

  if (/(.)\1{14,}/u.test(value)) {
    return {
      ok: false,
      message: "Please remove repeated characters before submitting.",
    };
  }

  const paddedContent = ` ${normalizedForMatching} `;
  const matchedTerm = bannedTerms.some((term) => {
    const normalizedTerm = normalizeForMatching(term);
    return normalizedTerm.length > 0 && paddedContent.includes(` ${normalizedTerm} `);
  });

  if (matchedTerm) {
    return {
      ok: false,
      message: "This submission contains prohibited or abusive language.",
    };
  }

  return { ok: true };
}

export async function enforceSubmissionThrottle({
  scope,
  normalizedText,
  cooldownSeconds,
  windowSeconds,
  maxSubmissions,
}: ThrottleOptions): Promise<{ ok: true } | { ok: false; message: string }> {
  const now = Date.now();
  const lastAtName = buildCookieName(scope, "last_at");
  const windowStartName = buildCookieName(scope, "window_start");
  const countName = buildCookieName(scope, "count");
  const lastHashName = buildCookieName(scope, "last_hash");

  const lastAt = await getNumberCookie(lastAtName);
  if (lastAt && now - lastAt < cooldownSeconds * 1000) {
    return {
      ok: false,
      message: "Please wait a moment before submitting again.",
    };
  }

  const textHash = hashText(normalizedText);
  if ((await cookies()).get(lastHashName)?.value === textHash) {
    return {
      ok: false,
      message: "This looks like a repeated submission.",
    };
  }

  const windowStart = await getNumberCookie(windowStartName);
  const count = (await getNumberCookie(countName)) ?? 0;
  const windowExpired = !windowStart || now - windowStart > windowSeconds * 1000;
  const nextWindowStart = windowExpired ? now : windowStart;
  const nextCount = windowExpired ? 1 : count + 1;

  if (nextCount > maxSubmissions) {
    return {
      ok: false,
      message: "Too many submissions in a short period. Please try again later.",
    };
  }

  await setThrottleCookie(lastAtName, String(now), windowSeconds);
  await setThrottleCookie(windowStartName, String(nextWindowStart), windowSeconds);
  await setThrottleCookie(countName, String(nextCount), windowSeconds);
  await setThrottleCookie(lastHashName, textHash, windowSeconds);

  return { ok: true };
}

export async function enforceDurableSubmissionThrottle({
  supabase,
  scope,
  normalizedText,
  cooldownSeconds,
  windowSeconds,
  maxSubmissions,
}: DurableThrottleOptions): Promise<{ ok: true } | { ok: false; message: string }> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const requester =
    headerStore.get("cf-connecting-ip") ??
    headerStore.get("x-real-ip") ??
    forwardedFor ??
    "unknown";
  const userAgent = headerStore.get("user-agent") ?? "unknown";

  const { data, error } = await (supabase as any).rpc("consume_submission_rate_limit", {
    scope_input: scope,
    subject_hash_input: hashForStorage(`${scope}:${requester}:${userAgent}`),
    content_hash_input: hashForStorage(`${scope}:${normalizedText}`),
    cooldown_seconds: cooldownSeconds,
    window_seconds: windowSeconds,
    max_submissions: maxSubmissions,
  });

  if (error) {
    return {
      ok: false,
      message: "Submission controls are not fully configured yet. Please try again later.",
    };
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (result?.allowed === true) {
    return { ok: true };
  }

  if (result?.reason === "duplicate") {
    return { ok: false, message: "This looks like a repeated submission." };
  }

  if (result?.reason === "cooldown") {
    return { ok: false, message: "Please wait a moment before submitting again." };
  }

  return {
    ok: false,
    message: "Too many submissions in a short period. Please try again later.",
  };
}

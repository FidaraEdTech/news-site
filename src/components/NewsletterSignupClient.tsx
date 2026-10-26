"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { subscribeToDigestAction } from "@/app/actions/newsletter";

type NewsletterSignupClientProps = {
  publication: string;
  full?: boolean;
};

export function NewsletterSignupClient({
  publication,
  full = false,
}: NewsletterSignupClientProps) {
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    ok: boolean;
    email?: string;
    message: string;
  } | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    const formData = new FormData();
    formData.set("email", trimmed);

    startTransition(async () => {
      const response = await subscribeToDigestAction(formData);
      setResult(response);
      if (response.ok) {
        setEmail("");
      }
    });
  }

  return (
    <div className="newsletter-native-wrap" data-publication={publication}>
      {result?.ok ? (
        <div
          role="status"
          aria-live="polite"
          className="newsletter-success-box"
        >
          <p className="newsletter-success-title">
            ✓ You’re subscribed to The Curator’s Digest!
          </p>
          <p className="newsletter-success-body">
            <strong>{result.email}</strong> has been added directly to our Sunday mailing list. You will receive our curated weekly briefing in your inbox every Sunday.
          </p>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="newsletter-reset-btn"
          >
            Subscribe another email address →
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className={
            full
              ? "newsletter-native-form"
              : "newsletter-native-form newsletter-native-form-compact"
          }
        >
          <label
            htmlFor={full ? "newsletter-email-full" : "newsletter-email-compact"}
            className="sr-only"
          >
            Email address
          </label>
          <input
            id={full ? "newsletter-email-full" : "newsletter-email-compact"}
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="Enter your email address…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            className="newsletter-native-input"
          />
          <button
            type="submit"
            disabled={isPending}
            className="newsletter-native-submit"
          >
            {isPending ? "Subscribing…" : "Subscribe"}
          </button>
        </form>
      )}

      {result && !result.ok && (
        <p role="alert" className="newsletter-error-box">
          {result.message}
        </p>
      )}

      <p className="newsletter-help">
        Free weekly Sunday digest · Instant signup, no redirect ·{" "}
        <Link href="/privacy">Privacy policy</Link>
      </p>
    </div>
  );
}

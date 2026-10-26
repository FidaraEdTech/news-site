"use client";

import { useId, useState } from "react";
import Link from "next/link";

type NewsletterSignupClientProps = {
  publication: string;
  full?: boolean;
};

export function NewsletterSignupClient({
  publication,
  full = false,
}: NewsletterSignupClientProps) {
  const id = useId();
  const frameName = `substack-frame-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const inputId = `newsletter-email-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  function handleSubmit() {
    const trimmed = email.trim();
    if (!trimmed) return;
    // Allow the native form POST to target the hidden sandboxed iframe, then show confirmation inline on-site.
    setTimeout(() => {
      setSubmittedEmail(trimmed);
    }, 60);
  }

  return (
    <div className="newsletter-native-wrap">
      {submittedEmail ? (
        <div
          role="status"
          aria-live="polite"
          className="newsletter-confirm-box"
        >
          <div className="newsletter-confirm-badge" aria-hidden="true">
            ✓
          </div>
          <div>
            <h3 className="newsletter-confirm-title">
              Check your inbox to confirm
            </h3>
            <p className="newsletter-confirm-copy">
              We’ve sent a confirmation link to <strong>{submittedEmail}</strong>. Click the link in that email to complete your free subscription to <em>The Curator’s Digest</em>.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmittedEmail(null);
                setEmail("");
              }}
              className="newsletter-reset-btn"
            >
              Use a different email address
            </button>
          </div>
        </div>
      ) : (
        <form
          action={`${publication}/api/v1/free?nojs=true`}
          method="post"
          target={frameName}
          onSubmit={handleSubmit}
          className={full ? "newsletter-native-form newsletter-native-form-full" : "newsletter-native-form"}
        >
          <input type="hidden" name="source" value="embed" />
          <input type="hidden" name="first_url" value="https://frontlinedaily.org/newsletter" />
          <input type="hidden" name="current_url" value="https://frontlinedaily.org/newsletter" />
          <label htmlFor={inputId} className="sr-only">
            Email address
          </label>
          <div className="newsletter-input-group">
            <input
              id={inputId}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Enter your email address…"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="newsletter-email-input"
            />
            <button type="submit" className="newsletter-submit-btn">
              Subscribe
            </button>
          </div>
          <p className="newsletter-help">
            Free weekly Sunday digest · No spam · Unsubscribe anytime ·{" "}
            <Link href="/privacy">Privacy policy</Link>
          </p>
        </form>
      )}

      {/* Hidden sandboxed frame processes the subscription in-place without ever redirecting away from Frontline Daily */}
      <iframe
        name={frameName}
        src={`${publication}/embed`}
        title="Subscribe to The Curator’s Digest"
        sandbox="allow-scripts allow-forms allow-same-origin"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}

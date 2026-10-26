"use client";

import Link from "next/link";

type NewsletterSignupClientProps = {
  publication: string;
  full?: boolean;
};

export function NewsletterSignupClient({
  publication,
  full = false,
}: NewsletterSignupClientProps) {
  return (
    <div className="newsletter-native-wrap">
      {full ? (
        <>
          <div className="newsletter-embed-window">
            <iframe
              src={`${publication}/embed`}
              title="Subscribe to The Curator’s Digest"
              width="100%"
              height="260"
              loading="lazy"
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
              className="newsletter-embed-cropped"
            />
          </div>
          <p className="newsletter-help">
            Free weekly Sunday digest · Unsubscribe anytime ·{" "}
            <Link href="/privacy">Privacy policy</Link>
          </p>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <Link className="newsletter-link" href="/newsletter">
            Subscribe to the Digest <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

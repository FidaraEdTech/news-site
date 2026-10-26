import Link from "next/link";
import { NewsletterSignupClient } from "@/components/NewsletterSignupClient";
import { getNewsletterUrl } from "@/lib/site-settings";

export async function SubscribeForm({ full = false }: { full?: boolean }) {
  const publication = await getNewsletterUrl();
  return (
    <div className={full ? "newsletter-signup" : "digest-card"}>
      {!full && (
        <>
          <p className="eyebrow">The Sunday newsletter</p>
          <h2>The Curator’s Digest</h2>
          <p>
            A considered selection of Frontline Daily stories, delivered to your inbox every Sunday.
          </p>
        </>
      )}
      {publication ? (
        <NewsletterSignupClient publication={publication} full={full} />
      ) : (
        <>
          <p className="newsletter-pending">Subscriptions are opening soon.</p>
          {full ? (
            <p>We’re preparing the first edition. Please check back here to sign up.</p>
          ) : (
            <Link className="newsletter-link" href="/newsletter">
              About the Digest <span aria-hidden="true">→</span>
            </Link>
          )}
        </>
      )}
    </div>
  );
}

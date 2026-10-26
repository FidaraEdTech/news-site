import Link from "next/link";
import { getNewsletterUrl } from "@/lib/site-settings";

export async function SubscribeForm({ full = false }: { full?: boolean }) {
  const publication = await getNewsletterUrl();
  return <div className={full ? "newsletter-signup" : "digest-card"}>
    {!full && <><p className="eyebrow">The Sunday newsletter</p><h2>The Curator’s Digest</h2><p>A considered selection of Frontline Daily stories, delivered to your inbox every Sunday.</p></>}
    {publication ? full ? <>
      <div className="flex flex-wrap items-center gap-3">
        <a
          className="subscribe-button"
          href={publication + "/subscribe"}
          target="_blank"
          rel="noopener noreferrer"
        >
          Subscribe on Substack <span aria-hidden="true">→</span>
        </a>
      </div>
      <iframe src={publication + "/embed"} title="Subscribe to The Curator’s Digest" width="100%" height="320" loading="lazy" className="newsletter-embed" />
      <p className="newsletter-help">If the form doesn’t load, <a href={publication + "/subscribe"} target="_blank" rel="noopener noreferrer">subscribe directly on Substack</a>.</p>
      <p className="newsletter-help">Your email is handled by Substack. You can unsubscribe from any edition. <Link href="/privacy">Privacy policy</Link>.</p>
    </> : <div className="flex flex-wrap items-center gap-4">
      <Link className="newsletter-link" href="/newsletter">Subscribe to the Digest <span aria-hidden="true">→</span></Link>
      <a className="newsletter-link" href={publication + "/subscribe"} target="_blank" rel="noopener noreferrer">Substack <span aria-hidden="true">↗</span></a>
    </div> : <>
      <p className="newsletter-pending">Subscriptions are opening soon.</p>
      {full ? <p>We’re preparing the first edition. Please check back here to sign up.</p> : <Link className="newsletter-link" href="/newsletter">About the Digest <span aria-hidden="true">→</span></Link>}
    </>}
  </div>;
}

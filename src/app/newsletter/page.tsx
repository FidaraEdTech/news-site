import Link from "next/link";
import { SubscribeForm } from "@/components/SubscribeForm";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "The Curator’s Digest",
  "A weekly selection of Frontline Daily reporting and analysis, curated for your Sunday.",
  "/newsletter"
);

export default function NewsletterPage() {
  return (
    <main className="newsletter-page">
      <div className="newsletter-center-shell">
        <div className="newsletter-intro">
          <span className="newsletter-badge">Frontline Daily · Every Sunday</span>
          <h1>
            The Curator’s Digest<span aria-hidden="true">.</span>
          </h1>
          <p className="newsletter-standfirst">
            The week’s essential reporting. The context that matters.
          </p>
          <p className="newsletter-lead">
            A curated selection of stories and analysis from the Frontline Daily newsroom, brought together in one thoughtful weekly edition delivered straight to your inbox.
          </p>
        </div>

        <section
          className="newsletter-panel"
          aria-labelledby="newsletter-signup-title"
        >
          <div className="newsletter-panel-header">
            <p className="eyebrow">Join the Sunday reading list</p>
            <h2 id="newsletter-signup-title">Subscribe in one step.</h2>
            <p className="newsletter-panel-sub">
              Enter your email below to receive our Sunday briefing directly on Frontline Daily.
            </p>
          </div>
          <SubscribeForm full />
        </section>

        <div className="newsletter-pillars" aria-label="What you receive">
          <div className="newsletter-pillar">
            <span className="newsletter-pillar-num" aria-hidden="true">01</span>
            <h3>Curated Reporting</h3>
            <p>Selected stories from the week across politics, governance, security, and business.</p>
          </div>
          <div className="newsletter-pillar">
            <span className="newsletter-pillar-num" aria-hidden="true">02</span>
            <h3>Direct to Story</h3>
            <p>Concise summaries in your inbox that take you straight to the full report on Frontline Daily.</p>
          </div>
          <div className="newsletter-pillar">
            <span className="newsletter-pillar-num" aria-hidden="true">03</span>
            <h3>Every Sunday</h3>
            <p>One calm, high-signal weekly edition—no daily noise or clutter.</p>
          </div>
        </div>

        <div className="newsletter-footer-cta">
          <Link className="newsletter-link" href="/">
            Explore the latest stories on Frontline Daily <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

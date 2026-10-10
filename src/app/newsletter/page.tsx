import Link from "next/link";
import { SubscribeForm } from "@/components/SubscribeForm";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("The Curator’s Digest", "A weekly selection of Frontline Daily reporting and analysis, curated for your Sunday.", "/newsletter");

export default function NewsletterPage() {
  return <main className="newsletter-page">
    <div className="newsletter-intro">
      <p className="eyebrow">Frontline Daily · Every Sunday</p>
      <h1>The Curator’s<br/>Digest<span aria-hidden="true">.</span></h1>
      <p className="newsletter-standfirst">The week’s reporting.<br/>The context that matters.</p>
      <p>A selection of stories and analysis from the Frontline Daily newsroom, brought together in one thoughtful weekly read.</p>
      <ul className="newsletter-benefits"><li>Selected stories from the week</li><li>Reporting on politics, governance and public life</li><li>One edition, every Sunday</li></ul>
      <Link className="newsletter-link" href="/">Explore the latest stories <span aria-hidden="true">→</span></Link>
    </div>
    <section className="newsletter-panel" aria-labelledby="newsletter-signup-title">
      <p className="eyebrow">The Sunday reading list</p><h2 id="newsletter-signup-title">Make room for a deeper read.</h2>
      <SubscribeForm full />
    </section>
  </main>;
}

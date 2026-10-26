import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { getSiteSettings } from "@/lib/site-settings";

export async function SiteFooter() {
  const settings = await getSiteSettings();
  return <footer className="news-footer">
    <div className="news-footer-grid">
      <div className="news-footer-brand"><Link href="/" aria-label="Frontline Daily home"><Wordmark/></Link><p>Independent reporting.<br/>Context that matters.</p>
        <div className="news-footer-socials">
          {settings?.social_twitter && <a href={settings.social_twitter} target="_blank" rel="noopener noreferrer">X / Twitter</a>}
          {settings?.social_linkedin && <a href={settings.social_linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
          {settings?.social_instagram && <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer">Instagram</a>}
        </div>
      </div>
      <nav aria-label="About the newsroom"><h2>The newsroom</h2><Link href="/about">About Frontline Daily</Link><Link href="/editorial-standards">Editorial standards</Link><Link href="/corrections">Corrections</Link><Link href="/contact">Contact</Link></nav>
      <nav aria-label="Discover"><h2>Stay informed</h2><Link href="/search">Search stories</Link><Link href="/#archive">The archive</Link><Link href="/newsletter">The Curator’s Digest</Link><Link href="/feed.xml">RSS feed</Link></nav>
      <nav aria-label="Site policies"><h2>Information</h2><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms of service</Link></nav>
    </div>
    <div className="news-footer-bottom">© {new Date().getFullYear()} Frontline Daily. All rights reserved.</div>
  </footer>;
}

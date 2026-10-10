"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { Wordmark } from "@/components/Wordmark";
import type { NavCategory } from "@/lib/site";

function MenuIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h16"/></svg>; }
function SearchIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>; }

export function Navbar({ isAdmin, publishedCategories }: { isAdmin: boolean; publishedCategories: NavCategory[] }) {
  const pathname = usePathname();
  const dashboard = pathname.startsWith("/dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null), openerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow, opener = openerRef.current;
    const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
    items()[0]?.focus(); document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setMenuOpen(false); }
      if (event.key === "Tab") {
        const all = items(), first = all[0], last = all[all.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKey); opener?.focus(); };
  }, [menuOpen]);
  function openMenu(event: React.MouseEvent<HTMLButtonElement>) { openerRef.current = event.currentTarget; setMenuOpen(true); }
  const primary = ["politics", "national", "security", "economy-and-business", "world"];
  const deskLinks = [["Dashboard", "/dashboard"], ["Stories", "/dashboard/stories"], ["Photo Desk", "/dashboard/photo-desk"], ["Analytics", "/dashboard/analytics"], ["Settings", "/dashboard/settings"]];
  return <>
    {dashboard ? <header className="dashboard-navbar"><div className="dashboard-navbar-inner">
      <div className="dashboard-navbar-brand">
        <button type="button" className="header-icon dashboard-mobile-menu-btn" onClick={openMenu} aria-label="Open dashboard menu" aria-expanded={menuOpen} aria-controls={menuOpen ? "site-menu" : undefined}><MenuIcon/></button>
        <Link href="/" aria-label="Frontline Daily home"><Wordmark/></Link><span className="dashboard-brand-kicker">Story Desk</span>
      </div><Link className="btn-utility" href="/">View site</Link>
    </div></header> : <header className="news-header">
      <div className="news-header-main">
        <Link href="/" className="news-brand-link" aria-label="Frontline Daily home"><Wordmark/></Link>
        <div className="news-header-actions">
          <form action="/search" role="search" aria-label="Site search" className="header-search"><SearchAutocomplete compact/><button type="submit" className="sr-only">Search</button></form>
          <Link className="header-icon mobile-search" href="/search" aria-label="Search stories"><SearchIcon/></Link>
          <Link className="subscribe-button" href="/newsletter">Subscribe</Link>
          <button className="header-icon mobile-menu" type="button" aria-label="Open menu" aria-expanded={menuOpen} aria-controls={menuOpen ? "site-menu" : undefined} onClick={openMenu}><MenuIcon/></button>
        </div>
      </div>
      <nav className="news-primary-nav" aria-label="Main sections">
        <Link href="/">Latest</Link>
        {primary.map(slug => { const category = publishedCategories.find(item => item.slug === slug); return category ? <Link key={slug} href={"/?category=" + slug}>{slug === "economy-and-business" ? "Business" : category.label}</Link> : null; })}
        <button type="button" onClick={openMenu} aria-expanded={menuOpen} aria-controls={menuOpen ? "site-menu" : undefined}>All sections <span aria-hidden="true">⌄</span></button>
        <div className="nav-secondary"><Link href="/#archive">Archive</Link>{isAdmin && <Link href="/dashboard">Dashboard</Link>}</div>
      </nav>
    </header>}
    {menuOpen && <>
      <div className="news-menu-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true"/>
      <aside ref={menuRef} id="site-menu" className="news-menu" role="dialog" aria-modal="true" aria-label={dashboard ? "Dashboard navigation" : "All sections"}>
        <div className="news-menu-heading"><Wordmark/><button type="button" className="header-icon" aria-label={dashboard ? "Close dashboard menu" : "Close menu"} onClick={() => setMenuOpen(false)}><span aria-hidden="true">×</span></button></div>
        <nav aria-label={dashboard ? "Newsroom tools" : "All news sections"} onClick={event => { if ((event.target as HTMLElement).closest('a')) setMenuOpen(false); }}>
          {dashboard ? deskLinks.map(([label, href]) => <Link href={href} key={href}>{label}</Link>) : <>
            <Link href="/">Latest news</Link>
            {publishedCategories.map(category => <Link key={category.slug} href={"/?category=" + category.slug}>{category.label}</Link>)}
            <hr/><Link href="/search">Search stories</Link><Link href="/newsletter">The Curator’s Digest</Link><Link href="/#archive">Archive</Link><Link href="/about">About Frontline Daily</Link><Link href="/contact">Contact</Link>
            {isAdmin && <Link href="/dashboard">Open dashboard</Link>}
          </>}
        </nav>
      </aside>
    </>}
  </>;
}

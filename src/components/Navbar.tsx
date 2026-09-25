"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { NavCategory } from "@/lib/site";

type NavbarProps = {
  isAdmin: boolean;
  publishedCategories: NavCategory[];
};

function ChevronIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function Navbar({ isAdmin, publishedCategories }: NavbarProps) {
  const pathname = usePathname();
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const opener = openerRef.current;
    const menu = menuRef.current;
    const focusable = () => Array.from(menu?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea') ?? []);
    focusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setMobileMenuOpen(false); }
      if (event.key === "Tab") {
        const items = focusable(), first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const handleResize = () => { if (window.innerWidth >= (isDashboardRoute ? 1024 : 768)) setMobileMenuOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleResize);
      opener?.focus();
    };
  }, [mobileMenuOpen, isDashboardRoute]);

  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  if (!isDashboardRoute) {
    return (
      <>
        <nav className="w-full bg-surface border-b border-outline-variant/30 px-4 lg:px-6 py-1.5 hidden md:block">
          <div className="max-w-screen-2xl mx-auto flex justify-between items-center text-[10px] uppercase tracking-widest font-label font-bold text-on-surface-variant">
            <div className="flex items-center gap-6">
              <span>{today}</span>
              <div className="flex gap-4">
                <Link className="hover:text-primary transition-colors" href="/#archive">Archive</Link>
                <Link className="hover:text-primary transition-colors" href="/contact">Contact</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isAdmin && (
                <Link className="bg-primary text-on-primary px-3 py-1 rounded-sm hover:bg-primary/90 transition-all" href="/dashboard">
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </nav>

        <header className="bg-surface/95 dark:bg-zinc-950/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b-2 border-primary/10">
          <div className="flex flex-col w-full max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 md:py-5 gap-4 md:gap-5">
            <div className="flex justify-between items-center">
              <div className="w-11 shrink-0 md:hidden">
                <button
                  className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-outline-variant/30 text-on-surface hover:text-primary transition-colors"
                  ref={openerRef}
                  onClick={() => setMobileMenuOpen(true)}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-sidebar"
                  aria-label="Open menu"
                >
                  <MenuIcon />
                </button>
              </div>

              <div className="flex-1 hidden lg:flex items-center gap-4">
                <Link href="/#archive" className="text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors">
                  Archive
                </Link>
              </div>

              <Link href="/" className="flex-1 flex justify-center items-center min-w-0 group" aria-label="Frontline Daily Home">
                <svg viewBox="0 0 400 40" className="h-7 sm:h-8 md:h-9 lg:h-11 w-full max-w-[240px] sm:max-w-[300px] md:max-w-[360px] text-primary group-hover:text-red-800 transition-colors" xmlns="http://www.w3.org/2000/svg">
                  <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="font-headline font-black italic fill-current tracking-tight" fontSize="38">
                    <tspan className="text-red-900 dark:text-red-600">FRONTLINE</tspan>{" "}
                    <tspan className="text-red-800 dark:text-red-500">DAILY</tspan>
                  </text>
                </svg>
              </Link>

              <div className="flex shrink-0 justify-end items-center gap-4 lg:flex-1">
                <Link href="/search" className="site-search-link">Search</Link>
                {isAdmin && (
                  <Link className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-primary transition-colors hidden lg:block" href="/dashboard">
                    Dashboard
                  </Link>
                )}
              </div>
            </div>

            <nav className="hidden md:flex md:justify-center md:items-center md:gap-x-5 md:gap-y-1 md:flex-wrap border-t border-outline-variant/20 pt-4">
              <Link className="min-h-11 flex items-center justify-center font-serif text-[14px] tracking-tight uppercase text-primary font-black hover:text-red-700 transition-colors" href="/">
                Latest News
              </Link>
              {publishedCategories.map((category) => (
                <Link
                  className="min-h-11 flex items-center justify-center font-serif text-[17px] tracking-tight uppercase text-zinc-700 dark:text-zinc-300 font-bold hover:text-primary transition-colors"
                  href={`/?category=${category.slug}`}
                  key={category.slug}
                >
                  {category.label}
                </Link>
              ))}
              <Link className="min-h-11 flex items-center justify-center font-serif text-[17px] tracking-tight uppercase text-zinc-700 dark:text-zinc-300 font-bold hover:text-primary transition-colors" href="/#archive">
                Archive
              </Link>
            </nav>
          </div>
        </header>

        <div
          className={`fixed inset-0 bg-on-surface/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />

        <aside
          ref={menuRef}
          role="dialog"
          aria-modal={mobileMenuOpen || undefined}
          aria-hidden={!mobileMenuOpen}
          style={{ visibility: mobileMenuOpen ? "visible" : "hidden" }}
          className={`fixed inset-y-0 left-0 z-[60] flex flex-col bg-surface w-[85%] max-w-sm h-full shadow-2xl transition-transform duration-300 md:hidden ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
          id="mobile-sidebar"
          aria-label="Public navigation"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/30">
            <div className="flex flex-col">
              <span className="font-headline text-[22px] font-black italic text-red-900 tracking-tighter leading-none">FRONTLINE</span>
              <span className="text-[9px] font-bold text-zinc-500 tracking-[0.2em] mt-1">DAILY</span>
            </div>
            <button
              className="w-10 h-10 -mr-2 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-6">
            <div className="mb-8">
              <div className="px-6 mb-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Main Edition</span>
              </div>
              <div className="flex flex-col">
                <Link
                  className="flex items-center px-6 py-4 hover:bg-surface-variant transition-colors border-l-4 border-transparent hover:border-primary font-serif text-[19px] tracking-tight uppercase text-on-surface font-bold"
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Latest News
                </Link>
                {publishedCategories.map((category) => (
                  <Link
                    className="flex items-center px-6 py-4 hover:bg-surface-variant transition-colors border-l-4 border-transparent hover:border-primary font-serif text-[19px] tracking-tight uppercase text-zinc-700 dark:text-zinc-300 font-bold"
                    href={`/?category=${category.slug}`}
                    key={category.slug}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {category.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mb-8 px-6">
              <div className="pt-6 border-t border-outline-variant/30 mb-4">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Resources</span>
              </div>
              <ul className="flex flex-col space-y-4">
                <li>
                  <Link
                    className="flex items-center justify-between text-sm font-semibold uppercase tracking-widest text-zinc-600 hover:text-primary transition-colors"
                    href="/#archive"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    The Archive
                    <ChevronIcon />
                  </Link>
                </li>
                <li>
                  <Link
                    className="flex items-center justify-between text-sm font-semibold uppercase tracking-widest text-zinc-600 hover:text-primary transition-colors"
                    href="/contact"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Contact Desk
                    <ChevronIcon />
                  </Link>
                </li>
              </ul>
            </div>
          </nav>

          {isAdmin && (
            <div className="mt-auto p-6 bg-surface-variant border-t border-outline-variant/30">
              <Link
                className="w-full bg-primary text-on-primary py-3 px-4 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
              >
                Open Dashboard
              </Link>
            </div>
          )}
        </aside>
      </>
    );
  }

  return (
    <>
      <header className="dashboard-navbar">
        <div className="dashboard-navbar-inner">
          <div className="dashboard-navbar-brand">
            <button
              className="icon-btn btn-settings dashboard-mobile-menu-btn"
              type="button"
              ref={openerRef}
                  onClick={() => setMobileMenuOpen(true)}
              aria-expanded={mobileMenuOpen}
              aria-controls="dashboard-mobile-menu"
              aria-label="Open dashboard menu"
            >
              <MenuIcon />
            </button>
            <Link href="/" className="brand-logo font-headline text-primary">
              Frontline Daily
            </Link>
            <span className="dashboard-brand-kicker">Story Desk</span>
          </div>
          <div className="dashboard-navbar-actions">
            <Link href="/" className="btn-utility">View Site</Link>
            <Link className="icon-btn btn-settings" href="/dashboard/settings" aria-label="Settings">
              <SettingsIcon />
            </Link>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 bg-on-surface/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      <aside
          ref={menuRef}
          role="dialog"
          aria-modal={mobileMenuOpen || undefined}
          aria-hidden={!mobileMenuOpen}
          style={{ visibility: mobileMenuOpen ? "visible" : "hidden" }}
        className={`fixed inset-y-0 left-0 z-[60] flex flex-col bg-surface w-[85%] max-w-sm h-full shadow-2xl transition-transform duration-300 lg:hidden ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
        id="dashboard-mobile-menu"
        aria-label="Dashboard navigation"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/30">
          <div>
            <h2 className="dash-sidebar-title">Newsroom</h2>
            <p className="dash-sidebar-subtitle">Editorial CMS</p>
          </div>
          <button
            className="w-10 h-10 -mr-2 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant"
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close dashboard menu"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <span className="dash-sidebar-section-label">Main</span>
          <Link href="/dashboard" className="dash-mobile-link" onClick={() => setMobileMenuOpen(false)}>
            Dashboard
          </Link>
          <Link href="/dashboard/stories" className="dash-mobile-link" onClick={() => setMobileMenuOpen(false)}>
            Stories
          </Link>
          <Link href="/dashboard/photo-desk" className="dash-mobile-link" onClick={() => setMobileMenuOpen(false)}>
            Photo Desk
          </Link>
          <Link href="/dashboard/analytics" className="dash-mobile-link" onClick={() => setMobileMenuOpen(false)}>
            Analytics
          </Link>

          <span className="dash-sidebar-section-label dash-mobile-section-spacer">System</span>
          <Link href="/dashboard/settings" className="dash-mobile-link" onClick={() => setMobileMenuOpen(false)}>
            Settings
          </Link>
          <Link href="/" className="dash-mobile-link" onClick={() => setMobileMenuOpen(false)}>
            View Live Site
          </Link>
        </nav>
      </aside>
    </>
  );
}

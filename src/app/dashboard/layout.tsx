import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
import Link from "next/link";
import { requireAdminUser } from "@/lib/auth";
import { signOutAction } from "./actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminUser();

  return (
    <div className="dash-shell">
      <aside className="dash-sidebar">
        {/* Brand */}
        <div className="dash-sidebar-brand">
          <div className="dash-sidebar-logo">N</div>
          <div>
            <h2 className="dash-sidebar-title">Newsroom</h2>
            <p className="dash-sidebar-subtitle">Editorial CMS</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="dash-sidebar-nav">
          <span className="dash-sidebar-section-label">Main</span>
          <Link href="/dashboard" className="dash-nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Dashboard
          </Link>
          <Link href="/dashboard/stories" className="dash-nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Stories
          </Link>
          <Link href="/dashboard/analytics" className="dash-nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Analytics
          </Link>
          <Link href="/dashboard/photo-desk" className="dash-nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            Photo Desk
          </Link>

          <span className="dash-sidebar-section-label" style={{marginTop: '1.5rem'}}>System</span>
          <Link href="/dashboard/settings" className="dash-nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            Settings
          </Link>
          <Link href="/" className="dash-nav-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            View Live Site
          </Link>
        </nav>

        {/* Quick Action CTA */}
        <div className="dash-sidebar-cta">
          <Link href="/dashboard/stories#new-story" className="dash-sidebar-cta-btn">
            + New Story
          </Link>
        </div>

        {/* User Footer */}
        <div className="dash-sidebar-footer">
          <div className="dash-sidebar-avatar">
            {(user.email ?? "E")[0].toUpperCase()}
          </div>
          <div className="dash-sidebar-user-info">
            <span className="dash-sidebar-user-email">{user.email}</span>
            <form action={signOutAction}>
              <button type="submit" className="dash-sidebar-signout">Sign Out</button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="dash-content">
        {children}
      </div>
    </div>
  );
}

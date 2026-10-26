"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { saveSettingsAction } from "@/app/actions/settings";
import type { SiteSettings } from "@/lib/site-settings";

export default function SettingsForm({ settings }: { settings: SiteSettings | null }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ error?: string | null; success?: boolean } | null>(null);
  function handleSave(formData: FormData) {
    setStatus(null);
    startTransition(async () => {
      try { setStatus(await saveSettingsAction(formData)); }
      catch { setStatus({ error: "Unable to save. Please try again." }); }
    });
  }
  return <div className="settings-panel">
    <h1 className="font-headline text-3xl font-bold mb-6">Website settings</h1>
    <p className="mb-8 text-muted">Manage the author profile, newsletter and Google site verification.</p>
    {status && <p role={status.error ? "alert" : "status"} className={status.error ? "notice notice-error mb-6" : "notice mb-6"}>{status.error || "Settings saved successfully."}</p>}
    <form onSubmit={event => { event.preventDefault(); handleSave(new FormData(event.currentTarget)); }} className="form-shell">
      <fieldset disabled={isPending} className="settings-fieldset">
        <legend>About the author</legend>
        <div className="field"><label htmlFor="author-bio">Author bio</label><textarea id="author-bio" name="author_bio" maxLength={4000} defaultValue={settings?.author_bio || ""} rows={8} aria-describedby="author-bio-help"/>
          <p id="author-bio-help" className="field-hint">Edit the biography shown under “About the author” on the About page. Paragraph breaks are preserved. Up to 4,000 characters.</p>
          <Link href="/about#about-author-title" target="_blank" rel="noopener noreferrer" className="text-primary underline">View the public author bio (opens in a new tab)</Link>
        </div>
        {[["social_twitter", "X / Twitter URL"], ["social_linkedin", "LinkedIn URL"], ["social_instagram", "Instagram URL"]].map(([name, label]) =>
          <div className="field" key={name}><label htmlFor={name}>{label}</label><input id={name} name={name} type="url" maxLength={2048} defaultValue={settings?.[name as "social_twitter"] || ""}/></div>)}
      </fieldset>
      <fieldset disabled={isPending} className="settings-fieldset">
        <legend>The Curator’s Digest</legend>
        <div className="field"><label htmlFor="newsletter-url">Substack publication address</label><input id="newsletter-url" name="newsletter_url" type="url" placeholder="https://frontlinedaily.substack.com or https://substack.com/@frontlinedaily" defaultValue={settings?.newsletter_url || ""} aria-describedby="newsletter-url-help"/>
          <p id="newsletter-url-help" className="field-hint">Enter your Substack publication address (e.g. https://frontlinedaily.substack.com or https://substack.com/@frontlinedaily). The website will show the signup form automatically. Leave this blank until it’s ready.</p>
        </div>
        <p className="field-hint">Prepare each edition in The Curator’s Digest Studio on the Dashboard, then send via Gmail and/or Substack (@frontlinedaily) for Sunday using Africa/Lagos time.</p>
      </fieldset>
      <fieldset disabled={isPending} className="settings-fieldset">
        <legend>Google Search Console</legend>
        <ol className="settings-instructions">
          <li>Open <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Google Search Console</a> using the site owner’s Google account.</li>
          <li>Add a <strong>URL prefix</strong> property for <strong>https://frontlinedaily.org/</strong>.</li>
          <li>Choose <strong>HTML tag</strong>. Copy only the value inside <strong>content=&quot;…&quot;</strong> and paste it below.</li>
          <li>Save these settings, return to Google and click <strong>Verify</strong>. Then submit <strong>sitemap.xml</strong> under Sitemaps.</li>
        </ol>
        <div className="field"><label htmlFor="google-verification">Google verification value</label><input id="google-verification" name="google_site_verification" maxLength={256} defaultValue={settings?.google_site_verification || ""} autoComplete="off" spellCheck={false} aria-describedby="google-verification-help"/>
          <p id="google-verification-help" className="field-hint">Google supplies this public value. Verification proves website ownership; it is separate from website security and does not guarantee indexing. Keep the value here after verification.</p>
        </div>
      </fieldset>
      <button type="submit" className="button" disabled={isPending} aria-busy={isPending}>{isPending ? "Saving…" : "Save settings"}</button>
    </form>
  </div>;
}

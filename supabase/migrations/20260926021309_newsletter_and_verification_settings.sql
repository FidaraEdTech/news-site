-- Public publication URL and Google-issued ownership token; no credentials.
-- Existing admin-only UPDATE policy and public SELECT policy remain in force.
alter table public.site_settings
  add column if not exists newsletter_url text,
  add column if not exists google_site_verification text;

comment on column public.site_settings.newsletter_url is 'HTTPS Substack publication origin used by newsletter signup.';
comment on column public.site_settings.google_site_verification is 'Public Google Search Console HTML-tag verification value.';

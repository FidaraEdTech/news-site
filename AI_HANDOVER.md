# Frontline Daily — project handover

**Prepared:** 24 October 2026  
**Live site:** https://frontlinedaily.org  
**Repository:** https://github.com/FidaraEdTech/news-site

## Start here

The project is up to date on GitHub. At the time this handover was written, both
`main` and `feat/seo-categories-editor` point to commit
`78dc5e9b8d471e5ef997dc2ae7be0e1917337af1`.

The latest deployed application code is commit
`abf9f88b46bcd5c100b525d407f224743234bbdc`; the later commit only records
release verification notes. The live production deployment is
`dpl_42Fu26BQvPdMsrjUJmdZ9chX4tmr` and was READY on 11 October 2026.

To continue from another computer:

```bash
git clone https://github.com/FidaraEdTech/news-site.git
cd news-site
git checkout main
npm install
```

Do not copy `.env.local`, Supabase keys, Vercel tokens, or any other credentials
into the repository. Obtain them through the account owner or configure them in
the new computer's local environment and Vercel project settings.

## What is complete

- Next.js 16.3.8 and React 19.3.0 newsroom site backed by Supabase.
- Public home, story, search, About, contact, archive, policy, newsletter and
  category pages.
- Twelve main editorial categories; tags allow a story to appear under more than
  one topic.
- Search supports titles, story text, categories, tags and authors. Header search
  has keyboard-accessible autocomplete for published stories, categories and
  authors.
- Responsive navy/blue Frontline Daily wordmark, simplified desktop navigation
  and accessible mobile menu.
- Editor supports draft, reopen and publish workflows plus bold, italic, smaller
  text, headings, quotations, lists, uppercase, undo/redo and safe formatting.
- Dashboard Settings allows the editor to update the author biography. It appears
  on the public About page.
- SEO work: server-rendered story text, canonical URLs, descriptions/social
  metadata, NewsArticle structured data, sitemap and robots file.
- Standard browser favicon, PNG favicon and Apple touch icon use the current
  navy/blue three-line brand mark. Regenerate these assets with:

  ```bash
  node scripts/generate-icons.mjs
  ```

- Basic security improvements: response security headers, no powered-by header,
  private/no-store authenticated responses and existing Supabase RLS controls.

## What has been checked

- `npm test`: nine unit/database tests passed on 10 October 2026.
- `npm run test:browser`: four complete local browser flows passed: search,
  public-page accessibility/responsiveness, editor publish workflow, and
  settings/newsletter/author biography behaviour.
- `npm run typecheck` and Vercel's production build passed for the favicon
  follow-up on 11 October 2026.
- Public live checks passed for home, About, newsletter, search, autocomplete,
  article, sitemap and robots. The sitemap had 68 published stories at that time.
- Public article HTML contained the article text, canonical URL and NewsArticle
  schema. The latest production error/fatal log scan found no matching entries.

These checks were targeted tests, not a full accessibility or security
certification. Local browser test writes use a fixture server; they do not alter
real production stories.

## Work still waiting for the owner

### 1. Curator's Digest / Substack

The newsletter page is designed and live at `/newsletter`, but it deliberately
shows **“Subscriptions are opening soon”** until a real Substack publication URL
is provided.

When the owner creates a publication:

1. Sign in to the newsroom dashboard as the editor.
2. Open **Settings**.
3. Enter the publication address in the form, for example
   `https://frontlinedaily.substack.com`.
4. Save the settings and visit `/newsletter` to confirm the embedded signup form
   and direct Substack link appear.
5. Prepare each weekly selection of stories in Substack and schedule it for
   Sunday in the Africa/Lagos time zone.

The website does not choose stories, compose editions, retain email addresses or
send emails. Substack does those jobs. No paid newsletter service has been
created or connected.

### 2. Google Search Console ownership and indexing

No Google verification token or Search Console account access was supplied.

- For a **URL-prefix** property, obtain Google's HTML-tag value and place it in
  Dashboard → Settings. The site already emits valid verification metadata in
  the initial HTML.
- For a **Domain** property, obtain the exact Google TXT record and add it at the
  domain's DNS provider. Do not replace unrelated TXT records.
- After Google verifies ownership, submit `https://frontlinedaily.org/sitemap.xml`,
  inspect at least one published article with URL Inspection, and resolve any
  indexing exclusions before requesting indexing.

Verification and sitemap submission require the owner's Google and DNS access;
neither was attempted here.

### 3. Editorial review

Some older stories have ambiguous legacy labels such as `Clarification`,
`Report`, `Social` and `Social News`. Keep the stories intact and let an editor
choose a suitable main category when reviewing them. Do not bulk reclassify them
without editorial approval.

## Important technical context

- Supabase project used by production: `omflzgashingpvmyxsof` (Newsroom).
- Existing database migrations were applied before this handover, including:
  - `supabase/migrations/20260924181142_seo_editor_taxonomy.sql`
  - `supabase/migrations/20260926021309_newsletter_and_verification_settings.sql`
- RLS was checked as enabled. Existing settings and stories must be preserved.
- Required runtime configuration is documented in `README.md`. At minimum the
  application needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `NEWSROOM_ADMIN_EMAIL` and `NEXT_PUBLIC_SITE_URL`. The production Vercel
  project already had its required values configured. Do not expose their values
  in commits, screenshots or handover messages.
- `README.md` contains older wording such as “Next.js 14”; the actual installed
  versions are in `package.json` and are Next.js 16.3.8 / React 19.3.0.
- The Next.js-generated `AGENTS.md` at the repository root must be read before
  editing; it points to the appropriate local Next.js documentation.
- The laptop had limited free storage and RAM. Avoid unnecessary reinstall/build
  loops, and do not delete unrelated folders or processes to make room.

## Commands for the next assistant

```bash
# Quick code validation
npm run typecheck
npm test

# Full local browser suite (requires Chrome; can take a long time on a low-spec PC)
npm run test:browser

# Local development
npm run dev

# Production build (can require substantial temporary disk space)
npm run build
```

Read `SEO_EDITOR_RELEASE.md` for detailed historical verification and
`MIGRATION_RUNBOOK.md` before making database changes. Prefer additive
migrations, take/verify a database backup before production schema changes, and
test a preview before creating a production deployment.

## Deployment context

- Hosting: Vercel project `news-site`.
- Vercel team ID: `team_7p5TcgHzG1LrzaslVVSXjyKh`.
- Vercel project ID: `prj_2khLOkm9QlY48y63Udfh0seNBrPl`.
- The GitHub repository is linked, but recent Git pushes did not automatically
  build a deployment. Check the Vercel deployment list after a push. If a manual
  production deployment is needed, use the existing project and the exact Git
  commit SHA, then confirm `frontlinedaily.org` is assigned and returns the new
  content.

## Dependency note

The production-only dependency audit was clear on 10 October 2026. A full audit
still had seven build-tool findings within the Tailwind 3 dependency tree.
The automated forced remedy moves the project to Tailwind 4, which is a separate
styling migration. Do not apply it blindly during unrelated feature work.

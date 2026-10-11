# SEO, categories, accessibility and editor release

## October 2026 update

- Production rollout completed on 10 October: Vercel deployment `dpl_BcGxoz1fZUQDWF5wWun8fNhBkipt`, source `33ac001a5af83105afcc96ffb4e34dcd60aeba40`, READY and assigned to `frontlinedaily.org`. On 11 October the live home, About, newsletter and autocomplete endpoints returned HTTP 200.
- Favicon follow-up: added standard ICO (16/32/48 pixels), PNG (48 pixels) and Apple touch icon (180 pixels), generated from the existing navy/blue three-line brand mark. Removed the unsupported Apple SVG and explicit unversioned links so Next.js provides content-versioned icon metadata. `node scripts/generate-icons.mjs` regenerates the checked-in assets.
- The favicon fix is live as of 11 October: deployment `dpl_42Fu26BQvPdMsrjUJmdZ9chX4tmr`, source `abf9f88b46bcd5c100b525d407f224743234bbdc`, READY with `frontlinedaily.org` assigned. TypeScript and the cloud production build passed. All four public icon files returned HTTP 200 and matched the local assets byte-for-byte; the rendered HTML includes versioned icon links and the valid Apple PNG.
- Post-deployment checks: home, newsletter, About, search, autocomplete, sitemap, robots and an article returned HTTP 200; sitemap contains 68 published stories; article HTML includes the body, canonical and NewsArticle schema. Unauthenticated Settings requests redirect to login with private/no-store caching. The error/fatal log scan for the new deployment returned no matching entries in the 30-minute window ending 11 October at 02:22 UTC.
- Reviewed the live newsletter on desktop and at a phone-size viewport. The page currently displays “Subscriptions are opening soon” because no Substack publication URL is configured. Signup and actual email delivery remain unverified against a real publication; no subscriber data or production article was changed during verification.
- The author biography is editable in Dashboard → Settings → About the author. Saving updates the public About page, preserves paragraph breaks and keeps editor-only write access. Failed loads block the form and failed saves preserve typed changes.
- Compact navy/blue Frontline Daily wordmark, simpler navigation, mobile menu and clearer search result listings.
- Autocomplete suggests published headlines, main categories and authors; partial-word search supports the full results page and remains usable when suggestions are unavailable.
- Newsletter signup is prepared at `/newsletter`. Add the publication's Substack URL in Settings when the account exists; the website does not automatically schedule or send editions.
- Settings accepts Google's HTML-tag verification value for a URL-prefix property. Metadata is included in the initial HTML head. The owner still needs to obtain Google's value and complete verification in Search Console.
- Updated to Next.js 16.3.8 and React 19.3.0, migrated async request APIs/proxy, protected authenticated responses from shared caching, and added standard security response headers.
- On 10 October, all nine unit/database tests passed. The preview production build passed, real partial search returned results, and the sitemap included all 68 then-published stories. A real article contained server-rendered body text, canonical URL and NewsArticle schema.
- Production dependency audit: zero reported vulnerabilities on 10 October. Seven build-tool dependency findings remain in the Tailwind 3 dependency tree (braces and postcss-selector-parser and their dependants). The suggested forced upgrade moves to Tailwind 4 and needs a separate styling migration; it has not been applied blindly.

- All four browser workflows passed on 10 October: autocomplete and keyboard/fallback search; metadata, automated WCAG A/AA scans and responsive navigation; rich-text draft/save/reopen/publish; and author biography/newsletter/Google settings validation, persistence and public rendering. These write tests used a local fixture, not production content.
- Reviewed desktop preview and mobile About screenshots. The tested widths (320, 390, 768 and 1440 pixels) had no horizontal overflow. This is a targeted accessibility check, not a full certification.

The September notes below describe the earlier release. Their Next.js 14 upgrade warning and deferred newsletter implementation have been superseded by this update; connecting the newsletter publication and completing Google ownership verification still require the owner's account details.

## Production rollout — 25 September 2026

- Deployed to https://frontlinedaily.org using the existing Vercel news-site project.
- Production deployment: `dpl_6RibkQe3K5RmnqNZLfU7SMuvhq9f`; Vercel reported READY, with the existing domain assigned successfully.
- Backed up all 44 stories outside the repository before applying `seo_editor_taxonomy` to the verified Newsroom database.
- Migration applied successfully. All 44 stories remain published, legacy content stays plain text, and row-level security remains enabled. A real full-text query returned 31 matching stories.
- Production sitemap returned HTTP 200 with all 44 articles (61 URLs total); robots.txt points to the correct production sitemap.
- Initial production error/fatal log scan found no matching entries. Live home, About, Search, category and story pages returned HTTP 200 with zero automated WCAG A/AA violations and no browser exceptions. Homepage layouts at 320, 390, 768 and 1440 pixels had no horizontal overflow; desktop and mobile screenshots were reviewed.
- Post-deploy review found and corrected Next 14's root-query canonical URL handling. The category canonical/Open Graph regression browser test and TypeScript checks passed. The empty Breaking strip is now hidden when no active breaking stories exist. Follow-up deployment: `dpl_9i2eH9MP2U4iTTkPyQk29vxLB1p7`.
- Search Console/DNS verification and the existing framework security advisories remain outstanding.

## Changes

- Twelve agreed main categories, shared by public navigation and both publishing forms.
- Up to ten normalized topic tags and an optional public author/byline.
- Visual editor: bold, italic, smaller text, headings, subheadings, quotations, lists, uppercase, undo/redo and clear formatting.
- Existing story content remains plain text until edited. HTML is sanitized on save and again on rendering; arbitrary HTML, scripts and unsafe links are not allowed.
- Server-rendered search for headline, body, excerpt, category and byline, with category/tag filtering and pagination. Only published stories are queried.
- Correct canonical URLs, descriptions and social metadata on public information pages and category views. Search, login and dashboard pages are noindex.
- Published-story sitemap paginates through database results and uses actual story timestamps. Static pages no longer claim a new modification time on every request.
- Article schema includes real bylines where supplied, tags and publisher URL; photo stories also receive schema.
- Mobile zoom restored; visible focus indicators, keyboard navigation in mobile menus, reduced-motion styling, more readable footer contrast, labeled upload controls and responsive navigation.
- Inter and Newsreader fonts bundled locally to avoid a Google Fonts dependency during builds.

## Deployment order

1. Back up the production database and verify the correct project. The rollout above completed this step for this release.
2. Apply `supabase/migrations/20260924181142_seo_editor_taxonomy.sql` to the existing database. For fresh installs, `supabase/schema.sql` already includes these additions. Existing story RLS policies stay in force; no new public write permissions are introduced.
3. Review legacy categories. The migration only normalizes obvious aliases (for example Business → Economy & Business and Investigation → Special Reports), preserving an old topic as a tag. It deliberately leaves ambiguous topics unchanged. An editor must choose a main category when next editing an unmatched story. Do not bulk-reclassify these without editorial review.
4. Deploy the application with its existing environment variables. Confirm `NEXT_PUBLIC_SITE_URL=https://frontlinedaily.org`.
5. Test with the real editor account: save a draft, reopen it, publish, update the live story, inspect the public HTML, and verify that an unauthenticated visitor cannot read drafts. Local browser tests use a simulated Supabase HTTP service; they do not prove production database permissions or email delivery.
6. Confirm `/sitemap.xml`, `/robots.txt`, article metadata and category links in production. Submit the sitemap in Search Console.

## Search Console work requiring account access

The supplied screenshot reports a missing DNS verification token. Retrieve the exact token from the correct Search Console property, add its TXT record at the authoritative DNS provider, wait for it to resolve, then verify. Never replace existing unrelated TXT records.

`GOOGLE_SITE_VERIFICATION` is an optional alternative for a URL-prefix property only; it does not replace DNS verification for a Domain property.

After verification, inspect a published article using URL Inspection and the live rendered HTML, confirm the article body and canonical, inspect indexing exclusions and submit/request indexing as appropriate. Google indexing and News inclusion are not guaranteed. No Search Console submission or DNS change has been made.

## Verification

Completed locally on 25 September 2026: production build passed; six unit/database tests passed; two browser workflows passed. Automated WCAG 2 A/AA and 2.1 AA scans reported no violations on the tested home, About, Contact, Search, article and story-editor views. About-page layouts were checked at 320, 390, 768 and 1440 pixels. This is a targeted check, not a full accessibility certification.

Public DNS lookup on the same date returned no TXT records and no Google ownership-verification token. Search Console itself has not been accessed.

- `npm test`: sanitizer, legacy formatting, taxonomy validation and an actual embedded PostgreSQL migration/search test.
- `npm run test:browser`: desktop public-page accessibility scans, canonical metadata, search, mobile focus handling and draft/publish formatting round trip against a local HTTP fixture. Requires Chrome installed. Uses only local ports 3001 and 54329.
- `npm run typecheck` and `npm run build`.
- `NEXT_DISABLE_CACHE=1` can reduce build cache disk usage on storage-constrained machines.

## Remaining operational work

- Review unknown legacy categories and fill real author names where appropriate. Older stories otherwise use the newsroom organization as author.
- Observed ambiguous live labels still needing editorial choices: Clarification, Report, Social and Social News. Compound labels with a clear topic are mapped (for example Government / Health → Health and National News / Security → Security), with original labels retained as tags.
- DNS/Search Console and authenticated production publishing checks need account access.
- Newsletter setup and scheduling are deferred.
- The pre-existing Next.js 14 dependency has security advisories, including critical advisories reported by npm. A framework upgrade and compatibility verification remain separate maintenance work; this release does not resolve those advisories. Review before production rollout.

# SEO, categories, accessibility and editor release

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

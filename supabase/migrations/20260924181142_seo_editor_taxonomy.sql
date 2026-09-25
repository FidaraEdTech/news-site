-- Apply before deploying the editor/search release. Additive: existing content remains plain text.
begin;
alter table public.stories
  add column if not exists tags text[] not null default '{}',
  add column if not exists byline text,
  add column if not exists content_format text not null default 'plain' check (content_format in ('plain', 'html'));

-- No new tables or policies: the existing stories RLS policies still govern every query.
alter table public.stories add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(byline, '') || ' ' || coalesce(category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', regexp_replace(coalesce(content, ''), '<[^>]*>', ' ', 'g')), 'C')
  ) stored;
create index if not exists stories_search_vector_idx on public.stories using gin (search_vector);
create index if not exists stories_tags_idx on public.stories using gin (tags);
-- Normalize only unambiguous aliases. Preserve the old topic in tags.
with mapping(old_name, new_name) as (values
 ('politics', 'Politics'),
 ('government-and-governance', 'Government & Governance'),
 ('national', 'National'),
 ('security', 'Security'),
 ('humanitarian-affairs', 'Humanitarian Affairs'),
 ('economy-and-business', 'Economy & Business'),
 ('health', 'Health'),
 ('world', 'World'),
 ('public-policy', 'Public Policy'),
 ('special-reports', 'Special Reports'),
 ('opinion', 'Opinion'),
 ('procurement', 'Procurement'),
 ('government', 'Government & Governance'),
 ('governance', 'Government & Governance'),
 ('business', 'Economy & Business'),
 ('economy', 'Economy & Business'),
 ('economics', 'Economy & Business'),
 ('humanitarian', 'Humanitarian Affairs'),
 ('international', 'World'),
 ('policy', 'Public Policy'),
 ('investigation', 'Special Reports'),
 ('investigations', 'Special Reports'),
 ('special-report', 'Special Reports'),
 ('political', 'Politics'),
 ('world-news', 'World'),
 ('national-news', 'National'),
 ('politics-and-governance', 'Politics'),
 ('procurement-article', 'Procurement'),
 ('development-humanitarian-affairs', 'Humanitarian Affairs'),
 ('governance-humanitarian-affairs', 'Humanitarian Affairs'),
 ('government-humanitarian-affairs', 'Humanitarian Affairs'),
 ('public-humanitarian-affairs', 'Humanitarian Affairs'),
 ('government-health', 'Health'),
 ('government-national-news', 'National'),
 ('government-ossap-tvee', 'Government & Governance'),
 ('government-youth-affairs', 'Government & Governance'),
 ('institutional-government-report', 'Government & Governance'),
 ('national-news-security', 'Security'),
 ('national-security', 'Security'),
 ('security-national-news', 'Security'),
 ('economy-monetary-policy', 'Economy & Business'),
 ('public-affairs-consumer-economy-news', 'Economy & Business'),
 ('public-policy-social-protection', 'Public Policy')
)
update public.stories s set
 tags = case when lower(trim(s.category)) <> lower(m.new_name)
   then array(select distinct tag from unnest(s.tags || array[lower(trim(s.category))]) tag)
   else s.tags end,
 category = m.new_name
from mapping m where btrim(regexp_replace(replace(lower(trim(s.category)), '&', 'and'), '[^a-z0-9]+', '-', 'g'), '-') = m.old_name and s.category <> m.new_name;
commit;

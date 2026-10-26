import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { prefixSearchQuery, searchTerms } from '../src/lib/search';
import {
  buildStoriesRssFeed,
  formatDigestEdition,
  normalizeSubstackUrl,
  validGoogleVerification,
} from '../src/lib/newsletter';

test('prefix search handles partial headlines, categories and names in PostgreSQL', async () => {
  const db = new PGlite();
  await db.exec(`create table stories(id int primary key,title text,category text,excerpt text,content text);
    insert into stories values (1,'Budget accountability report','Politics','','Public spending and health care.');`);
  await db.exec(readFileSync('supabase/migrations/20260924181142_seo_editor_taxonomy.sql','utf8'));
  await db.exec(`update stories set byline='Ene Mc''Dickson' where id=1`);
  for (const text of ['polit','bud acc','Ene Mc\'Dick','health-care']) {
    assert.deepEqual((await db.query(`select id from stories where search_vector @@ to_tsquery('english',$1)`,[prefixSearchQuery(text)])).rows,[{id:1}]);
  }
  assert.equal(prefixSearchQuery('!!!'), '');
  assert.equal(prefixSearchQuery('budget | !security'), 'budget:* & security:*');
  assert.ok(searchTerms('term '.repeat(100)).length <= 8);
  await db.close();
});

test('newsletter URL validation prevents arbitrary embeds and strips unsafe paths', () => {
  assert.equal(normalizeSubstackUrl('https://frontline-test.substack.com/embed?utm=test'), 'https://frontline-test.substack.com');
  for (const url of ['javascript:alert(1)','http://example.substack.com','https://substack.com.evil.test','https://evil.test/?site=frontline.substack.com','https://user:pass@frontline.substack.com','https://frontline.substack.com:8080']) assert.equal(normalizeSubstackUrl(url),null);
  assert.equal(validGoogleVerification('test_google-verification_token_123'),true);
  assert.equal(validGoogleVerification('<meta content="test">'),false);
});

test('digest edition formatter directs subscribers back to Frontline Daily and escapes unsafe HTML', () => {
  const digest = formatDigestEdition({
    title: 'The Curator’s Digest — Sunday Edition',
    introNote: 'Top stories from the newsroom.',
    siteUrl: 'https://frontlinedaily.org/',
    stories: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Fiscal Reform & <Accountability>',
        category: 'Politics',
        excerpt: 'Key lawmakers debated the 2026 budget framework.',
        byline: 'Ene Mc’Dickson',
      },
    ],
  });

  assert.equal(digest.subject, 'The Curator’s Digest — Sunday Edition');
  assert.match(digest.html, /https:\/\/frontlinedaily\.org\/story\/11111111-1111-4111-8111-111111111111/);
  assert.match(digest.html, /Read the full story on Frontline Daily →/);
  assert.match(digest.html, /Fiscal Reform &amp; &lt;Accountability&gt;/);
  assert.doesNotMatch(digest.html, /<Accountability>/);
  assert.match(digest.text, /Read the full story on Frontline Daily: https:\/\/frontlinedaily\.org\/story\/11111111-1111-4111-8111-111111111111/);
});

test('RSS feed builder outputs valid XML items pointing to canonical Frontline Daily story URLs', () => {
  const xml = buildStoriesRssFeed(
    [
      {
        id: '22222222-2222-4222-8222-222222222222',
        title: 'Energy Grid & Power Report',
        category: 'Economy & Business',
        excerpt: 'New transmission milestones across the national grid.',
        published_at: '2026-10-25T10:00:00.000Z',
      },
    ],
    'https://frontlinedaily.org'
  );

  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<link>https:\/\/frontlinedaily\.org\/story\/22222222-2222-4222-8222-222222222222<\/link>/);
  assert.match(xml, /<title>Energy Grid &amp; Power Report<\/title>/);
  assert.match(xml, /<category>Economy &amp; Business<\/category>/);
});

test('settings migration is additive, repeatable and preserves existing profile values', async () => {
  const db = new PGlite();
  await db.exec(`create table site_settings (id int primary key, author_bio text); insert into site_settings values(1,'Original bio');`);
  const sql = readFileSync('supabase/migrations/20260926021309_newsletter_and_verification_settings.sql','utf8');
  await db.exec(sql); await db.exec(sql);
  assert.deepEqual((await db.query('select * from site_settings')).rows,[{id:1,author_bio:'Original bio',newsletter_url:null,google_site_verification:null}]);
  await db.close();
});

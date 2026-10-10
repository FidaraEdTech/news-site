import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { prefixSearchQuery, searchTerms } from '../src/lib/search';
import { normalizeSubstackUrl, validGoogleVerification } from '../src/lib/newsletter';

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

test('settings migration is additive, repeatable and preserves existing profile values', async () => {
  const db = new PGlite();
  await db.exec(`create table site_settings (id int primary key, author_bio text); insert into site_settings values(1,'Original bio');`);
  const sql = readFileSync('supabase/migrations/20260926021309_newsletter_and_verification_settings.sql','utf8');
  await db.exec(sql); await db.exec(sql);
  assert.deepEqual((await db.query('select * from site_settings')).rows,[{id:1,author_bio:'Original bio',newsletter_url:null,google_site_verification:null}]);
  await db.close();
});

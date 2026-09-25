import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('migration preserves legacy content, normalizes aliases and supports author/headline/body search', async()=>{
 const db=new PGlite();
 await db.exec(`create table stories(id int primary key, title text, category text, excerpt text, content text);
 insert into stories values (1,'Budget report','Business','Public spending','An investigation into hospitals.'),(2,'Culture report','Culture','','Unchanged <literal> text'),(3,'Care update','Government / Health','','Care update');`);
 const migration=readFileSync('supabase/migrations/20260924181142_seo_editor_taxonomy.sql','utf8');
 await db.exec(migration); await db.exec(migration);
 const rows=(await db.query<any>('select * from stories order by id')).rows;
 assert.equal(rows[0].category,'Economy & Business');assert.deepEqual(rows[0].tags,['business']);
 assert.equal(rows[1].category,'Culture');assert.equal(rows[1].content,'Unchanged <literal> text');assert.equal(rows[1].content_format,'plain');
 assert.equal(rows[2].category,'Health');assert.deepEqual(rows[2].tags,['government / health']);
 await db.exec(`update stories set byline='Jane Reporter', content_format='html', content='<p>Hospital funding</p>' where id=1;`);
 for(const query of ['budget','hospital','Jane Reporter','business']) {
  const result=await db.query(`select id from stories where search_vector @@ websearch_to_tsquery('english',$1)`,[query]);
  assert.deepEqual(result.rows,[{id:1}]);
 }
 await assert.rejects(db.exec(`update stories set content_format='script' where id=1`));
 await db.close();
});

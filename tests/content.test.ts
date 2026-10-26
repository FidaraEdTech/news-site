import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeStoryHtml, storyHtml } from '../src/lib/story-content';
import {
  CATEGORIES,
  formatStoryCategories,
  isValidCategoryName,
  normalizeCategory,
  parseStoryCategories,
  parseTags,
  storyMatchesCategory,
} from '../src/lib/categories';

test('published rich text strips scripts, attributes and unsafe URLs', () => {
 const html=sanitizeStoryHtml('<p onclick="alert(1)"><strong>News</strong><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><iframe src="https://evil.example"></iframe><small>Note</small></p>');
 assert.match(html, /<strong>News<\/strong>/); assert.match(html, /<small>Note<\/small>/);
 assert.doesNotMatch(html, /script|onclick|onerror|iframe|javascript|<img/i);
});
test('legacy plain text is escaped rather than interpreted as HTML',()=>{
 assert.equal(storyHtml('A <script>alert(1)</script> & B\nline\n\nNext', 'plain'), '<p>A &lt;script&gt;alert(1)&lt;/script&gt; &amp; B<br>line</p><p>Next</p>');
});
test('formatting round trips through sanitization',()=>{
 const html='<h2>Heading</h2><p><strong>Bold</strong> <em>Italic</em> <small>Small</small></p><blockquote><p>Quote</p></blockquote><ul><li><p>Item</p></li></ul>';
 assert.equal(storyHtml(html,'html'),html);
});
test('categories normalize known aliases and preserve unknown legacy values',()=>{
 assert.equal(CATEGORIES.length,12); assert.equal(normalizeCategory('business'),'Economy & Business');
 assert.equal(normalizeCategory('government-and-governance'),'Government & Governance');
 assert.equal(normalizeCategory('Technology'),'Technology');
 assert.equal(normalizeCategory('Government / Health'),'Health');
 assert.equal(normalizeCategory('National News / Security'),'Security');
 assert.equal(normalizeCategory('Report'),'Report');
});
test('multi-category stories parse, deduplicate, format and match across sections',()=>{
 assert.deepEqual(parseStoryCategories('Politics, Security, politics, Custom Beats'), ['Politics', 'Security', 'Custom Beats']);
 assert.equal(formatStoryCategories(['Politics', 'Security', 'Politics']), 'Politics, Security');
 assert.equal(storyMatchesCategory({ category: 'Politics, Security, Sports' }, 'security'), true);
 assert.equal(storyMatchesCategory({ category: 'Politics, Security, Sports' }, 'sports'), true);
 assert.equal(storyMatchesCategory({ category: 'Politics, Security' }, 'health'), false);
 assert.equal(isValidCategoryName('Sports & Athletics'), true);
 assert.equal(isValidCategoryName('A'), false);
});
test('tags are normalized and constrained',()=>{
 assert.deepEqual(parseTags(' Budget, budget , Public   Health '),['budget','public health']);
 assert.throws(()=>parseTags('x'.repeat(41)));assert.throws(()=>parseTags(Array.from({length:11},(_,i)=>String(i)).join(',')));
});

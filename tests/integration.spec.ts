import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('autocomplete finds published headlines, categories and authors with keyboard and fallback search', async({page})=>{
 const api=await page.request.get('/api/search/suggestions?q=Bud');
 expect(api.status()).toBe(200);
 expect((await api.json()).suggestions.map((s:any)=>s.label)).toEqual(['Budget accountability report']);
 expect(api.headers()['cache-control']).toContain('no-store');
 expect((await (await page.request.get('/api/search/suggestions?q=Draft')).json()).suggestions).toEqual([]);
 await page.goto('/search');
 const input=page.getByRole('search',{name:'Search the newsroom',exact:true}).getByRole('combobox',{name:'Search stories'});
 await input.fill('polit'); await expect(page.getByRole('listbox',{name:'Search suggestions'}).getByRole('option',{name:/Politics/})).toBeVisible();
 await input.press('Escape'); await expect(input).toHaveAttribute('aria-expanded','false');
 await expect(input).toHaveValue('polit');
 await input.press('ArrowDown'); await input.press('Enter'); await page.waitForURL('**/?category=politics');
 await page.goto('/search');await input.fill('Bud');
 await expect(page.getByRole('option',{name:/Budget accountability report/})).toBeVisible();
 await input.press('ArrowDown');await input.press('Enter');await page.waitForURL('**/story/11111111-1111-4111-8111-111111111111');
 await page.goto('/search');await input.fill('Jane');
 await expect(page.getByRole('option',{name:/Jane Reporter/})).toBeVisible();
 await input.press('ArrowDown');await input.press('Enter');await page.waitForURL('**/search?author=*');
 await expect(page.locator('.search-results-status')).toContainText('1 story found');
 await page.goto('/search?q=polit');await expect(page.locator('.search-results-status')).toContainText('1 story found');
 await page.goto('/search?q=%21%21%21');await expect(page.locator('.search-results-status')).toContainText('No stories found');
 await page.route('**/api/search/suggestions?*',route=>route.fulfill({status:503,body:'{}'}));
 await input.fill('budget');await expect(page.getByRole('status').filter({hasText:'Suggestions unavailable'})).toBeVisible();
 await input.press('Enter');await page.waitForURL('**/search?q=budget*');await expect(page.locator('.search-results-status')).toContainText('1 story found');
});

test('public metadata, server-rendered article, search and mobile keyboard navigation',async({page})=>{
 test.setTimeout(300000);
 for(const route of ['/','/about','/contact','/search','/newsletter','/story/11111111-1111-4111-8111-111111111111']){
  await page.goto(route);
  await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute('content',/maximum-scale/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://frontlinedaily.org${route==='/'?'':route}`);
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
 }
 await page.goto('/?category=politics');
 await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://frontlinedaily.org/?category=politics');
 await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content','https://frontlinedaily.org/?category=politics');
 await page.goto('/search?q=Jane');await expect(page.locator('.search-results-status')).toContainText('1 story found');
 await page.goto('/search?q=nonexistentword');await expect(page.locator('.search-results-status')).toContainText('No stories found');
 for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:844});await page.goto('/about');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Open menu',exact:true}).click();
 const close=page.getByRole('button',{name:'Close menu',exact:true});await expect(close).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(page.getByRole('dialog').getByRole('link').last()).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Open menu',exact:true})).toBeFocused();
 await page.screenshot({path:'tests/mobile-about.png',fullPage:true});
});

test('editor formats, saves, republishes and reopens stories without losing content',async({page})=>{
 await page.goto('/login');await page.getByLabel('Email', {exact:false}).fill('editor@example.test');await page.getByLabel('Password',{exact:false}).fill('local-test-password');
 await page.getByRole('button',{name:/sign in/i}).click();await page.waitForURL('**/dashboard');
 await page.goto('/dashboard/stories');
 const form=page.locator('form.story-editor-wrapper').first();
 await form.getByLabel('Headline').fill('Formatted integration story');
 await form.getByLabel('Main category').selectOption('Politics');
 await form.getByLabel('Author / byline').fill('Test Writer');await form.getByLabel('Tags',{exact:true}).fill('budget, accountability');
 const editor=form.getByRole('textbox',{name:'Story body'});await expect(editor).toBeVisible();
 await editor.fill('Important reporting');await editor.press('ControlOrMeta+A');
 await form.getByRole('button',{name:'Bold',exact:true}).click();
 await expect(editor.locator('strong')).toHaveText('Important reporting');
 await form.getByRole('button',{name:'Smaller text',exact:true}).click();
 await expect(editor.locator('small')).toHaveText('Important reporting');
 await form.getByRole('button',{name:'UPPERCASE',exact:true}).click();
 await expect(editor).toContainText('IMPORTANT REPORTING');
 await form.getByRole('button',{name:'Quotation',exact:true}).click();
 await expect(editor.locator('blockquote')).toContainText('IMPORTANT REPORTING');
 const editorAudit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 expect(editorAudit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
 await page.screenshot({path:'tests/story-editor.png',fullPage:true});
 await form.getByRole('button',{name:'Save as Draft',exact:true}).click();await page.waitForURL('**/dashboard/stories?notice=draft-saved');
 const draft=page.locator('details').filter({hasText:'Formatted integration story'});await draft.locator('summary').click();
 await expect(draft.getByRole('textbox',{name:'Story body'}).locator('strong')).toContainText('IMPORTANT REPORTING');
 await draft.getByRole('button',{name:'Publish to World'}).click();await page.waitForURL(/notice=story-published/);
 const response=await page.request.get('http://127.0.0.1:54329/__stories');const rows=await response.json();const story=rows.find((row:any)=>row.title==='Formatted integration story');
 expect(story.status).toBe('published');expect(story.content_format).toBe('html');expect(story.tags).toEqual(['budget','accountability']);
 await page.goto(`/story/${story.id}`);await expect(page.locator('article blockquote strong')).toHaveText('IMPORTANT REPORTING');
 await expect(page.locator('article small')).toHaveText('IMPORTANT REPORTING');await expect(page.getByText('Test Writer',{exact:true})).toBeVisible();
 await page.screenshot({path:'tests/formatted-story.png',fullPage:true});
});

test('newsletter and Google settings validate input, persist and render without claiming verification',async({page})=>{
 await page.goto('/newsletter');await expect(page.getByText('Subscriptions are opening soon.')).toBeVisible();
 await expect(page.locator('iframe')).toHaveCount(0);
 await page.goto('/dashboard/settings');await page.waitForURL('**/login?error=admin-required');
 await page.getByLabel('Email', {exact:false}).fill('editor@example.test');await page.getByLabel('Password',{exact:false}).fill('local-test-password');
 await page.getByRole('button',{name:/sign in/i}).click();await page.waitForURL('**/dashboard');
 await page.goto('/dashboard/settings');
 const originalBio=await page.getByLabel('Author bio',{exact:true}).inputValue();
 const editedBio="Ene Mc’Dickson reports on public affairs.\n\nIndependent reporting and accountability.";
 await page.getByLabel('Author bio',{exact:true}).fill(editedBio);
 await page.getByLabel('Substack publication address').fill('https://untrusted.example/embed');
 await page.getByRole('button',{name:'Save settings'}).click();await expect(page.locator('.settings-panel').getByRole('alert')).toContainText('substack.com');
 await page.getByLabel('Substack publication address').fill('https://frontline-fixture.substack.com');
 await page.getByLabel('Google verification value').fill('fixture_google_verification_123');
 await page.getByRole('button',{name:'Save settings'}).click();await expect(page.getByRole('status')).toContainText('Settings saved successfully');
 await page.goto('/about');
 await expect(page.getByRole('region',{name:'About the author'})).toContainText('Ene Mc’Dickson reports on public affairs.');
 await expect(page.getByRole('region',{name:'About the author'}).locator('div')).toHaveText(editedBio);
 await page.goto('/dashboard/settings');
 await expect(page.getByLabel('Author bio',{exact:true})).toHaveValue(editedBio);
 const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(audit.violations.map(v=>v.id)).toEqual([]);
 await page.route('https://frontline-fixture.substack.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><title>Local signup fixture</title><body>Local subscription fixture</body></html>'}));
 await page.goto('/newsletter');await expect(page.locator('iframe[title="Subscribe to The Curator’s Digest"]')).toHaveAttribute('src','https://frontline-fixture.substack.com/embed');
 await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute('content','fixture_google_verification_123');
 const html=await (await page.request.get('/')).text();
 expect(html.slice(0,html.indexOf('</head>'))).toContain('name="google-site-verification" content="fixture_google_verification_123"');
 await page.goto('/dashboard/settings');await page.getByLabel('Author bio',{exact:true}).fill(originalBio);await page.getByLabel('Substack publication address').fill('');await page.getByLabel('Google verification value').fill('');await page.getByRole('button',{name:'Save settings'}).click();await expect(page.getByRole('status')).toContainText('Settings saved successfully');
});

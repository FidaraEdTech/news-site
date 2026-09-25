import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('public metadata, server-rendered article, search and mobile keyboard navigation',async({page})=>{
 for(const route of ['/','/about','/contact','/search','/story/11111111-1111-4111-8111-111111111111']){
  await page.goto(route);
  await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute('content',/maximum-scale/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://frontlinedaily.org${route==='/'?'':route}`);
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
 }
 await page.goto('/?category=politics');
 await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://frontlinedaily.org/?category=politics');
 await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content','https://frontlinedaily.org/?category=politics');
 await page.goto('/search?q=Jane');await expect(page.getByRole('status')).toContainText('1 story found');
 await page.goto('/search?q=nonexistentword');await expect(page.getByRole('status')).toContainText('No stories found');
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

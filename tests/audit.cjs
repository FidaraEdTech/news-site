const { chromium } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext(); const page=await context.newPage();
 const report=[];
 for(const base of ['https://frontlinedaily.org','http://127.0.0.1:3000']){
  for(const route of ['/','/about','/contact','/search']){
   if(base.startsWith('https') && route==='/search')continue;
   await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('footer').first().waitFor({state:'visible',timeout:60000}).catch(()=>{});
   const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
   report.push({url:base+route,title:await page.title(),canonical:await page.locator('link[rel=canonical]').getAttribute('href').catch(()=>null),violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})).slice(0,12)}))});
  }
 }
 fs.writeFileSync('tests/browser-audit.json',JSON.stringify(report,null,2));
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:3000/about');
 await page.screenshot({path:'tests/mobile-about.png',fullPage:true});
 console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});


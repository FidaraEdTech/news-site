import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:'integration.spec.ts',timeout:300000,workers:1,
 expect:{timeout:20000},
 use:{baseURL:'http://127.0.0.1:3001',channel:'chrome',trace:'retain-on-failure'},
 webServer:[
  {command:'node tests/mock-supabase.cjs',port:54329,reuseExistingServer:!process.env.CI},
  {command:'npm run dev -- --hostname 127.0.0.1 --port 3001',url:'http://127.0.0.1:3001',timeout:180000,reuseExistingServer:!process.env.CI,env:{NEXT_DIST_DIR:'.next-test',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54329',NEXT_PUBLIC_SUPABASE_ANON_KEY:'local-test-anon',NEWSROOM_ADMIN_EMAIL:'editor@example.test',NEWSROOM_RATE_LIMIT_SALT:'local-test-only'}},
 ],
});

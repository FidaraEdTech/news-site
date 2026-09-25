// Local-only Supabase HTTP fixture. Never connect this server to production.
const http = require('http');
const { randomUUID } = require('crypto');
const user = { id:'00000000-0000-4000-8000-000000000001',email:'editor@example.test',aud:'authenticated',role:'authenticated',created_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{} };
const seedId='11111111-1111-4111-8111-111111111111';
const defaults={author_id:user.id,category:'Politics',location:null,excerpt:'Independent reporting on the public budget.',content:'Existing article text.\n\nSecond paragraph.',content_format:'plain',tags:[],byline:'Jane Reporter',status:'published',story_type:'article',featured_image_url:null,featured_image_path:null,video_url:null,video_path:null,video_caption:null,photo_desk_items:null,is_breaking:false,breaking_label:null,breaking_expires_at:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),published_at:new Date().toISOString(),views:0};
let stories=[{...defaults,id:seedId,title:'Budget accountability report'}];
const token = ()=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',role:'authenticated',email:user.email,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test-signature'].join('.');
http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','*');
 if(req.method==='OPTIONS'){res.end();return;}
 let raw='';for await(const part of req)raw+=part;let body={};try{body=JSON.parse(raw||'{}')}catch{}
 const url=new URL(req.url,'http://127.0.0.1:54329');
 const json=(data,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
 if(url.pathname==='/auth/v1/token')return json({access_token:token(),token_type:'bearer',refresh_token:'local-test-refresh',expires_in:3600,user});
 if(url.pathname==='/auth/v1/user')return json(user);
 if(url.pathname==='/auth/v1/logout')return json({});
 if(url.pathname==='/__stories')return json(stories);
 if(url.pathname.startsWith('/rest/v1/rpc/'))return json(true);
 const table=url.pathname.split('/').pop();
 if(table==='admin_users')return json({email:user.email});
 if(table==='site_settings')return json({author_bio:'Independent reporting from Nigeria and around the world.'});
 if(table!=='stories')return json([]);
 let matches=stories.filter(row=>[...url.searchParams].every(([key,value])=>{
  if(value.startsWith('eq.'))return String(row[key])===value.slice(3);
  if(value.startsWith('neq.'))return String(row[key])!==value.slice(4);
  if(value.startsWith('in.('))return value.slice(4,-1).split(',').includes(row[key]);
  if(key==='search_vector')return [row.title,row.content,row.excerpt,row.byline,row.category].join(' ').toLowerCase().includes(value.split('.').slice(1).join('.').toLowerCase());
  if(key==='tags')return row.tags?.includes(value.slice(4,-1));
  return true;
 }));
 if(req.method==='POST'){const row={...defaults,...body,id:randomUUID()};stories.push(row);return json(row,201);}
 if(req.method==='PATCH'){matches.forEach(row=>Object.assign(row,body,{updated_at:new Date().toISOString()}));return json(matches);}
 const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||1000);
 res.setHeader('Content-Range',`${offset}-${Math.max(offset,offset+matches.length-1)}/${matches.length}`);
 const results=matches.slice(offset,offset+limit);
 if(req.headers.accept?.includes('vnd.pgrst.object+json'))return results[0]?json(results[0]):json({code:'PGRST116'},406);
 return json(results);
}).listen(54329,'127.0.0.1',()=>console.log('Local fixture listening on 54329'));

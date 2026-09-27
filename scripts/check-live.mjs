const input=process.argv[2];
if(!input){console.error('Usage: npm run check:live -- https://YOUR-SITE.vercel.app');process.exit(1);}
const url=new URL(input);
if(url.protocol!=='https:'){console.error('Use the HTTPS production URL.');process.exit(1);}
const base=url.origin;
async function request(path,options={}){return fetch(base+path,{...options,signal:AbortSignal.timeout(30000),redirect:'manual'});}
try {
 const home=await request('/');if(home.status!==200)throw new Error('Home HTTP '+home.status+'; check deployment protection and build logs.');
 console.log('PASS home');
 const session=await request('/api/session',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
 if(!session.ok)throw new Error('Guest session HTTP '+session.status+'; check DATABASE_URL and deployment logs.');
 const cookies=session.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 if(!cookies)throw new Error('Guest cookie missing');
 const boot=await request('/api/bootstrap',{headers:{Cookie:cookies}});
 if(!boot.ok)throw new Error('Bootstrap HTTP '+boot.status);
 const data=await boot.json();
 if(data.weeks?.length!==52)throw new Error('Expected 52 curriculum weeks');
 console.log('PASS guest session and 52 weeks');
 for(const name of ['teacher','admin']) {const response=await request('/api/'+name,{headers:{Cookie:cookies}});if(response.status!==403)throw new Error(name+' access returned '+response.status);console.log('PASS guest blocked from '+name);}
 console.log('Checks passed. Next: test real teacher login, worksheet PDF, saving, and one AI request in your browser.');
 console.log('This check created one empty guest session. It made no AI calls.');
} catch(e){console.error(e.message);process.exit(1);}

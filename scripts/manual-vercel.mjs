import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, copyFileSync, unlinkSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
const cli = 'vercel@59.16.0';
const projectName = 'gokbanjeong-gospel-class';
// These interactive scripts use the browser login and this folder's project link.
// Ignore stale CI overrides only in child processes; never print their values.
const cliEnv = { ...process.env };
for (const key of ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID']) delete cliEnv[key];
const major = Number(process.versions.node.split('.')[0]);
if (major < 22) { console.error('Install Node.js 22 or newer LTS from https://nodejs.org/'); process.exit(1); }
function run(command,args,optional=false) {
 const r=spawnSync(command,args,{stdio:'inherit',shell:process.platform==='win32',env:cliEnv});
 if (r.error || r.status!==0) {
  if(optional) return false;
  throw new Error('Step failed. For login or access errors, run 07_REPAIR_VERCEL_LOGIN.cmd.');
 }
 return true;
}
function vercel(args,optional=false) {return run('npx',['--yes',cli,...args],optional);}
async function repairLink() {
 console.log('Sign in with the Vercel account that owns the existing gospel-class site.');
 vercel(['logout'],true);
 vercel(['login']);
 vercel(['whoami']);
 console.log('Open https://vercel.com/dashboard and open gokbanjeong-gospel-class.');
 console.log('Copy TEAM from the address: https://vercel.com/TEAM/gokbanjeong-gospel-class');
 const rl=createInterface({input:process.stdin,output:process.stdout});
 let scope;
 try {scope=(await rl.question('TEAM: ')).trim();} finally {rl.close();}
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(scope)) throw new Error('Enter only the TEAM part of the dashboard URL, then run this file again.');
 // Verify access to the existing project before replacing any local connection.
 if(!vercel(['project','inspect',projectName,'--scope',scope],true)) {
  throw new Error('Cannot access the existing project. Check the TEAM and sign in with its owner account. Ask the owner for deployment access if needed. The existing local link was preserved.');
 }
 const path='.vercel/project.json';
 const backup=existsSync(path) ? `${path}.backup-${Date.now()}` : null;
 if(backup) {copyFileSync(path,backup);unlinkSync(path);}
 try {
  vercel(['link','--yes','--project',projectName,'--scope',scope]);
  const linked=readLink();
  vercel(['project','inspect',linked.projectId,'--scope',linked.orgId]);
 } catch(error) {
  if(backup) copyFileSync(backup,path);
  else if(existsSync(path)) unlinkSync(path);
  throw error;
 }
 console.log('Connection verified. Now run 04_DEPLOY_PRODUCTION.cmd.');
}
function readLink() {
 if(!existsSync('.vercel/project.json')) throw new Error('Run 07_REPAIR_VERCEL_LOGIN.cmd first.');
 const linked=JSON.parse(readFileSync('.vercel/project.json','utf8'));
 if(!/^prj_[a-zA-Z0-9]+$/.test(linked.projectId||'') || !/^[a-zA-Z0-9_-]+$/.test(linked.orgId||'')) throw new Error('Invalid project link. Run 07_REPAIR_VERCEL_LOGIN.cmd.');
 if(linked.projectName && linked.projectName!==projectName) throw new Error('This folder is linked to another project. Run 07_REPAIR_VERCEL_LOGIN.cmd.');
 return linked;
}
const action=process.argv[2];
try {
if(action==='setup'){run('npm',['ci']);run('npm',['run','build']);}
else if(action==='link' || action==='repair'){await repairLink();}
else if(action==='env'){vercel(['env','ls','production']);}
else if(action==='deploy'){
 const linked=readLink();
 vercel(['whoami']);
 vercel(['project','inspect',linked.projectId,'--scope',linked.orgId]);
 console.log('Target project:',linked.projectName||linked.projectId);
 console.log('This uploads the project and deploys to production. No plan upgrade is requested.');
 vercel(['deploy','--prod','--scope',linked.orgId]);
} else {throw new Error('Use setup | link | repair | env | deploy');}
} catch(error) {console.error(error.message);process.exitCode=1;}

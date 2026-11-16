// Search-only read test. Never creates credentials, changes access or calls publishing APIs.
import fs from 'node:fs';
import path from 'node:path';
import {registerHooks} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import nextEnv from '@next/env';
const root=fileURLToPath(new URL('../../',import.meta.url));
registerHooks({resolve(specifier,context,nextResolve){
 if(specifier.startsWith('@/'))return nextResolve(pathToFileURL(path.join(root,specifier.slice(2)+'.ts')).href,context);
 return nextResolve(specifier,context);
}});
nextEnv.loadEnvConfig(root,false,{info(){},error(){}});
const {ANYHVAC_DOMAIN_PROPERTY,loadGoogleSearchReport}=await import('../../lib/admin/integrations/google-search-console/report.ts');
async function main(){
 if(process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY!==ANYHVAC_DOMAIN_PROPERTY){
  console.log(JSON.stringify({state:'not-connected',reason:'confirmed-domain-property-not-configured',requiredProperty:ANYHVAC_DOMAIN_PROPERTY}));process.exitCode=2;return;
 }
 const snapshot=await loadGoogleSearchReport();
 if(snapshot.state!=='connected'){
  console.log(JSON.stringify({property:ANYHVAC_DOMAIN_PROPERTY,...snapshot}));process.exitCode=2;return;
 }
 const output=path.join(root,'.local','analytics');fs.mkdirSync(output,{recursive:true});
 const ignore=path.join(output,'.gitignore');if(!fs.existsSync(ignore))fs.writeFileSync(ignore,'*\n!.gitignore\n',{flag:'wx'});
 const file=path.join(output,'search-console-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
 fs.writeFileSync(file,JSON.stringify(snapshot,null,2),{flag:'wx'});
 console.log(JSON.stringify({state:snapshot.state,property:ANYHVAC_DOMAIN_PROPERTY,source:snapshot.data.source,retrievedAt:snapshot.data.retrievedAt,current:snapshot.data.current,previous:snapshot.data.previous,context:snapshot.data.context,returnedDailyRows:snapshot.data.daily.length,returnedQueries:snapshot.data.topQueries.length,returnedPages:snapshot.data.topPages.length,privateReport:path.relative(root,file)}));
}
await main().catch(()=>{console.error('Search Console test could not complete; details suppressed to protect credentials.');process.exitCode=1;});

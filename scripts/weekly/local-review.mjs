// Reuse isolated test authentication/environment; no production provider configuration.
import {spawn} from 'node:child_process';
const child=spawn(process.execPath,['scripts/agents/local-review.mjs'],{env:{...process.env,WEEKLY_CONTENT_ENABLED:'true',WEEKLY_CONTENT_STORAGE:'local'},stdio:'inherit',windowsHide:true});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill());
child.on('exit',code=>process.exit(code??1));

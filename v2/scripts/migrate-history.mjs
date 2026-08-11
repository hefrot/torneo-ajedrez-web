import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {openDatabase,importStatus} from '../src/db.js';
import {migrateHistory} from '../src/history-import.js';
import {communityMetrics} from '../src/community-metrics.js';

const args=Object.fromEntries(process.argv.slice(2).map((value,index,list)=>value.startsWith('--')?[value.slice(2),list[index+1]]:null).filter(Boolean));
for(const key of ['audit-dir','exports-dir','out-dir','db'])if(!args[key])throw new Error(`--${key} is required`);
const outputDir=resolve(args['out-dir']);mkdirSync(outputDir,{recursive:true});const db=openDatabase(resolve(args.db));const counts=migrateHistory(db,{auditDir:resolve(args['audit-dir']),exportsDir:resolve(args['exports-dir']),outputDir});const result={counts,database:importStatus(db),generatedAt:new Date().toISOString()};writeFileSync(`${outputDir}/migration_result.json`,JSON.stringify(result,null,2)+'\n',{mode:0o600});const metrics=communityMetrics(db);writeFileSync(`${outputDir}/community_metrics.json`,JSON.stringify(metrics,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result));db.close();

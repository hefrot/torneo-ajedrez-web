import Database from 'better-sqlite3';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {parseCsv} from '../src/history-import.js';

const args={};
for(let i=2;i<process.argv.length;i+=2)args[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
for(const key of ['db','conflicts','csv','html'])if(!args[key])throw new Error('--'+key+' is required');

const db=new Database(args.db,{readonly:true,fileMustExist:true});
const accounts=new Map();
for(const row of db.prepare('SELECT player_id,platform,username FROM player_accounts ORDER BY player_id,platform').all()){
  const current=accounts.get(row.player_id)||{lichess:'',chesscom:''};
  current[row.platform]=row.username;
  accounts.set(row.player_id,current);
}
const playerNames=new Map(db.prepare('SELECT id,name FROM players').all().map(row=>[row.id,row.name]));
const rows=[];
const canonicalFrom=value=>{
  const match=String(value||'').match(/(?:LEGACY|MK|CP)-[A-Za-z0-9-]+/);
  return match?match[0]:'';
};
const add=(category,name,canonical,source,reason,action)=>{
  const account=accounts.get(canonical)||{lichess:'',chesscom:''};
  rows.push({category,name:name||playerNames.get(canonical)||'',lichess:account.lichess,chesscom:account.chesscom,source,match_reason:reason,canonical_candidate_id:canonical,recommended_action:action});
};

const conflicts=parseCsv(readFileSync(args.conflicts,'utf8'));
for(const item of conflicts){
  const canonical=canonicalFrom(item.candidate_b)||canonicalFrom(item.candidate_a);
  add('REVIEW',item.display_name,canonical,item.review_type,item.stable_evidence,item.recommended_action);
}

const unmatched=db.prepare(
  "SELECT p.id,p.name FROM players p JOIN identity_sources s ON s.player_id=p.id WHERE s.source_system='legacy_tms' AND s.match_status='SOURCE_STABLE' GROUP BY p.id,p.name ORDER BY p.name"
).all();
for(const item of unmatched)add('UNMATCHED_LEGACY',item.name,item.id,'legacy_tms','NO_EXACT_CROSS_SOURCE_IDENTIFIER','Request re-registration; link only on exact platform username');

const ambiguous=db.prepare(
  "SELECT source_game_id,platform,white_external_name,black_external_name,white_player_id,black_player_id FROM historical_games WHERE identity_status='AMBIGUOUS' ORDER BY CAST(source_game_id AS INTEGER)"
).all();
for(const item of ambiguous){
  const name=[item.white_external_name,item.black_external_name].filter(Boolean).join(' vs ');
  add('AMBIGUOUS_GAME',name,item.white_player_id||item.black_player_id||'','legacy_tms.games:'+item.source_game_id,'One or both source player IDs are missing','Review exact external handle or source record; do not infer by name');
}

const headers=['category','name','lichess','chesscom','source','match_reason','canonical_candidate_id','recommended_action'];
const csvCell=value=>{
  const text=String(value??'');
  return /[",\n]/.test(text)?'"'+text.replaceAll('"','""')+'"':text;
};
mkdirSync(dirname(args.csv),{recursive:true});
writeFileSync(args.csv,[headers.join(','),...rows.map(row=>headers.map(key=>csvCell(row[key])).join(','))].join('\n')+'\n',{mode:0o600});
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const body=rows.map(row=>'<tr>'+headers.map(key=>'<td>'+esc(row[key])+'</td>').join('')+'</tr>').join('');
const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Identity Review - Private</title><style>body{font:14px sans-serif;margin:24px;color:#18202a}h1{margin-bottom:4px}.note{color:#596575;margin-bottom:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #d9dee5;padding:8px;text-align:left;vertical-align:top}th{background:#f2f5f8;position:sticky;top:0}tr:nth-child(even){background:#fafbfc}</style></head><body><h1>HMENA Chess V2 - Revision privada</h1><p class="note">No contiene telefonos ni JIDs. REVIEW='+conflicts.length+'; unmatched legacy='+unmatched.length+'; ambiguous games='+ambiguous.length+'.</p><table><thead><tr>'+headers.map(key=>'<th>'+esc(key)+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table></body></html>';
writeFileSync(args.html,html,{mode:0o600});
console.log(JSON.stringify({review:conflicts.length,unmatchedLegacy:unmatched.length,ambiguousGames:ambiguous.length,totalRows:rows.length}));
db.close();

const parse=row=>({...row,value:JSON.parse(row.value_json)});
export function listLeagueRules(db){return db.prepare('SELECT rule_key,value_json,approval_state,description,updated_at FROM league_rule_config ORDER BY rule_key').all().map(parse);}
export function leagueRuleMap(db){return Object.fromEntries(listLeagueRules(db).map(row=>[row.rule_key,row.value]));}
export function missingRuleDecisions(db){return listLeagueRules(db).filter(row=>row.approval_state!=='APPROVED').map(({rule_key,description})=>({ruleKey:rule_key,description}));}
export function updateLeagueRule(db,key,value,{approved=false,updatedBy='admin',now=new Date()}={}){
  const result=db.prepare('UPDATE league_rule_config SET value_json=?,approval_state=?,updated_at=?,updated_by=? WHERE rule_key=?').run(JSON.stringify(value),approved?'APPROVED':'PENDING',now.toISOString(),updatedBy,key);
  if(!result.changes)throw new TypeError('unknown league rule');
  return parse(db.prepare('SELECT rule_key,value_json,approval_state,description,updated_at FROM league_rule_config WHERE rule_key=?').get(key));
}
export function officialScoringRules(db){const rules=leagueRuleMap(db),score=rules.scoring||{win:3,draw:1,loss:0};return{gamesPerOpponent:Number(rules.games_per_opponent||3),winPoints:Number(score.win),drawPoints:Number(score.draw),lossPoints:Number(score.loss),allowedPlatforms:rules.allowed_platforms||['lichess','chesscom'],standardVariantRequired:rules.standard_variant_required!==false,ratedRequirement:rules.rated_requirement||'organizer_decision',timeControl:rules.time_control||{mode:'organizer_decision',allowed:[]}};}

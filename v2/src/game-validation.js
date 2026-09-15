const lower=value=>String(value||'').trim().toLowerCase();
const iso=value=>value==null?null:new Date(typeof value==='number'&&value<1e12?value*1000:value).toISOString();
export class GameValidationError extends Error{constructor(code,message){super(message);this.code=code;}}
export class ProviderPendingError extends Error{constructor(message='El proveedor todavía no publicó la partida'){super(message);this.code='PENDING_PROVIDER';}}
export function parseLichessGameRef(value){const text=String(value||'').trim();const match=text.match(/(?:lichess\.org\/(?:game\/export\/)?|^)([A-Za-z0-9]{8,12})(?:\/|$|\?)/);return match?match[1].slice(0,8):null;}
export function parseLichessChallengeRef(value){return String(value||'').match(/lichess\.org\/challenge\/([A-Za-z0-9]+)/)?.[1]||null;}
export function parseChessComGameRef(value){return String(value||'').match(/chess\.com\/game\/(?:live|daily)\/(\d+)/i)?.[1]||(/^\d+$/.test(String(value||''))?String(value):null);}
const drawResults=new Set(['agreed','repetition','stalemate','insufficient','50move','timevsinsufficient','draw']);
export function normalizeLichessGame(payload){
  const white=payload?.players?.white?.user?.name||payload?.players?.white?.user?.id||payload?.white?.username;
  const black=payload?.players?.black?.user?.name||payload?.players?.black?.user?.id||payload?.black?.username;
  let result=payload?.result||null;if(!result&&payload?.winner==='white')result='1-0';if(!result&&payload?.winner==='black')result='0-1';if(!result&&drawResults.has(lower(payload?.status)))result='1/2-1/2';
  return{platform:'lichess',externalGameId:String(payload?.id||'').slice(0,8),url:payload?.url||(`https://lichess.org/${String(payload?.id||'').slice(0,8)}`),whiteUsername:white,blackUsername:black,result,completed:Boolean(result),variant:lower(payload?.variant||payload?.variant?.key||'standard'),rated:Boolean(payload?.rated),timeControl:payload?.clock?`${payload.clock.initial}+${payload.clock.increment}`:String(payload?.speed||''),startedAt:iso(payload?.createdAt),endedAt:iso(payload?.lastMoveAt||payload?.createdAt),challengeId:payload?.challengeId||null};
}
const chessDraw=new Set(['agreed','repetition','stalemate','insufficient','50move','timevsinsufficient']);
export function normalizeChessComGame(payload){
  const whiteResult=lower(payload?.white?.result),blackResult=lower(payload?.black?.result);let result=null;if(whiteResult==='win')result='1-0';else if(blackResult==='win')result='0-1';else if(chessDraw.has(whiteResult)||chessDraw.has(blackResult))result='1/2-1/2';
  return{platform:'chesscom',externalGameId:parseChessComGameRef(payload?.url)||String(payload?.uuid||''),url:payload?.url||null,whiteUsername:payload?.white?.username,blackUsername:payload?.black?.username,result,completed:Boolean(payload?.end_time&&result),variant:lower(payload?.rules||'chess')==='chess'?'standard':lower(payload?.rules),rated:payload?.rated!==false,timeControl:String(payload?.time_control||payload?.time_class||''),startedAt:iso(payload?.start_time),endedAt:iso(payload?.end_time)};
}
const invert=result=>result==='1-0'?'0-1':result==='0-1'?'1-0':result;
export function validateNormalizedGame(game,expected,rules){
  if(!game)throw new ProviderPendingError();
  const expectedNames=new Set([lower(expected.player1Username),lower(expected.player2Username)]),actualNames=new Set([lower(game.whiteUsername),lower(game.blackUsername)]);
  if(expectedNames.size!==2||actualNames.size!==2||[...expectedNames].some(name=>!actualNames.has(name)))throw new GameValidationError('WRONG_PLAYERS','La partida no corresponde exactamente a los dos jugadores esperados');
  if(!expected.allowedPlatforms?.includes(game.platform))throw new GameValidationError('PLATFORM_NOT_SHARED','La plataforma no está habilitada para esta serie');
  if(!game.completed||!['1-0','0-1','1/2-1/2','0.5-0.5'].includes(game.result))throw new GameValidationError('GAME_NOT_COMPLETE','La partida todavía no tiene un resultado final compatible');
  if(expected.eligibleAt&&(!game.startedAt||new Date(game.startedAt)<new Date(expected.eligibleAt)))throw new GameValidationError('GAME_BEFORE_ELIGIBILITY','La partida comenzó antes de que el slot fuera elegible');
  if(rules.standardVariantRequired&&game.variant!=='standard')throw new GameValidationError('WRONG_VARIANT','La partida debe usar la variante estándar');
  if(rules.ratedRequirement==='rated'&&!game.rated)throw new GameValidationError('RATED_REQUIRED','La partida debe ser rated');
  if(rules.ratedRequirement==='unrated'&&game.rated)throw new GameValidationError('UNRATED_REQUIRED','La partida debe ser unrated');
  const allowedTime=rules.timeControl?.allowed||[];if(allowedTime.length&&!allowedTime.includes(game.timeControl))throw new GameValidationError('WRONG_TIME_CONTROL','El control de tiempo no está permitido');
  const player1IsWhite=lower(game.whiteUsername)===lower(expected.player1Username);
  return{status:'VALIDATED',player1Result:player1IsWhite?game.result:invert(game.result),normalized:game};
}
export function providerFailureIsPending(error){return error instanceof ProviderPendingError||error?.status===429||Number(error?.status)>=500||error?.code==='ETIMEDOUT'||error?.name==='AbortError';}

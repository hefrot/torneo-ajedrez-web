const PLATFORM_ORDER = ['lichess','chesscom'];

const uniquePlatforms = player => [...new Set((player?.accounts || []).map(account => account.platform).filter(platform => PLATFORM_ORDER.includes(platform)))];
const pairKey = (a,b) => [String(a),String(b)].sort().join('::');

export function sharedPlatforms(playerA, playerB) {
  const right = new Set(uniquePlatforms(playerB));
  return uniquePlatforms(playerA).filter(platform => right.has(platform)).sort((a,b) => PLATFORM_ORDER.indexOf(a)-PLATFORM_ORDER.indexOf(b));
}

export function buildSeasonReadiness(players) {
  const pairs=[];
  const blockedPairs=[];
  const platformCoverage={lichess:0,chesscom:0,both:0};
  for(const player of players){
    const platforms=uniquePlatforms(player);
    if(platforms.includes('lichess'))platformCoverage.lichess+=1;
    if(platforms.includes('chesscom'))platformCoverage.chesscom+=1;
    if(platforms.length===2)platformCoverage.both+=1;
  }
  for(let i=0;i<players.length;i+=1){
    for(let j=i+1;j<players.length;j+=1){
      const a=players[i],b=players[j];
      const allowedPlatforms=sharedPlatforms(a,b);
      const row={
        key:pairKey(a.id,b.id),
        playerAId:a.id,
        playerAName:a.name,
        playerBId:b.id,
        playerBName:b.name,
        playerAPlatforms:uniquePlatforms(a),
        playerBPlatforms:uniquePlatforms(b),
        allowedPlatforms,
        compatible:allowedPlatforms.length>0,
      };
      pairs.push(row);
      if(!row.compatible)blockedPairs.push(row);
    }
  }
  return {
    ready:players.length>=2&&blockedPairs.length===0,
    playerCount:players.length,
    pairCount:pairs.length,
    blockedPairCount:blockedPairs.length,
    platformCoverage,
    blockedPairs,
    pairs,
  };
}

export function seasonPairKey(a,b){return pairKey(a,b);}

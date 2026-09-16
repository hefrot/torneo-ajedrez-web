import csv, json, sys
import chess

BANDS={
  '1200-1600':(1450,1700,36),
  '1600-2000':(1700,2000,36),
  '2000-2300':(2000,2250,36),
  '2300-2500':(2250,2600,36),
}
ALLOWED={
  'fork','pin','skewer','discoveredAttack','deflection','attraction','interference',
  'clearance','sacrifice','quietMove','defensiveMove','advancedPawn','promotion',
  'rookEndgame','queenEndgame','pawnEndgame','zugzwang','trappedPiece',
  'exposedKing','kingsideAttack','backRankMate','mateIn2','mateIn3','mateIn4',
}
counts={k:0 for k in BANDS}; theme_counts={k:{} for k in BANDS}; rows=[]; seen=set()

def safe_int(v,d=0):
    try:return int(v)
    except:return d

def band_for(rating):
    for name,(lo,hi,target) in BANDS.items():
        if lo<=rating<hi and counts[name]<target:return name
    return None

reader=csv.DictReader(sys.stdin)
for row in reader:
    rating=safe_int(row.get('Rating')); band=band_for(rating)
    if not band:continue
    popularity=safe_int(row.get('Popularity')); plays=safe_int(row.get('NbPlays'))
    if popularity<60 or plays<100:continue
    themes=str(row.get('Themes') or '').split(); relevant=[t for t in themes if t in ALLOWED]
    if not relevant:continue
    primary=relevant[0]
    if theme_counts[band].get(primary,0)>=8:continue
    moves=str(row.get('Moves') or '').split()
    if len(moves)<3:continue
    try:
        board=chess.Board(row['FEN']);setup=chess.Move.from_uci(moves[0])
        if setup not in board.legal_moves:continue
        board.push(setup);best=chess.Move.from_uci(moves[1])
        if best not in board.legal_moves:continue
    except Exception:continue
    pid=row.get('PuzzleId')
    if not pid or pid in seen:continue
    seen.add(pid);counts[band]+=1;theme_counts[band][primary]=theme_counts[band].get(primary,0)+1
    rows.append({'id':pid,'band':band,'fen':board.fen(),'bestMove':best.uci(),'solutionMoves':moves[1:],
      'rating':rating,'popularity':popularity,'plays':plays,'themes':themes,'primaryTheme':primary,
      'gameUrl':row.get('GameUrl') or None,'sideToMove':'white' if board.turn else 'black'})
    if all(counts[k]>=BANDS[k][2] for k in BANDS):break

payload={'version':'lichess-cc0-advanced-screen-v1','source':'https://database.lichess.org/#puzzles',
 'purpose':'difficulty-ordered diagnostic position bank; puzzle rating is not player Elo',
 'bands':{k:{'ratingWindow':[v[0],v[1]],'target':v[2],'count':counts[k],'themes':theme_counts[k]} for k,v in BANDS.items()},'puzzles':rows}
json.dump(payload,sys.stdout,separators=(',',':'))

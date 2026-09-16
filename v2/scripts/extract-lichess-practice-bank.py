#!/opt/stockfish-bot/.venv/bin/python
import csv, json, sys
import chess

TARGETS={
  'fork':45,'hangingPiece':45,'pin':35,'skewer':30,
  'discoveredAttack':30,'backRankMate':25,'mateIn1':25,'mateIn2':35,
  'deflection':30,'overloadedPiece':25,'endgame':35,
}
counts={k:0 for k in TARGETS}
rows=[];seen=set()

def useful(themes):
    return [t for t in TARGETS if t in themes and counts[t] < TARGETS[t]]

def safe_int(value,default=0):
    try:return int(value)
    except:return default

reader=csv.DictReader(sys.stdin)
for row in reader:
    rating=safe_int(row.get('Rating'))
    popularity=safe_int(row.get('Popularity'))
    plays=safe_int(row.get('NbPlays'))
    themes=str(row.get('Themes') or '').split()
    matched=useful(themes)
    if not matched or rating<600 or rating>1500 or popularity<55 or plays<50:continue
    moves=str(row.get('Moves') or '').split()
    if len(moves)<2:continue
    try:
        board=chess.Board(row['FEN']);opponent=chess.Move.from_uci(moves[0])
        if opponent not in board.legal_moves:continue
        board.push(opponent);best=chess.Move.from_uci(moves[1])
        if best not in board.legal_moves:continue
    except Exception:continue
    pid=row.get('PuzzleId')
    if not pid or pid in seen:continue
    seen.add(pid)
    item={
      'id':pid,'fen':board.fen(),'bestMove':best.uci(),'solutionMoves':moves[1:],
      'rating':rating,'popularity':popularity,'plays':plays,'themes':themes,
      'gameUrl':row.get('GameUrl') or None,
      'openingTags':str(row.get('OpeningTags') or '').split(),
      'sideToMove':'white' if board.turn else 'black',
    }
    rows.append(item)
    for theme in matched:counts[theme]+=1
    if all(counts[k]>=TARGETS[k] for k in TARGETS):break

payload={'version':'lichess-cc0-practice-v1','source':'https://database.lichess.org/#puzzles','filters':{'rating':[600,1500],'popularityMin':55,'playsMin':50},'themeCounts':counts,'puzzles':rows}
json.dump(payload,sys.stdout,separators=(',',':'))

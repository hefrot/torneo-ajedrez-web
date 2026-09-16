import json, hashlib
import chess, chess.engine

SRC='data/lichess-advanced-diagnostic-v1.json'
OUT='data/advanced-diagnostic-items-v1.json'
STOCKFISH='/usr/games/stockfish'
WANTED={
 '1200-1600':['defensiveMove','quietMove','rookEndgame','pawnEndgame','fork','deflection','discoveredAttack'],
 '1600-2000':['defensiveMove','quietMove','sacrifice','clearance','pawnEndgame','attraction','discoveredAttack'],
 '2000-2300':['defensiveMove','quietMove','advancedPawn','rookEndgame','deflection','interference','zugzwang'],
 '2300-2500':['defensiveMove','quietMove','pawnEndgame','advancedPawn','clearance','pin','deflection'],
}
SKILLS={
 '1200-1600':{'defensiveMove':'INT-PROPHYLAXIS','quietMove':'INT-WORSTPIECE','rookEndgame':'INT-ROOKEND','pawnEndgame':'INT-CONVERT','fork':'INT-CALC4','deflection':'INT-CALC4','discoveredAttack':'INT-CALC4'},
 '1600-2000':{'defensiveMove':'ADV-DEFENSE','quietMove':'ADV-QUIET','sacrifice':'ADV-SACRIFICE','clearance':'ADV-CALCTREE','pawnEndgame':'ADV-PAWNEND','attraction':'ADV-CALCTREE','discoveredAttack':'ADV-CALCTREE'},
 '2000-2300':{'defensiveMove':'EXP-TECHDEF','quietMove':'EXP-PROPHY','advancedPawn':'EXP-TRANSFORM','rookEndgame':'EXP-COMPLEXEND','deflection':'EXP-DEEPCALC','interference':'EXP-DEEPCALC','zugzwang':'EXP-COMPLEXEND'},
 '2300-2500':{'defensiveMove':'HP-DEFENSE','quietMove':'HP-PRACTICAL','pawnEndgame':'HP-ENDSTUDY','advancedPawn':'HP-PRACTICAL','clearance':'HP-CALCROUTINE','pin':'HP-CALCROUTINE','deflection':'HP-CALCROUTINE'},
}

data=json.load(open(SRC)); puzzles=data['puzzles']; selected=[]
for band,themes in WANTED.items():
    pool=[p for p in puzzles if p['band']==band]
    used=set()
    for theme in themes:
        candidates=[p for p in pool if theme in p['themes'] and p['id'] not in used]
        candidates.sort(key=lambda p:(p['popularity'],p['plays'],p['rating']),reverse=True)
        if not candidates: raise SystemExit(f'missing {band} {theme}')
        pick=candidates[0];used.add(pick['id']);selected.append((band,theme,pick))

engine=chess.engine.SimpleEngine.popen_uci(STOCKFISH); items=[]
try:
    for band,theme,p in selected:
        board=chess.Board(p['fen']); correct=chess.Move.from_uci(p['bestMove'])
        infos=engine.analyse(board,chess.engine.Limit(depth=14),multipv=6)
        alternatives=[]
        for info in infos:
            move=info['pv'][0]
            if move!=correct and move not in alternatives: alternatives.append(move)
        for move in board.legal_moves:
            if move!=correct and move not in alternatives: alternatives.append(move)
            if len(alternatives)>=3: break
        choices=[correct]+alternatives[:3]
        iid=f"ADV-{band}-{theme}-{p['id']}"
        pos=int(hashlib.sha256(iid.encode()).hexdigest()[:4],16)%4
        choices.remove(correct);choices.insert(pos,correct)
        options=[{'uci':m.uci(),'san':board.san(m)} for m in choices]
        items.append({'id':iid,'band':band,'theme':theme,'skillCode':SKILLS[band][theme],
          'fen':p['fen'],'options':options,'correctAnswer':'ABCD'[pos],'bestMove':correct.uci(),
          'sourcePuzzleId':p['id'],'sourceRating':p['rating'],'sourceThemes':p['themes']})
finally: engine.quit()
json.dump({'version':'advanced-diagnostic-v1','items':items},open(OUT,'w'),separators=(',',':'))
print('wrote',len(items),OUT)
for band in WANTED: print(band,[x['theme'] for x in items if x['band']==band])

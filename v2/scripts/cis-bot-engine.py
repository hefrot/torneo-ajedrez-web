#!/opt/stockfish-bot/.venv/bin/python
import hashlib, json, os, random, sys
import chess
import chess.engine

ENGINE_PATH=os.getenv('STOCKFISH_PATH','/usr/games/stockfish')

def cp(score,color):
    value=score.pov(color).score(mate_score=100000)
    return int(value if value is not None else 0)

def result_payload(board):
    outcome=board.outcome(claim_draw=True)
    if not outcome:return {'gameOver':False,'result':None,'termination':None}
    result='1/2-1/2' if outcome.winner is None else ('1-0' if outcome.winner==chess.WHITE else '0-1')
    return {'gameOver':True,'result':result,'termination':outcome.termination.name.lower()}

def choose_bot_move(board,config):
    legal=list(board.legal_moves)
    if not legal:return None
    code=str(config.get('code') or 'cis-bot')
    seed=int(hashlib.sha256((board.fen()+code).encode()).hexdigest()[:16],16)
    rng=random.Random(seed)
    count=max(2,min(len(legal),int(config.get('candidates') or 4)))
    think=max(.01,min(.20,float(config.get('thinkSeconds') or .04)))
    random_rate=max(0,min(.75,float(config.get('randomRate') or 0)))
    error_rate=max(0,min(.85,float(config.get('errorRate') or .15)))
    engine=chess.engine.SimpleEngine.popen_uci(ENGINE_PATH)
    try:
        infos=engine.analyse(board,chess.engine.Limit(time=think),multipv=count)
        if not isinstance(infos,list):infos=[infos]
        ranked=[((info.get('pv') or [None])[0],cp(info['score'],board.turn)) for info in infos]
        ranked=[x for x in ranked if x[0] is not None]
        roll=rng.random()
        if roll<random_rate:
            return rng.choice(legal)
        if roll<random_rate+error_rate and len(ranked)>1:
            pool=ranked[max(1,len(ranked)//2):] or ranked[1:]
            return rng.choice(pool)[0]
        if len(ranked)>1 and rng.random()<float(config.get('secondBestRate') or 0):
            return ranked[1][0]
        return ranked[0][0] if ranked else rng.choice(legal)
    finally:
        engine.quit()

def main():
    try:
        payload=json.load(sys.stdin)
        board=chess.Board(payload.get('fen') or chess.STARTING_FEN)
        student_move=payload.get('studentMove')
        if student_move:
            move=chess.Move.from_uci(student_move)
            if move not in board.legal_moves:raise ValueError('illegal move')
            board.push(move)
        state=result_payload(board)
        if state['gameOver']:
            print(json.dumps({'ok':True,'fen':board.fen(),'botMove':None,**state}));return 0
        bot_move=choose_bot_move(board,payload.get('bot') or {})
        if bot_move is None:raise ValueError('bot has no legal move')
        san=board.san(bot_move);board.push(bot_move);state=result_payload(board)
        print(json.dumps({'ok':True,'fen':board.fen(),'botMove':bot_move.uci(),'botMoveSan':san,**state}))
        return 0
    except Exception as exc:
        print(json.dumps({'ok':False,'error':str(exc)}));return 1

if __name__=='__main__':
    raise SystemExit(main())

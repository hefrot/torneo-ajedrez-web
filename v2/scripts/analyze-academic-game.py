#!/opt/stockfish-bot/.venv/bin/python
import io
import json
import os
import sys

import chess
import chess.engine
import chess.pgn

ENGINE_PATH = os.getenv("STOCKFISH_PATH", "/usr/games/stockfish")
ANALYSIS_VERSION = "academic-stockfish-v3"
PEDAGOGICAL_CP_CAP = 1500
PIECE_VALUE = {chess.PAWN:1, chess.KNIGHT:3, chess.BISHOP:3, chess.ROOK:5, chess.QUEEN:9, chess.KING:100}

def cp(score, color):
    value = score.pov(color).score(mate_score=100000)
    return int(value if value is not None else 0)

def severity(loss):
    if loss >= 700: return 5
    if loss >= 400: return 4
    if loss >= 250: return 3
    if loss >= 150: return 2
    return 1

def classify(board, best_move, played_move, cp_loss, ply):
    enemy = not board.turn
    before_pins = {sq for sq in chess.SQUARES if board.piece_at(sq) and board.piece_at(sq).color == enemy and board.is_pinned(enemy, sq)}
    after = board.copy(stack=False)
    gives_check = board.gives_check(best_move)
    is_capture = board.is_capture(best_move)
    captured = board.piece_at(best_move.to_square)
    after.push(best_move)
    moved = after.piece_at(best_move.to_square)
    after_pins = {sq for sq in chess.SQUARES if after.piece_at(sq) and after.piece_at(sq).color == enemy and after.is_pinned(enemy, sq)}
    targets = []
    for sq in after.attacks(best_move.to_square):
        piece = after.piece_at(sq)
        if piece and piece.color == enemy and PIECE_VALUE.get(piece.piece_type,0) >= 3:
            targets.append((sq, piece.piece_type))
    if after.is_checkmate() and moved and moved.piece_type in (chess.ROOK, chess.QUEEN):
        king_sq = after.king(enemy)
        if king_sq is not None and chess.square_rank(king_sq) in (0,7):
            return "back_rank_mate", "DEV-BACKRANK", 0.88
    if len(targets) >= 2:
        return "missed_fork", "DEV-FORK", 0.82
    if after_pins - before_pins:
        return "missed_pin", "DEV-PIN", 0.76
    if is_capture and captured and PIECE_VALUE.get(captured.piece_type,0) >= 3 and cp_loss >= 180:
        return "missed_capture", "DEV-HANGING", 0.72
    if gives_check and cp_loss >= 150:
        return "missed_forcing_move", "DEV-CCT", 0.66
    if ply < 16 and cp_loss < 300:
        return "opening_error", "FND-OPENING", 0.56
    if cp_loss >= 300:
        return "engine_blunder", "DEV-HANGING", 0.54
    return "engine_mistake", None, 0.35

def load_game(payload):
    pgn = str(payload.get("pgn") or "").strip()
    if pgn:
        game = chess.pgn.read_game(io.StringIO(pgn))
        if game is None:
            raise ValueError("invalid PGN")
        return game, game.headers.get("ECO"), game.headers.get("Opening")
    fen = payload.get("initialFen") or chess.STARTING_FEN
    board = chess.Board(fen)
    game = chess.pgn.Game()
    game.setup(board.copy(stack=False))
    node = game
    for token in str(payload.get("movesUci") or "").split():
        move = chess.Move.from_uci(token)
        if move not in board.legal_moves:
            raise ValueError(f"illegal UCI move: {token}")
        node = node.add_variation(move)
        board.push(move)
    return game, payload.get("openingEco"), payload.get("openingName")

def analyze(payload):
    game, eco, opening = load_game(payload)
    student_color = chess.WHITE if payload.get("studentColor") == "white" else chess.BLACK
    max_plies = max(10, min(160, int(payload.get("maxPlies") or 100)))
    think = max(0.02, min(0.25, float(payload.get("thinkSeconds") or 0.06)))
    board = game.board()
    node = game
    critical, losses, opening_losses = [], [], []
    opening_critical = 0
    student_moves = 0
    engine = chess.engine.SimpleEngine.popen_uci(ENGINE_PATH)
    try:
        ply = 0
        while node.variations and ply < max_plies:
            nxt = node.variation(0)
            move = nxt.move
            mover = board.turn
            san = board.san(move)
            if mover == student_color:
                before_fen = board.fen()
                multipv = engine.analyse(board, chess.engine.Limit(time=think), multipv=2)
                lines = multipv if isinstance(multipv, list) else [multipv]
                info = lines[0]
                best_move = (info.get("pv") or [move])[0]
                best_san = board.san(best_move)
                best_cp = cp(info["score"], mover)
                second_cp = cp(lines[1]["score"], mover) if len(lines) > 1 else best_cp - 100000
                solution_margin_cp = min(PEDAGOGICAL_CP_CAP, max(0, best_cp - second_cp))
                board_after = board.copy(stack=False)
                board_after.push(move)
                after_info = engine.analyse(board_after, chess.engine.Limit(time=think))
                played_cp = cp(after_info["score"], mover)
                loss = min(PEDAGOGICAL_CP_CAP, max(0, best_cp - played_cp))
                losses.append(loss); student_moves += 1
                if ply < 20: opening_losses.append(loss)
                if loss >= 100:
                    if ply < 20: opening_critical += 1
                    kind, skill, confidence = classify(board, best_move, move, loss, ply)
                    critical.append({"ply":ply+1,"moveNumber":board.fullmove_number,"fenBefore":before_fen,"movePlayedUci":move.uci(),"movePlayedSan":san,"bestMoveUci":best_move.uci(),"bestMoveSan":best_san,"cpLoss":loss,"severity":severity(loss),"findingType":kind,"suggestedSkillCode":skill,"classifierConfidence":confidence,"solutionMarginCp":solution_margin_cp})
            board.push(move)
            node = nxt; ply += 1
    finally:
        engine.quit()
    avg_loss = round(sum(losses)/len(losses),1) if losses else 0.0
    opening_avg = round(sum(opening_losses)/len(opening_losses),1) if opening_losses else 0.0
    return {
        "analysisVersion": ANALYSIS_VERSION,
        "engine": "Stockfish",
        "studentColor": "white" if student_color == chess.WHITE else "black",
        "openingEco": eco or payload.get("openingEco"),
        "openingName": opening or payload.get("openingName"),
        "movesAnalyzed": student_moves,
        "avgCpLoss": avg_loss,
        "openingAvgCpLoss": opening_avg,
        "openingCriticalCount": opening_critical,
        "firstCriticalPly": critical[0]["ply"] if critical else None,
        "criticalCount": len(critical),
        "critical": critical[:20],
    }

def main():
    try:
        payload = json.load(sys.stdin)
        print(json.dumps({"ok":True,"analysis":analyze(payload)},ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({"ok":False,"error":str(exc)},ensure_ascii=False))
        return 1

if __name__ == "__main__":
    raise SystemExit(main())

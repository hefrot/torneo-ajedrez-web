const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const rows=[
  ['LESSON-HMENA-0400-L01','FND-BOARD','board_question',START,{answer:'e1'},'What square is the White king on? Name its file and rank.','¿En qué casilla está el rey blanco? Nombra su columna y fila.','White king starts on e1: e-file, first rank.','El rey blanco inicia en e1: columna e, primera fila.'],
  ['LESSON-HMENA-0400-L02','FND-PAWNS','board_question',START,{answers:['e3','e4']},'From the starting position, what two legal forward destinations can the pawn on e2 have?','Desde la posición inicial, ¿cuáles son los dos destinos legales hacia adelante del peón de e2?','On its first move the e2 pawn may advance to e3 or e4 if unobstructed.','En su primera jugada el peón de e2 puede avanzar a e3 o e4 si no está bloqueado.'],
  ['LESSON-HMENA-0400-L03','FND-CHECK','board_question','4r1k1/8/8/8/8/8/3B4/4K3 w - - 0 1',{concept:'CBR'},'White is in check. Identify the checking piece and give one legal Capture, Block, or Run response.','Blancas están en jaque. Identifica la pieza atacante y da una respuesta legal de Capturar, Bloquear o Retirar el rey.','The rook on e8 checks the king on e1. A legal block such as Be3 demonstrates the Block option.','La torre de e8 da jaque al rey de e1. Un bloqueo legal como Ae3 demuestra la opción Bloquear.'],
  ['LESSON-HMENA-0400-L04','FND-MATE1','board_move','7k/8/5KQ1/8/8/8/8/8 w - - 0 1',{uci:'g6g7'},'White to move: find mate in one.','Juegan blancas: encuentra mate en una.','Qg7# covers the escape squares while the king protects the queen.','Dg7# cubre las casillas de escape mientras el rey protege a la dama.'],
  ['LESSON-HMENA-0400-L05','FND-THINK','board_move','4k3/8/8/8/4q3/2N5/8/4K3 w - - 0 1',{uci:'c3e4'},'Before thinking about an attack, solve White’s immediate safety problem.','Antes de pensar en atacar, resuelve el problema inmediato de seguridad de blancas.','The queen on e4 checks the king; Nxe4 removes the checking piece.','La dama de e4 da jaque al rey; Cxe4 elimina la pieza atacante.'],
  ['LESSON-HMENA-0400-L06','FND-OPENING','board_question','r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',{principles:['center','develop','castle']},'White has developed one knight. What healthy opening priority should come next?','Blancas ya desarrollaron un caballo. ¿Qué prioridad saludable de apertura debe seguir?','Continue development while controlling the center and preparing to castle; Bc4 or Bb5 are healthy examples.','Continúa desarrollando, controla el centro y prepara el enroque; Ac4 o Ab5 son ejemplos saludables.'],
  ['LESSON-HMENA-0400-L07','FND-TRAPS','board_question','r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',{answer:'f7'},'Black to move. What square is White threatening in the Scholar’s Mate pattern?','Juegan negras. ¿Qué casilla amenazan las blancas en el patrón del Mate del Pastor?','White is coordinating queen and bishop against f7; Black should defend while developing.','Las blancas coordinan dama y alfil contra f7; negras deben defender mientras desarrollan.'],
  ['LESSON-HMENA-0400-L08','FND-QK-MATE','board_question','7k/8/6Q1/5K2/8/8/8/8 w - - 0 1',{concept:'box_method'},'In queen versus king, what should White do before giving random checks?','En dama contra rey, ¿qué debe hacer blancas antes de dar jaques al azar?','Shrink the king’s box, bring your king closer, and avoid stalemate.','Reduce la caja del rey, acerca tu rey y evita el ahogado.'],
  ['LESSON-HMENA-0400-L09','FND-THINK','reflection',null,{checklist:['opponent threat','checks','captures','hanging pieces']},'Before every move in a practice game, say your safety checklist aloud. What changed after the opponent’s last move?','Antes de cada jugada en una partida de práctica, di en voz alta tu lista de seguridad. ¿Qué cambió tras la última jugada del rival?','The goal is a repeatable thinking routine, not a memorized move.','El objetivo es una rutina de pensamiento repetible, no una jugada memorizada.'],
  ['LESSON-HMENA-0400-L10','FND-MATE1','board_question','7k/5K2/6Q1/8/8/8/8/8 b - - 0 1',{answer:'stalemate'},'Black to move: is this checkmate or stalemate? Explain why.','Juegan negras: ¿es jaque mate o ahogado? Explica por qué.','Black is not in check and has no legal move, so the result is stalemate.','Negras no están en jaque y no tienen jugada legal, por lo tanto es ahogado.'],
];
rows.push(
  ['LESSON-HMENA-0800-L01','DEV-HANGING','board_move','4k3/8/8/8/4q3/2N5/8/4K3 w - - 0 1',{uci:'c3e4'},'White to move: capture the hanging checking piece.','Juegan blancas: captura la pieza atacante que está colgada.','Nxe4 wins the queen and resolves the check.','Cxe4 gana la dama y resuelve el jaque.'],
  ['LESSON-HMENA-0800-L02','DEV-THREATS','board_question','6k1/5ppp/8/8/8/8/4qPPP/4R1K1 w - - 0 1',{answer:'Rxe2'},'Before starting your own attack, what immediate threat must White answer?','Antes de iniciar tu propio ataque, ¿qué amenaza inmediata debe responder blancas?','The queen on e2 attacks the rook on e1; Rxe2 removes the threat and wins the queen.','La dama en e2 ataca la torre de e1; Txe2 elimina la amenaza y gana la dama.'],
  ['LESSON-HMENA-0800-L03','DEV-FORK','board_question','r3k3/2N5/8/8/8/8/8/4K3 b q - 0 1',{targets:['e8','a8']},'The knight on c7 has created a fork. Which two valuable targets does it attack?','El caballo en c7 creó un tenedor. ¿Qué dos objetivos valiosos ataca?','The knight attacks the king on e8 and rook on a8 at the same time.','El caballo ataca al rey en e8 y a la torre en a8 al mismo tiempo.'],
  ['LESSON-HMENA-0800-L04','DEV-PIN','board_question','4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1',{answer:'absolute_pin'},'Why can the knight on c6 not legally move away?','¿Por qué el caballo de c6 no puede moverse legalmente?','The bishop on b5 pins the knight to the king on e8. Moving the knight would expose the king to check.','El alfil en b5 clava el caballo al rey en e8. Mover el caballo expondría al rey a jaque.'],
  ['LESSON-HMENA-0800-L05','DEV-SKEWER','board_question','8/8/4r3/3k4/2B5/8/8/6K1 b - - 0 1',{answer:'rook_e6'},'Black is in check from the bishop. What piece behind the king is vulnerable after the king moves?','Negras están en jaque por el alfil. ¿Qué pieza detrás del rey queda vulnerable después de mover el rey?','The rook on e6 is behind the king on the same diagonal, creating a skewer.','La torre en e6 está detrás del rey en la misma diagonal, formando una enfilada.'],
  ['LESSON-HMENA-0800-L06','DEV-DISCOVERED','board_question','4k3/7q/8/8/8/3N4/2B5/4K3 w - - 0 1',{answer:'bishop_c2'},'If the knight on d3 moves away, which White piece becomes the revealed attacker?','Si el caballo en d3 se mueve, ¿qué pieza blanca se convierte en el atacante revelado?','The bishop on c2 is revealed along the diagonal toward h7.','El alfil en c2 queda descubierto a lo largo de la diagonal hacia h7.'],
  ['LESSON-HMENA-0800-L07','DEV-BACKRANK','board_move','6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',{uci:'e1e8'},'White to move: find the back-rank mate.','Juegan blancas: encuentra el mate en la última fila.','Re8# works because Black’s own pawns remove the king’s escape squares.','Te8# funciona porque los propios peones negros eliminan las casillas de escape del rey.'],
  ['LESSON-HMENA-0800-L08','DEV-LADDER','board_move','7k/R7/1R6/8/8/8/8/6K1 w - - 0 1',{uci:'b6b8'},'White to move: finish the ladder mate.','Juegan blancas: termina el mate escalera.','Rb8# cuts the final rank while the rook on a7 covers the seventh rank.','Tb8# corta la última fila mientras la torre en a7 cubre la séptima.'],
  ['LESSON-HMENA-0800-L09','DEV-KP-END','board_question','8/8/4k3/8/4K3/4P3/8/8 w - - 0 1',{concept:'king_in_front'},'In king-and-pawn endings, where should the stronger king usually try to get relative to its pawn?','En finales de rey y peón, ¿dónde debe intentar colocarse normalmente el rey fuerte respecto a su peón?','The king should usually get in front of the pawn and fight for key squares/opposition.','El rey normalmente debe ponerse delante del peón y luchar por casillas clave/oposición.'],
  ['LESSON-HMENA-0800-L10','DEV-CCT','board_move','6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',{uci:'e1e8'},'Use a Checks-Captures-Threats scan. Which forcing move ends the game immediately?','Usa una revisión de Jaques-Capturas-Amenazas. ¿Qué jugada forzante termina la partida de inmediato?','The checking move Re8# is the first candidate to calculate.','La jugada de jaque Te8# es la primera candidata que se debe calcular.']
);
rows.push(
  ['LESSON-HMENA-1200-L01','CMP-CANDIDATES','board_question','r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 4 5',{examples:['d4','d3','O-O']},'Generate three serious candidate moves before calculating. Do not move yet.','Genera tres jugadas candidatas serias antes de calcular. Todavía no muevas.','Healthy candidates include central expansion, quiet development, and king safety. The skill is generating options before calculation.','Candidatas saludables incluyen expansión central, desarrollo tranquilo y seguridad del rey. La habilidad es generar opciones antes de calcular.'],
  ['LESSON-HMENA-1200-L02','CMP-CALC2','board_question','6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',{line:['Re8#']},'Calculate the forcing line to the end before touching the piece. What happens after Re8+?','Calcula la línea forzante hasta el final antes de tocar la pieza. ¿Qué ocurre después de Te8+?','The move is immediately mate, so the calculated line ends at one move. The habit is to verify the opponent has no legal reply.','La jugada es mate inmediato, por lo que la línea termina en una jugada. El hábito es verificar que el rival no tenga respuesta legal.'],
  ['LESSON-HMENA-1200-L03','CMP-REMOVE','board_question','4k3/8/2n5/1B6/8/8/R7/4K3 w - - 0 1',{concept:'remove_defender'},'The knight on c6 is tied to king safety. How could White increase pressure on that defender before winning material elsewhere?','El caballo en c6 está atado a la seguridad del rey. ¿Cómo podría blancas aumentar la presión sobre ese defensor antes de ganar material en otra parte?','Identify the key defender first, then look for a capture, exchange, pin, or overload that removes its defensive duty.','Primero identifica al defensor clave y después busca una captura, cambio, clavada o sobrecarga que elimine su función defensiva.'],
  ['LESSON-HMENA-1200-L04','CMP-DEFLECTION','board_question','6k1/5ppp/8/8/8/8/4q3/4R1K1 w - - 0 1',{concept:'deflection'},'Which Black piece is doing an important defensive job and can be forced away or captured?','¿Qué pieza negra cumple una función defensiva importante y puede ser desviada o capturada?','Deflection means forcing a defender away from the square, piece, or line it must protect.','Desviación significa obligar a un defensor a abandonar la casilla, pieza o línea que debe proteger.'],
  ['LESSON-HMENA-1200-L05','CMP-OVERLOAD','board_question','4k3/8/8/8/8/8/3q4/3R1RK1 w - - 0 1',{concept:'overload'},'Find a piece that may be asked to defend more than one important target. What happens if one duty is forced?','Encuentra una pieza que pueda estar obligada a defender más de un objetivo importante. ¿Qué pasa si se fuerza una de esas funciones?','An overloaded defender cannot satisfy two incompatible defensive duties at once.','Un defensor sobrecargado no puede cumplir dos funciones defensivas incompatibles al mismo tiempo.'],
  ['LESSON-HMENA-1200-L06','CMP-TRAP','board_question','4k3/8/8/8/3q4/8/3P4/3R2K1 w - - 0 1',{concept:'escape_squares'},'Before attacking the queen, identify its escape squares. Which moves would reduce that mobility?','Antes de atacar a la dama, identifica sus casillas de escape. ¿Qué jugadas reducirían esa movilidad?','Trapping a piece starts by mapping escape squares, then taking them away with tempo.','Atrapar una pieza empieza por mapear sus casillas de escape y luego quitarlas con ganancia de tiempo.'],
  ['LESSON-HMENA-1200-L07','CMP-MATE2','board_question','7k/5K2/6Q1/8/8/8/8/8 w - - 0 1',{concept:'forcing_sequence'},'Before choosing a move, list all checks and calculate the opponent’s best defense.','Antes de elegir una jugada, enumera todos los jaques y calcula la mejor defensa del rival.','Mate-in-two training is about the forcing first move and verification of every legal reply, not guessing a check.','El entrenamiento de mate en dos consiste en encontrar la primera jugada forzante y verificar cada respuesta legal, no en adivinar un jaque.'],
  ['LESSON-HMENA-1200-L08','CMP-PAWNSTRUCT','board_question','4k3/pp3ppp/8/2p1p3/2P1P3/3P4/PP3PPP/4K3 w - - 0 1',{features:['isolated','passed','pawn_islands']},'Identify one structural strength and one structural weakness for either side.','Identifica una fortaleza estructural y una debilidad estructural de cualquiera de los dos bandos.','Name the pawn feature first, then connect it to a plan: attack it, blockade it, advance it, or use the square it leaves behind.','Primero nombra la característica de peones y después conéctala con un plan: atacarla, bloquearla, avanzarla o usar la casilla que deja.'],
  ['LESSON-HMENA-1200-L09','CMP-WEAKSQUARE','board_question','4k3/8/8/3n4/8/8/8/4K3 w - - 0 1',{answer:'d5'},'Why can a central square such as d5 become a valuable outpost when enemy pawns cannot challenge it?','¿Por qué una casilla central como d5 puede convertirse en un puesto avanzado valioso cuando los peones rivales no pueden desafiarla?','A true outpost is a useful square that cannot easily be attacked by enemy pawns and supports an active piece.','Un verdadero puesto avanzado es una casilla útil que no puede ser atacada fácilmente por peones rivales y sostiene una pieza activa.'],
  ['LESSON-HMENA-1200-L10','CMP-REVIEW','reflection',null,{questions:['turning point','candidate missed','lesson learned']},'After a game, identify the turning point, the candidate move you missed, and one rule you will use next time.','Después de una partida, identifica el punto de giro, la jugada candidata que omitiste y una regla que usarás la próxima vez.','Self-review should happen before engine review. The goal is to reconstruct your own decision process.','El autoanálisis debe ocurrir antes de revisar con el motor. El objetivo es reconstruir tu propio proceso de decisión.']
);

const parse=value=>{try{return JSON.parse(value||'{}');}catch{return {};}};
const domainErrors={
  fundamentals:{en:['Moves before naming the rule being used.','Confuses attacked squares with legal king squares.'],es:['Mueve antes de nombrar la regla que está usando.','Confunde casillas atacadas con casillas legales para el rey.']},
  tactics:{en:['Recognizes the pattern but skips the opponent’s best reply.','Plays the first check/capture without comparing candidates.'],es:['Reconoce el patrón pero omite la mejor respuesta del rival.','Juega el primer jaque/captura sin comparar candidatas.']},
  calculation:{en:['Stops calculation after their own move.','Does not visualize the final position before deciding.'],es:['Detiene el cálculo después de su propia jugada.','No visualiza la posición final antes de decidir.']},
  strategy:{en:['Names a positional feature without connecting it to a plan.','Ignores immediate tactics while discussing strategy.'],es:['Nombra una característica posicional sin conectarla con un plan.','Ignora tácticas inmediatas mientras habla de estrategia.']},
  openings:{en:['Memorizes moves without explaining their purpose.','Starts an attack before development and king safety.'],es:['Memoriza jugadas sin explicar su propósito.','Inicia un ataque antes de desarrollar y asegurar el rey.']},
  endgames:{en:['Gives unnecessary checks instead of improving king activity.','Moves too quickly without identifying the win/draw condition.'],es:['Da jaques innecesarios en lugar de mejorar la actividad del rey.','Mueve demasiado rápido sin identificar la condición de victoria/tablas.']},
  thinking:{en:['Skips the opponent-threat check.','Answers before verbalizing what changed in the position.'],es:['Omite revisar la amenaza del rival.','Responde antes de verbalizar qué cambió en la posición.']},
  competition:{en:['Uses the same amount of time on every decision.','Focuses on result instead of decision quality.'],es:['Usa la misma cantidad de tiempo en cada decisión.','Se enfoca en el resultado en vez de la calidad de la decisión.']}
};

const supportByDomain={
  fundamentals:{en:'Reduce the task to one rule and one piece at a time; let the student point before moving.',es:'Reduce la tarea a una regla y una pieza a la vez; deja que el alumno señale antes de mover.'},
  tactics:{en:'Highlight the target pieces first, then ask for checks, captures, and threats.',es:'Marca primero las piezas objetivo y después pide jaques, capturas y amenazas.'},
  calculation:{en:'Limit the tree to two candidates and require one opponent reply before continuing.',es:'Limita el árbol a dos candidatas y exige una respuesta del rival antes de continuar.'},
  strategy:{en:'Ask for one positional feature, one weakness, and one concrete plan.',es:'Pide una característica posicional, una debilidad y un plan concreto.'},
  openings:{en:'Use principles before move names: center, development, king safety.',es:'Usa principios antes de nombres de jugadas: centro, desarrollo y seguridad del rey.'},
  endgames:{en:'Mark the target square and rehearse the winning/drawing condition before playing.',es:'Marca la casilla objetivo y repasa la condición de victoria/tablas antes de jugar.'},
  thinking:{en:'Make the student verbalize the opponent threat and what changed before choosing a move.',es:'Haz que el alumno verbalice la amenaza rival y qué cambió antes de elegir una jugada.'},
  competition:{en:'Use a short clock routine: assess complexity, budget time, decide, verify.',es:'Usa una rutina breve de reloj: evaluar complejidad, asignar tiempo, decidir y verificar.'}
};
const challengeByDomain={
  fundamentals:{en:'Ask for a second legal example and an explanation of why a tempting alternative is illegal.',es:'Pide un segundo ejemplo legal y explicar por qué una alternativa tentadora es ilegal.'},
  tactics:{en:'Require the full forcing line and ask how the opponent could have prevented the pattern one move earlier.',es:'Exige la línea forzante completa y pregunta cómo pudo evitar el rival el patrón una jugada antes.'},
  calculation:{en:'Add a second candidate and compare final positions without moving the pieces.',es:'Añade una segunda candidata y compara las posiciones finales sin mover las piezas.'},
  strategy:{en:'Ask for two competing plans and the trade-offs of each.',es:'Pide dos planes posibles y las ventajas/desventajas de cada uno.'},
  openings:{en:'Connect the principle to a typical middlegame plan instead of memorizing another move.',es:'Conecta el principio con un plan típico de medio juego en vez de memorizar otra jugada.'},
  endgames:{en:'Switch sides or move the pieces one square and ask whether the result changes.',es:'Cambia de bando o mueve las piezas una casilla y pregunta si cambia el resultado.'},
  thinking:{en:'Ask for a written three-candidate shortlist and a post-decision verification step.',es:'Pide una lista escrita de tres candidatas y una verificación posterior a la decisión.'},
  competition:{en:'Repeat the task under a realistic time budget and compare decision quality.',es:'Repite la tarea con un presupuesto de tiempo realista y compara la calidad de la decisión.'}
};

const localeOf=value=>String(value||'en').toLowerCase()==='es'?'es':'en';
const exerciseId=(lessonId,n=1)=>`EX-${lessonId}-${String(n).padStart(2,'0')}`;
const skillIdByCode=(db,code)=>db.prepare(`SELECT id FROM curriculum_skills WHERE code=?`).get(code)?.id||null;

export const lessonExerciseRows=rows.map((r,index)=>({
  lessonId:r[0],skillCode:r[1],exerciseType:r[2],fen:r[3],solution:r[4],
  prompt:{en:r[5],es:r[6]},explanation:{en:r[7],es:r[8]},sequence:1,index:index+1
}));

function variantCopy(row,variant){
  const langText=(lang)=>{
    if(variant==='core')return {prompt:row.prompt[lang],explanation:row.explanation[lang]};
    if(variant==='support')return lang==='es'?
      {prompt:`Paso guiado: ${row.prompt.es} Antes de responder, nombra la pieza/casilla o regla más importante.`,explanation:`${row.explanation.es} El objetivo de esta variante es verbalizar el primer paso antes de decidir.`}:
      {prompt:`Guided step: ${row.prompt.en} Before answering, name the most important piece, square, or rule.`,explanation:`${row.explanation.en} This variant scaffolds the first reasoning step before the decision.`};
    return lang==='es'?
      {prompt:`Reto: ${row.prompt.es} Después de resolverlo, explica la mejor defensa del rival o qué cambiaría con una pieza/casilla distinta.`,explanation:`${row.explanation.es} La respuesta debe incluir la idea y una verificación de la mejor respuesta rival.`}:
      {prompt:`Challenge: ${row.prompt.en} After solving it, explain the opponent's best defense or what would change if one piece/square changed.`,explanation:`${row.explanation.en} The answer should include the idea plus verification of the opponent's best reply.`};
  };
  const sequence={core:1,support:2,challenge:3}[variant];
  return {...row,sequence,difficulty:variant,prompt:{en:langText('en').prompt,es:langText('es').prompt},explanation:{en:langText('en').explanation,es:langText('es').explanation},solution:{...(row.solution||{}),variant}};
}
export const lessonExerciseVariants=lessonExerciseRows.flatMap(row=>['core','support','challenge'].map(v=>variantCopy(row,v)));

export function seedLessonResources(db){
  const exercise=db.prepare(`INSERT INTO lesson_exercises(id,lesson_id,skill_id,sequence_no,exercise_type,fen,solution_json,difficulty,active)
    VALUES (?,?,?,?,?,?,?,?,1)
    ON CONFLICT(id) DO UPDATE SET lesson_id=excluded.lesson_id,skill_id=excluded.skill_id,sequence_no=excluded.sequence_no,exercise_type=excluded.exercise_type,fen=excluded.fen,solution_json=excluded.solution_json,difficulty=excluded.difficulty,active=1`);
  const loc=db.prepare(`INSERT INTO lesson_exercise_localizations(exercise_id,locale,prompt,explanation)
    VALUES (?,?,?,?) ON CONFLICT(exercise_id,locale) DO UPDATE SET prompt=excluded.prompt,explanation=excluded.explanation`);
  let seeded=0;
  db.transaction(()=>{for(const row of lessonExerciseVariants){
    if(!db.prepare('SELECT 1 FROM lessons WHERE id=?').get(row.lessonId))throw new Error(`missing lesson ${row.lessonId}`);
    const sid=skillIdByCode(db,row.skillCode);if(!sid)throw new Error(`missing skill ${row.skillCode}`);
    const id=exerciseId(row.lessonId,row.sequence);exercise.run(id,row.lessonId,sid,row.sequence,row.exerciseType,row.fen,JSON.stringify(row.solution||{}),row.difficulty);
    for(const lang of ['en','es'])loc.run(id,lang,row.prompt[lang],row.explanation[lang]);seeded++;
  }})();
  return {lessons:lessonExerciseRows.length,exercises:seeded,localizations:seeded*2,variantsPerLesson:3};
}

const timeline=(review,lang)=>review?(lang==='es'?
  [{m:'0–8',label:'Calentamiento y recuperación'},{m:'8–20',label:'Estaciones de repaso'},{m:'20–40',label:'Práctica guiada'},{m:'40–52',label:'Mini evaluación / partida'},{m:'52–60',label:'Debrief + exit ticket'}]:
  [{m:'0–8',label:'Warm-up & retrieval'},{m:'8–20',label:'Review stations'},{m:'20–40',label:'Guided practice'},{m:'40–52',label:'Mini assessment / game'},{m:'52–60',label:'Debrief + exit ticket'}]):(lang==='es'?
  [{m:'0–5',label:'Recuperación previa'},{m:'5–15',label:'Concepto + demo'},{m:'15–30',label:'Ejercicio guiado'},{m:'30–50',label:'Práctica / mini partida'},{m:'50–57',label:'Corrección y transferencia'},{m:'57–60',label:'Exit ticket'}]:
  [{m:'0–5',label:'Prior retrieval'},{m:'5–15',label:'Concept + demo'},{m:'15–30',label:'Guided exercise'},{m:'30–50',label:'Practice / mini game'},{m:'50–57',label:'Correction & transfer'},{m:'57–60',label:'Exit ticket'}]);

function exerciseRows(db,lessonId,locale){
  return db.prepare(`SELECT e.id,e.exercise_type AS exerciseType,e.fen,e.solution_json AS solutionJson,e.difficulty,l.prompt,l.explanation,cs.code AS skillCode
    FROM lesson_exercises e LEFT JOIN lesson_exercise_localizations l ON l.exercise_id=e.id AND l.locale=?
    LEFT JOIN curriculum_skills cs ON cs.id=e.skill_id WHERE e.lesson_id=? AND e.active=1 ORDER BY e.sequence_no`).all(locale,lessonId)
    .map(r=>({...r,solution:parse(r.solutionJson)}));
}

export function lessonTeachingPack(db,lessonId,{locale='en'}={}){
  const lang=localeOf(locale);
  const row=db.prepare(`SELECT l.id,l.title,l.objective,l.duration_minutes AS durationMinutes,l.content_json AS metaJson,
    COALESCE(cl.title,l.title) AS localTitle,COALESCE(cl.objective,l.objective) AS localObjective,cl.content_json AS localJson,
    cs.code AS skillCode,cs.domain FROM lessons l LEFT JOIN curriculum_localizations cl ON cl.entity_type='lesson' AND cl.entity_id=l.id AND cl.locale=?
    LEFT JOIN curriculum_skills cs ON cs.id=l.skill_id WHERE l.id=? AND l.active=1`).get(lang,lessonId);
  if(!row)return null;
  const meta=parse(row.metaJson),content=parse(row.localJson),errors=domainErrors[row.domain]?.[lang]||[],support=supportByDomain[row.domain]?.[lang]||'',challenge=challengeByDomain[row.domain]?.[lang]||'';
  const keyPoints=content.keyPoints||[];
  const coachScript=lang==='es'?
    [`Objetivo de hoy: ${row.localObjective||row.objective||row.localTitle}.`,keyPoints[0]?`Primero demuestra: ${keyPoints[0]}.`:'Demuestra el concepto con una posición simple.',`Pregunta al alumno: “¿Qué ves primero y por qué?”`,`Cierra conectando el ejercicio con una partida real.`]:
    [`Today's objective: ${row.localObjective||row.objective||row.localTitle}.`,keyPoints[0]?`First demonstrate: ${keyPoints[0]}.`:'Demonstrate the concept with a simple position.',`Ask the student: “What do you see first, and why?”`,`Close by connecting the exercise to a real game.`];
  return {lesson:{id:row.id,title:row.localTitle||row.title,objective:row.localObjective||row.objective,durationMinutes:row.durationMinutes,skillCode:row.skillCode,domain:row.domain},
    meta,content,timeline:timeline(Boolean(meta.review),lang),coachScript,commonErrors:errors,differentiation:{support,challenge},
    exerciseSet:exerciseRows(db,lessonId,lang),
    homework:content.homework||null,exitTicket:content.exitTicket||null,
    teachingStatus:'teach-ready-v1'};
}

export function teachingPacksOverview(db,{locale='en'}={}){
  const lang=localeOf(locale);
  const ids=db.prepare(`SELECT DISTINCT l.id FROM lessons l JOIN lesson_skills ls ON ls.lesson_id=l.id JOIN curriculum_skills cs ON cs.id=ls.skill_id JOIN curriculum_tracks t ON t.id=cs.track_id
    WHERE t.framework_id='FRAMEWORK-HMENA-2500' AND t.code IN ('hmena-0-400','hmena-400-800','hmena-800-1200') AND l.id LIKE 'LESSON-HMENA-%' AND l.active=1 ORDER BY l.id`).all();
  return ids.map(r=>lessonTeachingPack(db,r.id,{locale:lang}));
}

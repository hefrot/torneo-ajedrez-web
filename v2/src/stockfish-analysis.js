import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const defaultPython=process.env.ACADEMIC_PYTHON||'/opt/stockfish-bot/.venv/bin/python';
const script=fileURLToPath(new URL('../scripts/analyze-academic-game.py',import.meta.url));

export function analyzeAcademicGame(payload,{pythonPath=defaultPython,timeoutMs=30000}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(pythonPath,[script],{stdio:['pipe','pipe','pipe'],env:{...process.env}});
    let out='',err='';
    const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('academic Stockfish analysis timed out'));},timeoutMs);
    child.stdout.on('data',chunk=>{out+=chunk.toString();});
    child.stderr.on('data',chunk=>{err+=chunk.toString();});
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.on('close',code=>{
      clearTimeout(timer);
      let parsed;try{parsed=JSON.parse(out);}catch{return reject(new Error(`invalid academic analyzer output${err?': '+err.slice(0,180):''}`));}
      if(code!==0||!parsed?.ok)return reject(new Error(parsed?.error||err||`academic analyzer exited ${code}`));
      resolve(parsed.analysis);
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

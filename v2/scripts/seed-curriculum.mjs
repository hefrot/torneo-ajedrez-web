import {openDatabase} from '../src/db.js';
import {seedAllCurriculum} from '../src/curriculum.js';
import {seedHmenaFramework,mapLegacyToHmena} from '../src/hmena-curriculum.js';
import {seedDiagnostic0800} from '../src/diagnostic.js';
import {seedHmenaCourse0800} from '../src/hmena-course.js';
import {seedHmenaCourse1200} from '../src/hmena-course-1200.js';
import {seedDiagnostic1200} from '../src/diagnostic-1200.js';
import {seedCurriculumLocalizations} from '../src/curriculum-localization.js';
import {seedCisBots} from '../src/cis-bot-arena.js';
const db=openDatabase();
try{
  const legacy=seedAllCurriculum(db);
  const hmena=seedHmenaFramework(db);
  const mapping=mapLegacyToHmena(db);
  const diagnostic=seedDiagnostic0800(db);
  const course0800=seedHmenaCourse0800(db);
  const course1200=seedHmenaCourse1200(db);
  const diagnostic1200=seedDiagnostic1200(db);
  const localization=seedCurriculumLocalizations(db);
  const cisBots=seedCisBots(db);
  console.log(JSON.stringify({legacy,hmena,mapping,localization,diagnostic,course0800,course1200,diagnostic1200,cisBots}));
}finally{db.close();}

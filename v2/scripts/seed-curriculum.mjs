import {openDatabase} from '../src/db.js';
import {seedAllCurriculum} from '../src/curriculum.js';
import {seedHmenaFramework,mapLegacyToHmena} from '../src/hmena-curriculum.js';
import {seedDiagnostic0800} from '../src/diagnostic.js';
import {seedHmenaCourse0800} from '../src/hmena-course.js';
import {seedCurriculumLocalizations} from '../src/curriculum-localization.js';
const db=openDatabase();
try{
  const legacy=seedAllCurriculum(db);
  const hmena=seedHmenaFramework(db);
  const mapping=mapLegacyToHmena(db);
  const diagnostic=seedDiagnostic0800(db);
  const course0800=seedHmenaCourse0800(db);
  const localization=seedCurriculumLocalizations(db);
  console.log(JSON.stringify({legacy,hmena,mapping,localization,diagnostic,course0800}));
}finally{db.close();}

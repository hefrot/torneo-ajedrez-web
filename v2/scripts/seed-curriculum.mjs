import {openDatabase} from '../src/db.js';
import {seedAllCurriculum} from '../src/curriculum.js';
import {seedHmenaFramework,mapLegacyToHmena} from '../src/hmena-curriculum.js';
import {seedCurriculumLocalizations} from '../src/curriculum-localization.js';
const db=openDatabase();
try{
  const legacy=seedAllCurriculum(db);
  const hmena=seedHmenaFramework(db);
  const mapping=mapLegacyToHmena(db);
  const localization=seedCurriculumLocalizations(db);
  console.log(JSON.stringify({legacy,hmena,mapping,localization}));
}finally{db.close();}

import {openDatabase} from '../src/db.js';
import {seedAllCurriculum} from '../src/curriculum.js';
import {seedHmenaFramework,mapLegacyToHmena} from '../src/hmena-curriculum.js';
const db=openDatabase();
try{
  const legacy=seedAllCurriculum(db);
  const hmena=seedHmenaFramework(db);
  const mapping=mapLegacyToHmena(db);
  console.log(JSON.stringify({legacy,hmena,mapping}));
}finally{db.close();}
